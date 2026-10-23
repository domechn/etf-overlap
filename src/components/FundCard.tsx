import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '../api';
import { fmtDate, int, pct, tidyName } from '../format';

const norm = (s: string) => s.toUpperCase().replace(/[\s.\-/_]/g, '');

interface Props {
  ticker: string;
  data: AnalysisResult;
  span: number;
  /** Keys (ticker or name) of the positions held by both funds of the selected pair, when this fund is one of them. */
  sharedKeys?: Set<string>;
  /** Largest weight across all funds shown, so bar lengths compare between cards. */
  scaleMax: number;
}

const COLLAPSED = 10;

export const FundCard: React.FC<Props> = ({ ticker, data, span, sharedKeys, scaleMax }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const meta = data.holdings_meta[ticker];
  const info = data.etf_info[ticker];
  const list = data.holdings[ticker] ?? [];
  const max = scaleMax || 1;
  const shown = expanded ? list : list.slice(0, COLLAPSED);
  const complete = meta?.complete;

  return (
    <article className="card" style={{ gridColumn: `span ${span}` }} aria-label={ticker}>
      <div className="fund-head">
        <div style={{ minWidth: 0 }}>
          <h3>{ticker}</h3>
          <div className="full" title={info?.longname}>{info?.longname || info?.shortname}</div>
        </div>
        {meta && <span className={`pill ${complete ? (meta.source === 'sec' ? 'neutral' : 'ok') : 'warn'}`}>{complete ? t('funds.complete') : t('funds.partial')}</span>}
      </div>
      {meta && (
        <div className="fund-meta">
          <span>
            {t(`source.${meta.source}`)} · {meta.as_of ? t('funds.as_of', { date: fmtDate(meta.as_of) }) : t('funds.no_date')}
          </span>
          {meta.source !== 'yahoo' && (
            <span className="num">
              {t('funds.positions', { n: int(meta.total) })} · {t('funds.coverage', { pct: pct(meta.coverage) })}
            </span>
          )}
          {!complete && meta.reason && <span className="reason">{t(`reason.${meta.reason}`)}</span>}
          {!complete && meta.errors && meta.errors.length > 0 && (
            <span className="why" title={meta.errors.join('\n')}>{meta.errors[0]}</span>
          )}
          {meta.source === 'sec' ? <span>{t('funds.sec_note')}</span> : complete && <span>{t('funds.issuer_note')}</span>}
        </div>
      )}
      {list.length === 0 ? (
        <p className="empty-line">{t('funds.no_data')}</p>
      ) : (
        <ul className={`rows${expanded ? ' scroll' : ''}`}>
          {shown.map((h, i) => (
            <li key={`${h.symbol}-${i}`}>
              <i
                className={sharedKeys && (sharedKeys.has(norm(h.symbol)) || sharedKeys.has(norm(h.name))) ? 'shared' : undefined}
                style={{ width: `calc((100% - 72px) * ${((h.percent || 0) / max).toFixed(4)})`, minWidth: 4 }}
              />
              <span className="nm" title={h.name}>{tidyName(h.name) || h.symbol}</span>
              <span className="pc num">{pct(h.percent || 0, 2)}</span>
            </li>
          ))}
        </ul>
      )}
      {list.length > COLLAPSED && (
        <button className="btn text more" onClick={() => setExpanded((v) => !v)}>
          {expanded
            ? t('funds.show_less')
            : meta && meta.total > list.length
              ? t('funds.show_part', { n: int(list.length), total: int(meta.total) })
              : t('funds.show_all', { n: int(list.length) })}
        </button>
      )}
    </article>
  );
};
