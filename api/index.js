import express from 'express';
import YahooFinance from 'yahoo-finance2';
import cors from 'cors';
import { getFullHoldings } from './holdings/index.js';
import { normTicker } from './holdings/util.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();

app.use(cors());
app.use(express.json());

const isValidEtfQuote = (quote) =>
  quote &&
  typeof quote === 'object' &&
  quote.quoteType === 'ETF' &&
  typeof quote.symbol === 'string' &&
  quote.symbol.trim() !== '';

const asString = (value) => typeof value === 'string' ? value : '';

// 搜索 API
app.get('/api/search', async (req, res) => {
  let rawQuery = req.query.q;
  // Express exposes repeated ?q=... parameters as an array; use the first value.
  if (Array.isArray(req.query.q)) {
    rawQuery = req.query.q.length > 0 ? req.query.q[0] : '';
  }
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) return res.json([]);
  
  try {
    // Yahoo search occasionally returns mixed quote payloads that fail library validation
    // even though the ETF rows we need are still present.
    // We don't need to override Yahoo's search query options for this endpoint.
    const searchOptions = {};
    const moduleOptions = { validateResult: false };
    const results = await yahooFinance.search(q, searchOptions, moduleOptions);
    const quotes = Array.isArray(results?.quotes) ? results.quotes : [];
    const etfs = quotes
      .filter(isValidEtfQuote)
      .map((quote) => ({
        symbol: quote.symbol.trim(),
        shortname: asString(quote.shortname),
        longname: asString(quote.longname),
        exchange: asString(quote.exchange)
      }));
    res.json(etfs);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 分析 API
const MAX_HOLDINGS = 300;
const MAX_COMMON = 300;
const keyOf = (h, cusipToTicker) => {
  const t = normTicker(h.symbol);
  if (t) return t;
  const cusip = h.cusip || (/^US[0-9A-Z]{9}\d$/.test(h.isin || '') ? h.isin.slice(2, 11) : '');
  if (cusip) return cusipToTicker.get(cusip) || `CUSIP:${cusip}`;
  return h.name ? `NAME:${h.name.toUpperCase()}` : '';
};

app.post('/api/analyze', async (req, res) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) {
    return res.status(400).json({ error: 'Invalid tickers' });
  }

  const data = {};
  const etf_info = {};
  const holdings_meta = {};

  try {
    await Promise.all(tickers.map(async (symbol) => {
      let yahooHoldings = [];
      let family = '';
      let longName = '';
      try {
        const result = await yahooFinance.quoteSummary(symbol, { modules: ['topHoldings', 'price', 'summaryDetail', 'fundProfile'] }, { validateResult: false });
        const price = result.price || {};
        longName = price.longName || price.shortName || '';
        family = result.fundProfile?.family || '';
        etf_info[symbol] = {
          shortname: price.shortName || symbol,
          longname: price.longName || symbol,
          currency: price.currency || '',
        };
        yahooHoldings = (result.topHoldings?.holdings || []).map((h) => ({
          symbol: h.symbol || '',
          name: h.holdingName,
          percent: h.holdingPercent,
        }));
      } catch (e) {
        console.error(`Error fetching ${symbol}:`, e.message);
        etf_info[symbol] = { shortname: symbol, longname: symbol, currency: '' };
      }

      const full = await getFullHoldings(symbol, { family, name: longName, yahooHoldings });
      data[symbol] = full.holdings;
      holdings_meta[symbol] = {
        source: full.source,
        as_of: full.asOf || '',
        complete: full.complete,
        count: full.holdings.length,
        total: full.total || full.holdings.length,
        coverage: full.coverage,
        reason: full.reason || '',
        errors: full.complete ? [] : (full.errors || []).map((e) => String(e).slice(0, 300)),
      };
    }));

    // 用已知 "CUSIP -> ticker" 把没有 ticker 的持仓(如 SEC 数据)对齐到同一个 key
    const cusipToTicker = new Map();
    for (const list of Object.values(data)) {
      for (const h of list) {
        const t = normTicker(h.symbol);
        const c = h.cusip || (/^US[0-9A-Z]{9}\d$/.test(h.isin || '') ? h.isin.slice(2, 11) : '');
        if (t && c) cusipToTicker.set(c, t);
      }
    }

    // etf_weights[etf][key] = { weight, symbol, name }
    const etf_weights = {};
    for (const [etf, list] of Object.entries(data)) {
      const m = {};
      for (const h of list) {
        const k = keyOf(h, cusipToTicker);
        if (!k || !Number.isFinite(h.percent)) continue;
        if (m[k]) m[k].weight += h.percent;
        else m[k] = { weight: h.percent, symbol: h.symbol || '', name: h.name || '' };
      }
      etf_weights[etf] = m;
    }

    const overlap_matrix = tickers.map((etf1) =>
      tickers.map((etf2) => {
        const w1 = etf_weights[etf1] || {};
        const w2 = etf_weights[etf2] || {};
        if (etf1 === etf2) {
          return {
            weight: 1.0,
            count: Object.keys(w1).length,
            common: Object.values(w1)
              .sort((x, y) => y.weight - x.weight)
              .slice(0, MAX_COMMON)
              .map((x) => ({ symbol: x.symbol || x.name, name: x.name, weight_a: x.weight, weight_b: x.weight })),
          };
        }
        let overlap_weight = 0;
        const common = [];
        for (const [k, a] of Object.entries(w1)) {
          const b = w2[k];
          if (!b) continue;
          overlap_weight += Math.min(a.weight, b.weight);
          common.push({ symbol: a.symbol || b.symbol || a.name, name: a.name || b.name, weight_a: a.weight, weight_b: b.weight });
        }
        common.sort((x, y) => Math.min(y.weight_a, y.weight_b) - Math.min(x.weight_a, x.weight_b));
        return { weight: overlap_weight, count: common.length, common: common.slice(0, MAX_COMMON) };
      }),
    );

    // 控制响应体积 (Vercel 限制 4.5MB): 前端只展示权重最大的若干条, 完整条数见 holdings_meta
    const trimmed = {};
    for (const [etf, list] of Object.entries(data)) {
      trimmed[etf] = [...list].sort((a, b) => (b.percent || 0) - (a.percent || 0)).slice(0, MAX_HOLDINGS).map(({ symbol, name, percent }) => ({ symbol, name, percent }));
    }

    res.json({ holdings: trimmed, etf_info, holdings_meta, overlap_matrix, tickers });
  } catch (error) {
    console.error('Analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vercel serverless function entry point
export default app;
