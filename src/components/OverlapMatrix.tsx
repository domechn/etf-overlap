import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '../api';
import { pct } from '../format';

interface Props {
  data: AnalysisResult;
  pair: { i: number; j: number };
  onSelect: (pair: { i: number; j: number }) => void;
}

/** Cells carry the one data hue; its strength is the overlap. */
const fill = (w: number) => `rgba(29, 95, 191, ${Math.min(0.06 + 0.5 * Math.sqrt(Math.max(w, 0)), 0.55).toFixed(3)})`;

export const OverlapMatrix: React.FC<Props> = ({ data, pair, onSelect }) => {
  const { t } = useTranslation();
  const { overlap_matrix, tickers } = data;
  const n = tickers.length;

  return (
    <section className="card span-5" aria-labelledby="matrix-h">
      <h2 id="matrix-h">{t('matrix.title')}</h2>
      <p className="desc">{t('matrix.desc')}</p>
      <div className="matrix-wrap">
        <div
          className="matrix"
          role="grid"
          style={{ gridTemplateColumns: `72px repeat(${n}, minmax(64px, 1fr))`, gridTemplateRows: `28px repeat(${n}, minmax(52px, 1fr))` }}
        >
          <div role="row" style={{ display: 'contents' }}>
            <div role="presentation" />
            {tickers.map((tk) => (
              <div role="columnheader" className="mh" key={tk} title={data.etf_info[tk]?.longname}>{tk}</div>
            ))}
          </div>
          {overlap_matrix.map((row, i) => (
            <div role="row" style={{ display: 'contents' }} key={tickers[i]}>
              <div role="rowheader" className="mr" title={data.etf_info[tickers[i]]?.longname}>{tickers[i]}</div>
              {row.map((cell, j) => {
                if (i === j) return <div role="gridcell" className="cell self num" key={j} aria-hidden="true">{t('matrix.self')}</div>;
                const selected = (pair.i === i && pair.j === j) || (pair.i === j && pair.j === i);
                return (
                  <button
                    role="gridcell"
                    key={j}
                    className="cell num"
                    style={{ background: fill(cell.weight) }}
                    aria-pressed={selected}
                    aria-label={`${t('matrix.select', { a: tickers[i], b: tickers[j] })}: ${pct(cell.weight)}`}
                    onClick={() => onSelect({ i, j })}
                  >
                    {pct(cell.weight)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
