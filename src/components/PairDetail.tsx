import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '../api';
import { daysBetween, fmtDate, int, pairsOf, pct } from '../format';

interface Props {
  data: AnalysisResult;
  pair: { i: number; j: number };
  onSelect: (pair: { i: number; j: number }) => void;
}

/** How much of each fund the other one contains (by position count), and where each fund's data comes from. */
export const PairDetail: React.FC<Props> = ({ data, pair, onSelect }) => {
  const { t } = useTranslation();
  const a = data.tickers[pair.i];
  const b = data.tickers[pair.j];
  const cell = data.overlap_matrix[pair.i][pair.j];
  const ma = data.holdings_meta[a];
  const mb = data.holdings_meta[b];

  const row = (self: string, other: string, total: number) => {
    const shared = Math.min(cell.count, total);
    return (
      <div className="compose-row" key={self}>
        <div className="line">
          <b>{self}</b>
          <span className="num">{t('pair.positions_shared', { shared: int(shared), total: int(total), other })}</span>
        </div>
        <div className="bar" role="img" aria-label={`${self}: ${shared}/${total}`}>
          <i style={{ width: `${total ? (shared / total) * 100 : 0}%` }} />
        </div>
      </div>
    );
  };

  const src = (tk: string, m?: typeof ma) =>
    m ? (
      <div key={tk}>
        <span>{tk}</span>
        <span>
          {t(`source.${m.source}`)} · {m.as_of ? t('funds.as_of', { date: fmtDate(m.as_of) }) : t('funds.no_date')}
        </span>
      </div>
    ) : null;

  const all = pairsOf(data.overlap_matrix);
  all.sort((x, y) => y.w - x.w);

  const gap = ma?.as_of && mb?.as_of ? daysBetween(ma.as_of, mb.as_of) : 0;

  return (
    <section className="card span-7" aria-labelledby="pair-h">
      <h2 id="pair-h">{t('pair.title', { a, b })}</h2>
      <p className="desc">{t('pair.desc')}</p>
      <div className="compose">
        {row(a, b, ma?.total ?? 0)}
        {row(b, a, mb?.total ?? 0)}
      </div>
      <div className="sources">
        {src(a, ma)}
        {src(b, mb)}
      </div>
      {gap > 30 && (
        <p className="drift">{t('pair.drift', { a, b, da: fmtDate(ma.as_of), db: fmtDate(mb.as_of), days: gap })}</p>
      )}
      {all.length > 2 && (
        <div className="pairs">
          <h3>{t('pair.all')}</h3>
          <ul>
            {all.map((p) => {
              const on = (p.i === pair.i && p.j === pair.j) || (p.i === pair.j && p.j === pair.i);
              return (
                <li key={`${p.i}-${p.j}`}>
                  <button aria-pressed={on} onClick={() => onSelect({ i: p.i, j: p.j })}>
                    <i style={{ width: `${p.w * 100}%` }} />
                    <span>{data.tickers[p.i]} · {data.tickers[p.j]}</span>
                    <span className="num">{pct(p.w)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
