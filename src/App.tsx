import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Github, X } from 'lucide-react';
import { SearchBox } from './components/SearchBox';
import { OverlapMatrix } from './components/OverlapMatrix';
import { PairDetail } from './components/PairDetail';
import { SharedTable } from './components/SharedTable';
import { FundCard } from './components/FundCard';
import { Mark } from './components/Mark';
import { analyzeETFs } from './api';
import type { AnalysisResult } from './api';
import { int, normKey, pairsOf, pct, rowSizes } from './format';

type Market = 'US' | 'HK';
type Pair = { i: number; j: number };

const EXAMPLES: string[][] = [['VOO', 'IVV'], ['SPY', 'QQQ', 'SCHD'], ['BND', 'AGG']];

const readUrl = (): string[] => {
  const raw = new URLSearchParams(window.location.search).get('etfs') ?? '';
  return Array.from(new Set(raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)));
};

/** The pair with the highest overlap: the screen's finding. */
const topPair = (r: AnalysisResult): Pair | null => {
  const pairs = pairsOf(r.overlap_matrix);
  return pairs.length ? pairs.reduce((m, p) => (p.w > m.w ? p : m)) : null;
};

function App() {
  const { t, i18n } = useTranslation();
  const [market, setMarket] = useState<Market>('US');
  const [selected, setSelected] = useState<string[]>(readUrl);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pair, setPair] = useState<Pair>({ i: 0, j: 1 });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const reqId = useRef(0);

  const isEn = (i18n.resolvedLanguage || i18n.language).startsWith('en');
  const toggleLanguage = () => i18n.changeLanguage(isEn ? 'zh' : 'en');

  const run = useCallback(async (tickers: string[]) => {
    if (tickers.length < 2) return;
    const id = ++reqId.current;
    setLoading(true);
    setFailed(false);
    try {
      const data = await analyzeETFs(tickers, 'US');
      if (id !== reqId.current) return;
      setResult(data);
      setPair(topPair(data) ?? { i: 0, j: 1 });
      window.history.replaceState(null, '', `?etfs=${tickers.join(',')}`);
    } catch (e) {
      if (id !== reqId.current) return;
      console.error(e);
      setFailed(true);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // A shared link (?etfs=VOO,IVV) runs straight away.
  useEffect(() => {
    const fromUrl = readUrl();
    if (fromUrl.length >= 2) void run(fromUrl);
  }, [run]);

  const add = (tk: string) => setSelected((s) => (s.includes(tk) ? s : [...s, tk]));
  const remove = (tk: string) => setSelected((s) => s.filter((x) => x !== tk));
  const tryExample = (list: string[]) => {
    setSelected(list);
    void run(list);
  };
  const clear = () => {
    setSelected([]);
    setResult(null);
    setFailed(false);
    reqId.current++;
    const url = new URL(window.location.href);
    url.searchParams.delete('etfs');
    window.history.replaceState(null, '', url);
  };

  const finding = useMemo(() => {
    if (!result) return null;
    const p = topPair(result);
    if (!p) return t('finding.single');
    const w = result.overlap_matrix[p.i][p.j].weight;
    const key = w >= 0.8 ? 'twin' : w >= 0.4 ? 'heavy' : w >= 0.1 ? 'partial' : 'light';
    return t(`finding.${key}`, { a: result.tickers[p.i], b: result.tickers[p.j], pct: pct(w) });
  }, [result, t]);

  const kpis = useMemo(() => {
    if (!result) return null;
    const pairs = pairsOf(result.overlap_matrix);
    if (!pairs.length) return null;
    const hi = pairs.reduce((m, p) => (p.w > m.w ? p : m));
    const lo = pairs.reduce((m, p) => (p.w < m.w ? p : m));
    const full = result.tickers.filter((tk) => result.holdings_meta[tk]?.complete).length;
    const tied = pairs.filter((p) => p.w.toFixed(3) === lo.w.toFixed(3)).length;
    return { hi, lo, full, tied, showLow: pairs.length > 1 };
  }, [result]);

  const incomplete = result ? result.tickers.filter((tk) => !result.holdings_meta[tk]?.complete) : [];
  const need = 2 - selected.length;
  const canRun = selected.length >= 2 && !loading;
  const tick = (i: number) => result?.tickers[i] ?? '';

  return (
    <div className="shell">
      <Helmet>
        <html lang={i18n.language.startsWith('en') ? 'en' : 'zh-CN'} />
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
      </Helmet>

      <nav className="rail" aria-label="Site">
        <a className="mark" href="/" aria-label={t('nav.home')} title={t('nav.home')}>
          <Mark size={26} />
        </a>
        <div className="spacer" />
        <button className="rail-btn lang" onClick={toggleLanguage} aria-label={t('nav.language')} title={t('nav.language')}>
          {isEn ? '中' : 'EN'}
        </button>
        <a className="rail-btn" href="https://github.com/domechn/etf-cal" target="_blank" rel="noopener noreferrer" aria-label={t('nav.github')} title={t('nav.github')}>
          <Github size={18} />
        </a>
      </nav>

      <main className="canvas">
        <div className="title-row">
          <div>
            <h1>{t('title')}</h1>
            <p className={`sub${finding ? '' : ' quiet'}`} aria-live="polite">{finding ?? t('empty.subline')}</p>
          </div>
        </div>

        <section className="setup" aria-label={t('setup.funds')}>
          <div className="setup-row">
            <SearchBox onAdd={add} market={market} />
            <div className="segmented" role="group" aria-label={t('market.label')}>
              {(['US', 'HK'] as Market[]).map((m) => (
                <button key={m} aria-pressed={market === m} onClick={() => setMarket(m)}>
                  {t(`market.${m.toLowerCase()}`)}
                </button>
              ))}
            </div>
            <button className="btn primary" disabled={!canRun} onClick={() => run(selected)}>
              {loading ? t('setup.comparing') : t('setup.compare')}
            </button>
          </div>
          {selected.length > 0 && <div className="chips">
            {selected.map((tk) => (
              <span className="chip" key={tk}>
                <b>{tk}</b>
                {result?.etf_info[tk]?.shortname && result.etf_info[tk].shortname !== tk && (
                  <span className="nm">{result.etf_info[tk].shortname}</span>
                )}
                <button onClick={() => remove(tk)} aria-label={t('setup.remove', { ticker: tk })}>
                  <X size={14} />
                </button>
              </span>
            ))}
            {!(result && !loading && selected.join() === result.tickers.join()) && (
              <span className="hint">
                {need > 0 ? t(need === 2 ? 'setup.need_more_zero' : 'setup.need_more_one') : t('setup.ready', { count: selected.length })}
              </span>
            )}
            <button className="btn text" onClick={clear}>{t('setup.clear')}</button>
          </div>}
        </section>

        {failed && (
          <div className="err" role="alert">
            <AlertTriangle size={18} />
            <span>{t('error.failed')}</span>
            <button className="btn text" onClick={() => run(selected)}>{t('error.retry')}</button>
          </div>
        )}

        {loading && !result && <Skeleton />}

        {!result && !loading && !failed && (
          <div className="frame-empty">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.desc')}</p>
            <p className="ex-label">{t('empty.examples')}</p>
            <div className="examples-grid">
              {EXAMPLES.map((ex, k) => (
                <button key={ex.join()} className="example" onClick={() => tryExample(ex)}>
                  <b>{ex.join(' + ')}</b>
                  <span>{t(`empty.ex.${k}.name`)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 150ms' }} aria-busy={loading}>
            {kpis && (
              <div className="kpis">
                <div className="kpi lead">
                  <div className="label">{t('kpi.highest')}</div>
                  <div className="value num">{pct(kpis.hi.w)}</div>
                  <div className="meta">{tick(kpis.hi.i)} · {tick(kpis.hi.j)}</div>
                </div>
                {kpis.showLow && (
                  <div className="kpi">
                    <div className="label">{t('kpi.lowest')}</div>
                    <div className="value num">{pct(kpis.lo.w)}</div>
                    <div className="meta">{kpis.tied > 1 ? t('kpi.tied', { n: kpis.tied }) : `${tick(kpis.lo.i)} · ${tick(kpis.lo.j)}`}</div>
                  </div>
                )}
                <div className="kpi">
                  <div className="label">{t('kpi.shared')}</div>
                  <div className="value num">{int(result.overlap_matrix[pair.i][pair.j].count)}</div>
                  <div className="meta">{t('kpi.shared_sub', { a: tick(pair.i), b: tick(pair.j) })}</div>
                </div>
                <div className="kpi">
                  <div className="label">{t('kpi.funds')}</div>
                  <div className="value num">{result.tickers.length}</div>
                  <div className="meta">{t('kpi.full', { full: kpis.full })}</div>
                </div>
              </div>
            )}

            {incomplete.length > 0 && (
              <div className="notice" role="note">
                <AlertTriangle size={14} />
                <span>{t('notice.partial', { tickers: incomplete.join(', ') })}</span>
              </div>
            )}

            <div className="grid">
              <OverlapMatrix data={result} pair={pair} onSelect={setPair} />
              <PairDetail data={result} pair={pair} onSelect={setPair} />
              <SharedTable key={`${pair.i}-${pair.j}`} data={result} pair={pair} />
            </div>

            <div className="section-head">
              <h2>{t('funds.title')}</h2>
              <p className="desc">{t('funds.desc')} {t('funds.legend', { a: tick(pair.i), b: tick(pair.j) })}</p>
            </div>
            <div className="funds">
              {(() => {
                const sizes = rowSizes(result.tickers.length);
                const spans: number[] = [];
                sizes.forEach((s) => { for (let k = 0; k < s; k++) spans.push(6 / s); });
                const cell = result.overlap_matrix[pair.i][pair.j];
                const scaleMax = Math.max(0, ...result.tickers.flatMap((tk) => (result.holdings[tk] ?? []).slice(0, 10).map((h) => h.percent || 0)));
                const keys = new Set<string>();
                cell.common.forEach((c) => { keys.add(normKey(c.symbol)); keys.add(normKey(c.name)); });
                return result.tickers.map((tk, idx) => (
                  <FundCard key={tk} ticker={tk} data={result} span={spans[idx]} scaleMax={scaleMax} sharedKeys={idx === pair.i || idx === pair.j ? keys : undefined} />
                ));
              })()}
            </div>
            <p className="foot">{t('footer.note')}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-hidden="true">
      <div className="kpis">
        {[0, 1, 2].map((k) => (
          <div key={k}>
            <div className="skel" style={{ width: 80, height: 12 }} />
            <div className="skel" style={{ width: k === 0 ? 120 : 80, height: k === 0 ? 32 : 22, marginTop: 8 }} />
          </div>
        ))}
      </div>
      <div className="grid">
        <div className="card span-5" style={{ height: 260 }}><div className="skel" style={{ height: '100%' }} /></div>
        <div className="card span-7" style={{ height: 260 }}><div className="skel" style={{ height: '100%' }} /></div>
      </div>
    </div>
  );
}

export default App;
