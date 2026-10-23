import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchETFs } from '../api';
import type { ETFSearchResult } from '../api';
import { useDebounce } from '../hooks/useDebounce';

type Market = 'US' | 'HK';

interface Props {
  onAdd: (ticker: string) => void;
  market: Market;
}

const looksLikeTicker = /^[A-Za-z0-9][A-Za-z0-9.-]{0,9}$/;

export const SearchBox: React.FC<Props> = ({ onAdd, market }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query.trim(), 350);
  const [resp, setResp] = useState<{ q: string; market: Market; items: ETFSearchResult[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    searchETFs(debounced)
      .then((data) => {
        if (cancelled) return;
        const items = data.filter((item) => {
          if (market === 'HK') return item.symbol.endsWith('.HK') || /^\d{4}$/.test(item.symbol);
          return !item.symbol.includes('.');
        });
        setResp({ q: debounced, market, items });
        setActive(0);
        setOpen(true);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setResp({ q: debounced, market, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, market]);

  const current = resp && resp.q === debounced && resp.market === market;
  const results = current ? resp.items : [];
  const loading = debounced.length > 0 && !current;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (ticker: string) => {
    onAdd(ticker.toUpperCase());
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && results[active]) choose(results[active].symbol);
      else if (looksLikeTicker.test(query.trim())) choose(query.trim());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showMenu = open && debounced.length > 0 && !loading;

  return (
    <div className="search" ref={wrapRef}>
      <Search className="ico" size={16} aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        aria-expanded={showMenu}
        aria-controls="etf-results"
        aria-label={t('setup.funds')}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('setup.search_placeholder', { market: t(`market.${market.toLowerCase()}`), example: market === 'US' ? 'SPY' : '2800.HK' })}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {loading && <Loader2 className="spin" size={16} aria-label={t('setup.searching')} />}
      {showMenu && (
        <ul className="menu" id="etf-results" role="listbox">
          {results.length === 0 ? (
            <li className="empty">{t('setup.no_results')}</li>
          ) : (
            results.map((item, i) => (
              <li
                key={item.symbol}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item.symbol)}
              >
                <span className="t">{item.symbol}</span>
                <span className="n">{item.shortname || item.longname}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
