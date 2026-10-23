import XLSX from 'xlsx';
import { httpGet, isBlank, num, toIsoDate } from './util.js';

export async function fetchSpdr(symbol) {
  const url = `https://www.ssga.com/us/en/intermediary/library-content/products/fund-data/etfs/us/holdings-daily-us-en-${encodeURIComponent(symbol.toLowerCase())}.xlsx`;
  const buf = await httpGet(url, { as: 'buffer', timeout: 30000 });
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  const hi = rows.findIndex((r) => r[0] === 'Name' && r.includes('Weight'));
  if (hi < 0) throw new Error('SPDR: header not found');
  const head = rows[hi];
  const [cN, cT, cI, cW] = ['Name', 'Ticker', 'Identifier', 'Weight'].map((n) => head.indexOf(n));
  const asOfRow = rows.find((r) => String(r[0]).startsWith('Holdings'));
  const holdings = [];
  for (const r of rows.slice(hi + 1)) {
    const w = num(r[cW]);
    if (!r[cN] || !Number.isFinite(w)) continue;
    holdings.push({
      symbol: isBlank(r[cT]) ? '' : String(r[cT]).trim(),
      name: String(r[cN]),
      percent: w / 100,
      cusip: isBlank(r[cI]) ? '' : String(r[cI]).trim(),
    });
  }
  if (!holdings.length) throw new Error('SPDR: empty');
  return {
    holdings,
    asOf: toIsoDate(String(asOfRow?.[1] || '').replace(/^As of\s*/i, '')),
    total: holdings.length,
    source: 'spdr',
  };
}
