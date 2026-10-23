import { httpGet, SEC_UA, num, toIsoDate } from './util.js';

let tickerCache = null;
async function seriesFor(symbol) {
  if (!tickerCache) {
    const j = await httpGet('https://www.sec.gov/files/company_tickers_mf.json', { as: 'json', headers: { 'User-Agent': SEC_UA } });
    const map = {};
    for (const [cik, seriesId, , sym] of j.data) map[String(sym).toUpperCase()] = { seriesId, cik };
    tickerCache = map;
  }
  return tickerCache[symbol.toUpperCase()];
}

const tag = (block, t) => block.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1]?.trim() ?? '';
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

async function viaSubmissions(cik, seriesId, hdr) {
  const padded = String(cik).padStart(10, '0');
  const sub = await httpGet(`https://data.sec.gov/submissions/CIK${padded}.json`, { as: 'json', headers: hdr });
  const r = sub.filings?.recent;
  if (!r) throw new Error('no recent filings');
  const cands = [];
  for (let i = 0; i < r.form.length && cands.length < 48; i++) {
    if (r.form[i] === 'NPORT-P') cands.push(r.accessionNumber[i].replace(/-/g, ''));
  }
  for (let k = 0; k < cands.length; k += 8) {
    const batch = await Promise.all(
      cands.slice(k, k + 8).map((acc) =>
        httpGet(`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/primary_doc.xml`, { headers: hdr, timeout: 60000, retries: 1 }).catch(() => ''),
      ),
    );
    const hit = batch.find((x) => x.includes(`<seriesId>${seriesId}</seriesId>`));
    if (hit) return hit;
  }
  throw new Error('series not found in recent NPORT-P filings');
}

// SEC N-PORT: 免费、覆盖所有美国注册基金, 但每季度披露一次, 有约 60 天延迟
export async function fetchSec(symbol) {
  const entry = await seriesFor(symbol);
  if (!entry) throw new Error(`SEC: ${symbol} not in series map`);
  const { seriesId, cik } = entry;
  const hdr = { 'User-Agent': SEC_UA };
  let xml;
  try {
    const atom = await httpGet(
      `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${seriesId}&type=NPORT-P&dateb=&owner=include&count=1&output=atom`,
      { headers: hdr },
    );
    const href = atom.match(/<filing-href>([^<]+)-index\.html?<\/filing-href>/)?.[1];
    if (!href) throw new Error('SEC: no NPORT-P filing');
    xml = await httpGet(`${href.replace(/\/[^/]*$/, '')}/primary_doc.xml`, { headers: hdr, timeout: 60000 });
  } catch (e) {
    // Fallback: data.sec.gov submissions for the trust, then find the newest filing of this series.
    try {
      xml = await viaSubmissions(cik, seriesId, hdr);
    } catch (e2) {
      throw new Error(`${e.message}; fallback: ${e2.message}`);
    }
  }
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
