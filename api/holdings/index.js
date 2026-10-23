import { fetchVanguard } from './vanguard.js';
import { fetchIshares } from './ishares.js';
import { fetchSpdr } from './spdr.js';
import { fetchInvesco } from './invesco.js';
import { fetchSec } from './sec.js';

const ADAPTERS = {
  vanguard: fetchVanguard,
  ishares: fetchIshares,
  spdr: fetchSpdr,
  invesco: fetchInvesco,
};

// 根据 Yahoo 返回的基金家族 / 名称判断发行商
export function detectIssuer({ family = '', name = '' } = {}) {
  const s = `${family} ${name}`.toLowerCase();
  if (/vanguard/.test(s)) return 'vanguard';
  if (/ishares|blackrock/.test(s)) return 'ishares';
  if (/spdr|state street|ssga/.test(s)) return 'spdr';
  if (/invesco|powershares/.test(s)) return 'invesco';
  return null;
}

const MIN_COVERAGE = 0.8; // 权重合计低于 80% 视为不完整

const cache = new Map();
const TTL = 6 * 3600 * 1000;

/**
 * 返回 { holdings, source, asOf, complete, total, coverage, reason? }
 * 优先级: 发行商官方文件 -> SEC N-PORT -> Yahoo 前 10 大(标记为不完整)
 */
export async function getFullHoldings(symbol, { family, name, yahooHoldings = [] } = {}) {
  const key = symbol.toUpperCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  const issuer = detectIssuer({ family, name });
  const chain = [];
  if (issuer) chain.push([issuer, ADAPTERS[issuer]]);
  chain.push(['sec', fetchSec]);

  const errors = [];
  let result = null;
  for (const [label, fn] of chain) {
    try {
      const r = await fn(key);
      const coverage = r.holdings.reduce((a, h) => a + (h.percent || 0), 0);
      // 数据源只返回了部分条目 (例如只有前 10)
      const truncated = r.total && r.holdings.length < r.total * 0.95;
      let reason;
      if (truncated) reason = 'truncated';
      else if (coverage < MIN_COVERAGE) reason = 'low_coverage';
      else if (r.holdings.length <= 10) reason = 'few_holdings';
      const complete = !reason;
      const value = { ...r, coverage, complete, ...(reason ? { reason } : {}) };
      // 不完整的结果先留着, 继续尝试下一个来源; 都不行再用它
      if (complete) { result = value; break; }
      if (!result || value.holdings.length > result.holdings.length) result = value;
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
    }
  }

  if (!result || result.holdings.length < yahooHoldings.length) {
    const coverage = yahooHoldings.reduce((a, h) => a + (h.percent || 0), 0);
    result = {
      holdings: yahooHoldings,
      source: 'yahoo',
      asOf: '',
      total: yahooHoldings.length,
      coverage,
      complete: false,
      reason: 'top10_only',
    };
  }
  if (errors.length) console.warn(`[holdings] ${key}: ${errors.join(' | ')}`);
  result = { ...result, errors };
  // 失败结果只缓存很短时间, 避免一次限流把整个实例 6 小时都拖成不完整
  cache.set(key, { at: result.complete ? Date.now() : Date.now() - TTL + 60_000, value: result });
  return result;
}
