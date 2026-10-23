import { httpGet, isBlank, num, parseCsv, toIsoDate, normTicker } from './util.js';

let listCache = null; // { at, map }
const LIST_TTL = 24 * 3600 * 1000;

// iShares 产品列表页里有 ticker -> 产品 ID 的映射
async function productMap() {
  if (listCache && Date.now() - listCache.at < LIST_TTL) return listCache.map;
  const html = await httpGet('https://www.ishares.com/us/products/etf-investments', { timeout: 30000 });
  const map = {};
  for (const m of html.matchAll(/<a href="\/us\/products\/(\d+)\/([a-z0-9-]+)">([A-Z0-9.]{1,6})<\/a>/g)) {
    const k = normTicker(m[3]);
    if (!map[k]) map[k] = m[1];
  }
  if (!Object.keys(map).length) throw new Error('iShares: product list parse failed');
  listCache = { at: Date.now(), map };
  return map;
}

export async function fetchIshares(symbol) {
  const id = (await productMap())[normTicker(symbol)];
  if (!id) throw new Error(`iShares: unknown ticker ${symbol}`);
  const text = await httpGet(`https://www.ishares.com/us/products/${id}/x/latest-holdings.csv`, { timeout: 30000 });
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  const hi = rows.findIndex((r) => r.includes('Weight (%)') && r.includes('Name'));
  if (hi < 0) throw new Error('iShares: header not found');
  const head = rows[hi];
  const col = (n) => head.indexOf(n);
  const [cT, cN, cW, cA, cC, cI] = ['Ticker', 'Name', 'Weight (%)', 'Asset Class', 'CUSIP', 'ISIN'].map(col);
  const asOfRow = rows.find((r) => r[0] === 'Fund Holdings as of');
  const holdings = [];
  for (const r of rows.slice(hi + 1)) {
    const w = num(r[cW]);
    if (!Number.isFinite(w)) continue;
    holdings.push({
      symbol: cT < 0 || isBlank(r[cT]) ? '' : r[cT].trim(),
      name: r[cN] || '',
      percent: w / 100,
      assetClass: cA >= 0 ? r[cA] : '',
      cusip: cC >= 0 && !isBlank(r[cC]) ? r[cC].trim() : '',
      isin: cI >= 0 && !isBlank(r[cI]) ? r[cI].trim() : '',
    });
  }
  if (!holdings.length) throw new Error('iShares: empty');
  return { holdings, asOf: toIsoDate(asOfRow?.[1]), total: holdings.length, source: 'ishares' };
}
