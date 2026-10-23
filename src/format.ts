export const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
/** Non-breaking hyphens so a date never splits across lines. */
export const fmtDate = (d: string) => d.replace(/-/g, '\u2011');
export const int = (n: number) => n.toLocaleString('en-US');

/** Same rule as the server's normTicker: BRK.B / BRK-B / BRKB match. */
export const normKey = (s: string) => s.toUpperCase().replace(/[\s.\-/_]/g, '');

/** Every fund pair (upper triangle of the overlap matrix) with its overlap weight. */
export const pairsOf = (m: { weight: number }[][]) => {
  const out: { i: number; j: number; w: number }[] = [];
  m.forEach((row, i) => row.forEach((c, j) => j > i && out.push({ i, j, w: c.weight })));
  return out;
};

export const daysBetween = (a: string, b: string) => {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.round(Math.abs(ta - tb) / 86_400_000);
};

/** Row sizes for the fund cards so that no row ends with an orphan: 4 -> 2+2, 5 -> 3+2. */
export const rowSizes = (n: number): number[] => {
  const out: number[] = [];
  let left = n;
  while (left > 0) {
    if (left <= 3) {
      out.push(left);
      left = 0;
    } else if (left === 4) {
      out.push(2, 2);
      left = 0;
    } else {
      out.push(3);
      left -= 3;
    }
  }
  return out;
};

const KEEP_UPPER = new Set(['US', 'USA', 'UK', 'AI', 'ETF', 'REIT', 'ADR', 'ADS', 'LLC', 'LP', 'PLC', 'NV', 'SA', 'AG', 'SE', 'ASA', 'AB', 'II', 'III', 'IV', 'EM', 'HK', 'IBM', 'AMD', 'AT&T', 'HP', 'CVS', 'UPS', 'GE', 'KKR', 'TJX', 'ADP', 'CME', 'CBOE', 'ICE', 'MSCI', 'ASML', 'TSMC', 'SPDR', 'NASDAQ', 'CL', 'A', 'B', 'C']);
const SMALL = new Set(['of', 'and', 'the', 'for', 'de', 'in']);

/** Issuers ship names in different cases (MICROSOFT CORP vs Microsoft Corp.): show all-caps names in title case. */
export const tidyName = (name: string): string => {
  if (!name || name !== name.toUpperCase() || !/[A-Z]/.test(name)) return name;
  return name
    .split(/(\s+)/)
    .map((w, i) => {
      if (!w.trim()) return w;
      if (KEEP_UPPER.has(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.replace(/(^|[-/(&])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
    })
    .join('');
};
