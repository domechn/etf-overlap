const BROWSER_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const SEC_UA = process.env.SEC_USER_AGENT || 'etf-cal domdoumc@gmail.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function httpGet(url, { headers = {}, as = 'text', timeout = 20000, retries = 2 } = {}) {
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9', ...headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
      });
    } catch (e) {
      if (attempt < retries) { await sleep(400 * (attempt + 1)); continue; }
      throw new Error(`${e.cause?.code || e.name}: ${e.message} (${new URL(url).host})`);
    }
    // 403/429/5xx from SEC are usually rate limiting; a short wait often clears them
    if (!res.ok && [403, 429, 500, 502, 503].includes(res.status) && attempt < retries) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    break;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} (${new URL(url).host}${new URL(url).pathname})`);
  if (as === 'json') return res.json();
  if (as === 'buffer') return Buffer.from(await res.arrayBuffer());
  return res.text();
}

// 统一 ticker 写法: BRK.B / BRK-B / BRK/B / BRKB 视为同一个
export const normTicker = (s) => String(s ?? '').toUpperCase().replace(/[\s.\-/_]/g, '');

// 没有 CUSIP 时从美国 ISIN (US + 9 位 CUSIP + 校验位) 中取
export const cusipOf = (h) => h.cusip || (/^US[0-9A-Z]{9}\d$/.test(h.isin || '') ? h.isin.slice(2, 11) : '');

export const isBlank = (s) => s == null || String(s).trim() === '' || String(s).trim() === '-';

export const num = (v) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

// 极简 CSV 解析 (支持引号和引号内逗号/换行)
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export function toIsoDate(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
