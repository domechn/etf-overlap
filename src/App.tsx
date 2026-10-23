import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { SearchBox } from './components/SearchBox';
import { OverlapMatrix } from './components/OverlapMatrix';
import { analyzeETFs } from './api';
import type { AnalysisResult } from './api';
import { Github, Trash2, TrendingUp, Languages, AlertTriangle } from 'lucide-react';

function App() {
  const { t, i18n } = useTranslation();
  const [market, setMarket] = useState<'US' | 'HK'>('US');
  const [selectedETFs, setSelectedETFs] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = () => {
    // Check current resolved language (might be 'zh-CN' or similar from detector)
    const currentLang = i18n.resolvedLanguage || i18n.language;
    const newLang = currentLang.startsWith('en') ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleAdd = (ticker: string) => {
    if (!selectedETFs.includes(ticker)) {
      setSelectedETFs([...selectedETFs, ticker]);
    }
  };

  const handleRemove = (ticker: string) => {
    setSelectedETFs(selectedETFs.filter(t => t !== ticker));
  };

  const handleAnalyze = async () => {
    if (selectedETFs.length < 2) {
      setError(t('error.min_two'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await analyzeETFs(selectedETFs, market);
      setResult(data);
    } catch (e) {
      setError(t('error.failed'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Helmet>
        <title>{t('meta.title')}</title>
        <meta name="description" content={t('meta.description')} />
        <meta name="keywords" content={t('meta.keywords')} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={t('meta.title')} />
        <meta property="og:description" content={t('meta.description')} />
        <meta property="og:image" content="https://your-domain.com/og-image.jpg" /> {/* Replace with actual image URL */}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content={t('meta.title')} />
        <meta property="twitter:description" content={t('meta.description')} />
      </Helmet>
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TrendingUp className="text-blue-600 w-8 h-8 shrink-0" />
            <h1
              className="flex-1 min-w-0 truncate text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent sm:text-xl"
              title={t('title')}
            >
              {t('title')}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0 sm:gap-4">
            <button 
              onClick={toggleLanguage}
              className="flex items-center gap-1 hover:text-gray-900 transition-colors whitespace-nowrap"
              title="Switch Language"
            >
              <Languages className="w-4 h-4" />
              <span className="uppercase font-medium">{i18n.language}</span>
            </button>
            <span className="hidden sm:inline">Data: issuers · SEC · Yahoo</span>
            <a
              href="https://github.com/domechn/etf-cal"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 transition-colors"
              aria-label="GitHub Repository"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar / Control Panel */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="font-semibold mb-4 text-gray-700">{t('step1')}</h2>
              <div className="flex p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setMarket('US')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${market === 'US' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t('market.us')}
                </button>
                <button
                  onClick={() => setMarket('HK')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${market === 'HK' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {t('market.hk')}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="font-semibold mb-4 text-gray-700">{t('step2')}</h2>
              <SearchBox onAdd={handleAdd} market={market} />
              
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">{t('selected')} ({selectedETFs.length})</span>
                  {selectedETFs.length > 0 && (
                    <button onClick={() => setSelectedETFs([])} className="text-xs text-red-500 hover:underline">
                      {t('clear')}
                    </button>
                  )}
                </div>
                
                {selectedETFs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                    {t('empty_list')}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {selectedETFs.map(t => (
                      <li key={t} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">
                        <span className="font-mono font-medium">{t}</span>
                        <button onClick={() => handleRemove(t)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || selectedETFs.length < 2}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                loading || selectedETFs.length < 2 
                  ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-200'
              }`}
            >
              {loading ? t('analyzing') : t('analyze_btn')}
            </button>
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl shadow-sm border p-12 text-center min-h-[400px]">
                <TrendingUp className="w-16 h-16 mb-4 text-gray-200" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">{t('ready_state.title')}</h3>
                <p className="max-w-xs mx-auto">{t('ready_state.desc')}</p>
                <p className="mt-4 text-xs text-orange-400">{t('ready_state.note')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-6 min-h-[400px]">
                 <div className="mb-6 pb-6 border-b">
                   <h2 className="text-2xl font-bold mb-2">{t('result.title')}</h2>
                   <p className="text-gray-500 text-sm">
                     {t('result.desc', { tickers: result.tickers.join(', ') })}
                     <br/>
                     <span className="text-xs text-orange-500">
                       {t('result.note')}
                     </span>
                   </p>
                 </div>
                 
                 {(() => {
                   const bad = result.tickers.filter(k => result.holdings_meta?.[k] && !result.holdings_meta[k].complete);
                   return bad.length > 0 ? (
                     <div className="mb-4 flex gap-2 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">
                       <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                       <span>{t('result.incomplete_banner', { tickers: bad.join(', ') })}</span>
                     </div>
                   ) : null;
                 })()}

                 <OverlapMatrix data={result} />
                 
                 {/* Raw Holdings List */}
                 <div className="mt-12">
                    <h3 className="text-lg font-bold mb-4">{t('result.holdings_overview')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.tickers.map(ticker => {
                      const meta = result.holdings_meta?.[ticker];
                      const list = result.holdings[ticker];
                      const MAX_ROWS = 200;
                      return (
                      <div key={ticker} className={`border rounded-lg overflow-hidden ${meta && !meta.complete ? 'border-orange-300' : ''}`}>
                        <div className="bg-gray-50 p-3 border-b font-bold flex flex-wrap items-center justify-between gap-2">
                          <span>{ticker}</span>
                          <span className="text-xs font-normal text-gray-500 self-center truncate max-w-[110px] sm:max-w-[150px]">{result.etf_info[ticker]?.shortname}</span>
                        </div>
                        {meta && (
                          <div className={`px-3 py-2 text-xs border-b ${meta.complete ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                            <div className="flex flex-wrap items-center gap-x-2">
                              <span className="font-semibold">{meta.complete ? t('result.badge_complete') : t('result.badge_partial')}</span>
                              <span>· {t(`result.source.${meta.source}`)}</span>
                              {meta.as_of && <span>· {t('result.as_of', { date: meta.as_of })}</span>}
                            </div>
                            {!meta.complete && meta.reason && <div>{t(`result.reason.${meta.reason}`)}</div>}
                            {meta.source === 'sec' && <div>{t('result.sec_note')}</div>}
                            {meta.source !== 'yahoo' && <div className="opacity-75">{t('result.count_info', { count: meta.count, coverage: (meta.coverage * 100).toFixed(1) })}</div>}
                          </div>
                        )}
                        <ul className="max-h-60 overflow-y-auto divide-y">
                          {list.length > 0 ? (
                            list.slice(0, MAX_ROWS).map((h, i) => (
                              <li key={i} className="p-2 text-sm flex justify-between hover:bg-gray-50">
                                <span className="truncate flex-1 mr-2" title={h.name}>{h.name}</span>
                                <span className="font-mono text-gray-600">{(h.percent * 100).toFixed(2)}%</span>
                              </li>
                            ))
                          ) : (
                            <li className="p-4 text-center text-gray-400 text-sm">{t('result.no_data')}</li>
                          )}
                          {list.length > MAX_ROWS && (
                            <li className="p-2 text-xs text-center text-gray-400">{t('result.truncated_list', { n: MAX_ROWS, total: list.length })}</li>
                          )}
                        </ul>
                      </div>
                    );})}
                  </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
