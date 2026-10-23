import { httpGet, isBlank, num, toIsoDate } from './util.js';

export async function fetchInvesco(symbol) {
  const url = `https://dng-api.invesco.com/cache/v1/accounts/en_US/shareclasses/${encodeURIComponent(symbol)}/holdings/fund?idType=ticker&interval=monthly&productType=ETF`;
  const j = await httpGet(url, { as: 'json', headers: { Accept: 'application/json' } });
  const list = Array.isArray(j.holdings) ? j.holdings : [];
  const holdings = list
    .map((h) => ({
      symbol: isBlank(h.ticker) ? '' : String(h.ticker).trim(),
      name: h.issuerName || '',
      percent: num(h.percentageOfTotalNetAssets) / 100,
      cusip: isBlank(h.cusip) ? '' : h.cusip,
    }))
    .filter((h) => Number.isFinite(h.percent));
  if (!holdings.length) throw new Error('Invesco: empty');
  // 接口在某些参数下只返回前 10 条, 此时 totalNumberOfHoldings 会大于实际条数
  const total = Number(j.totalNumberOfHoldings) || holdings.length;
  return { holdings, asOf: toIsoDate(j.effectiveDate), total, source: 'invesco' };
}
