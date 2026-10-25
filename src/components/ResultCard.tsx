import { memo } from 'react';
import { Highlight } from './Highlight';
import type { ResultRow } from '../lib/protocol';

type Props = { row: ResultRow; columns: string[]; terms: string[]; rowOffset: number };

export const ResultCard = memo(function ResultCard({ row, columns, terms, rowOffset }: Props) {
  const titleIdx = row.cells.findIndex(Boolean);
  const title = titleIdx === -1 ? '(empty row)' : row.cells[titleIdx];

  return (
    <article className="result">
      <header>
        <span className="row-no">Row {row.index + rowOffset}</span>
        <h3>
          <Highlight text={title} terms={terms} />
        </h3>
      </header>
      <dl>
        {columns.map((col, i) => (
          <div key={i} className={row.cells[i] ? undefined : 'empty'}>
            <dt>{col}</dt>
            <dd>{row.cells[i] ? <Highlight text={row.cells[i]} terms={terms} /> : '—'}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
});
