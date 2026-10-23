import { httpGet, SEC_UA, num, toIsoDate } from './util.js';

let tickerCache = null;
async function seriesFor(symbol) {
  if (!tickerCache) {
    const j = await httpGet('https://www.sec.gov/files/company_tickers_mf.json', { as: 'json', headers: { 'User-Agent': SEC_UA } });
    const map = {};
    for (const [, seriesId, , sym] of j.data) map[String(sym).toUpperCase()] = seriesId;
    tickerCache = map;
  }
  return tickerCache[symbol.toUpperCase()];
}

const tag = (block, t) => block.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]?.trim() ?? '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

// SEC N-PORT: 免费、覆盖所有美国注册基金, 但每季度披露一次, 有约 60 天延迟
export async function fetchSec(symbol) {
  const seriesId = await seriesFor(symbol);
  if (!seriesId) throw new Error(`SEC: ${symbol} not in series map`);
  const hdr = { 'User-Agent': SEC_UA };
  const atom = await httpGet(
    `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${seriesId}&type=NPORT-P&dateb=&owner=include&count=1&output=atom`,
    { headers: hdr },
  );
  const href = atom.match(/<filing-href>([^<]+)-index\.html?<\/filing-href>/)?.[1];
  if (!href) throw new Error('SEC: no NPORT-P filing');
  const xml = await httpGet(`${href.replace(/\/[^/]*$/, '')}/primary_doc.xml`, { headers: hdr, timeout: 60000 });
  const asOf = toIsoDate(tag(xml, 'repPdDate'));
  const holdings = [];
  for (const m of xml.matchAll(/<invstOrSec>([\s\S]*?)<\/invstOrSec>/g)) {
    const b = m[1];
    if (b.includes('<derivativeInfo>')) continue; // 衍生品头寸不计入
    const pct = num(tag(b, 'pctVal'));
    if (!Number.isFinite(pct)) continue;
    const cusip = tag(b, 'cusip');
    const isin = b.match(/<isin value="([^"]+)"/)?.[1] || '';
    holdings.push({
      symbol: '', // N-PORT 不含 ticker, 用 CUSIP/ISIN 匹配
      name: decode(tag(b, 'name') || tag(b, 'title')),
      percent: pct / 100,
      cusip: cusip && cusip !== 'N/A' && !/^0+$/.test(cusip) ? cusip : '',
      isin,
    });
  }
  if (!holdings.length) throw new Error('SEC: empty');
  return { holdings, asOf, total: holdings.length, source: 'sec' };
}
