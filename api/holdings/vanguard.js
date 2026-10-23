import { httpGet, isBlank, num, toIsoDate } from './util.js';

const PAGE = 500;
const MAX_PAGES = 40; // 最多 2 万条, 足够覆盖债券 ETF

async function fetchKind(symbol, kind) {
  // 注意: 债券的 ticker 字段是 'TNOTE' 之类的品类代码, 不能当作唯一标识
  const base = `https://investor.vanguard.com/vmf/api/${encodeURIComponent(symbol)}/portfolio-holding/${kind}.json`;
  const first = await httpGet(`${base}?start=1&count=${PAGE}`, { as: 'json' });
  const total = Number(first.size) || 0;
  let entities = first.fund?.entity || [];
  const pages = Math.min(Math.ceil(total / PAGE), MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(pages - 1, 0) }, (_, i) =>
      httpGet(`${base}?start=${(i + 1) * PAGE + 1}&count=${PAGE}`, { as: 'json' }).then((j) => j.fund?.entity || []),
    ),
  );
  entities = entities.concat(...rest);
  return { entities, total, asOf: toIsoDate(first.asOfDate), kind };
}

export async function fetchVanguard(symbol) {
  let r = await fetchKind(symbol, 'stock');
  if (!r.entities.length) r = await fetchKind(symbol, 'bond');
  if (!r.entities.length) throw new Error('Vanguard: no holdings');
  const holdings = r.entities
    .map((e) => ({
      symbol: r.kind === 'bond' || isBlank(e.ticker) ? '' : String(e.ticker).trim(),
      name: e.longName || e.shortName || '',
      percent: num(e.percentWeight) / 100,
      cusip: isBlank(e.cusip) ? '' : e.cusip,
      isin: isBlank(e.isin) ? '' : e.isin,
    }))
    .filter((h) => Number.isFinite(h.percent));
  return { holdings, asOf: r.asOf, total: r.total, source: 'vanguard' };
}
