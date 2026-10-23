import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnalysisResult } from '../api';
import { int, pct, tidyName } from '../format';

interface Props {
  data: AnalysisResult;
  pair: { i: number; j: number };
}

const COLLAPSED = 10;

export const SharedTable: React.FC<Props> = ({ data, pair }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const a = data.tickers[pair.i];
  const b = data.tickers[pair.j];
  const cell = data.overlap_matrix[pair.i][pair.j];
  const rows = [...cell.common].sort((x, y) => Math.min(y.weight_a, y.weight_b) - Math.min(x.weight_a, x.weight_b));
  const shown = expanded ? rows : rows.slice(0, COLLAPSED);
  const maxMin = rows.length ? Math.min(rows[0].weight_a, rows[0].weight_b) || 1 : 1;
  const partial = !data.holdings_meta[a]?.complete || !data.holdings_meta[b]?.complete;

  return (
    <section className="card span-12" aria-labelledby="shared-h">
      <h2 id="shared-h">{t('shared.title')} · {a} / {b}</h2>
      <p className="desc">{t('shared.desc')}</p>
      {rows.length === 0 ? (
        <p className="empty-line">{partial ? t('shared.none_partial') : t('shared.none')}</p>
      ) : (
        <table className="tbl shared">
          <colgroup>
            <col className="c-id" />
            <col className="c-num" />
            <col className="c-num" />
            <col className="c-ov hide-sm" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{t('shared.holding')}</th>
              <th scope="col" className="num">{t('shared.weight_in', { ticker: a })}</th>
              <th scope="col" className="num">{t('shared.weight_in', { ticker: b })}</th>
              <th scope="col" className="hide-sm">{t('shared.overlap')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, idx) => (
              <tr key={`${r.symbol}-${idx}`}>
                <td className="id">
                  <span className="nm" title={r.name}>{tidyName(r.name) || r.symbol}</span>
                  {r.symbol && r.symbol !== r.name && <span className="tk">{r.symbol}</span>}
                </td>
                <td className="num">{pct(r.weight_a, 2)}</td>
                <td className="num">{pct(r.weight_b, 2)}</td>
                <td className="hide-sm">
                  <div className="ov">
                    <div className="track"><i style={{ width: `${(Math.min(r.weight_a, r.weight_b) / maxMin) * 100}%` }} /></div>
                    <b className="num">{pct(Math.min(r.weight_a, r.weight_b), 2)}</b>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > COLLAPSED && (
        <div className="tbl-foot">
          <button className="btn text" onClick={() => setExpanded((v) => !v)}>
            {expanded
              ? t('shared.show_less')
              : cell.count > rows.length
                ? t('shared.show_part', { n: int(rows.length), total: int(cell.count) })
                : t('shared.show_all', { n: int(rows.length) })}
          </button>
        </div>
      )}
    </section>
  );
};
