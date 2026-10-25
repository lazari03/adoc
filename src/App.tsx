import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { DropZone } from './components/DropZone';
import { ResultCard } from './components/ResultCard';
import { useSheet } from './hooks/useSheet';
import { queryTerms } from './lib/fold';
import type { HeaderMode } from './lib/protocol';

const nf = new Intl.NumberFormat();

export default function App() {
  const s = useSheet();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const terms = useMemo(() => queryTerms(deferred), [deferred]);
  const searchBox = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Debounce so every keystroke on a large sheet doesn't trigger a full scan.
  useEffect(() => {
    const t = setTimeout(() => s.search(query), 120);
    return () => clearTimeout(t);
  }, [query, s.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (s.phase === 'ready') searchBox.current?.focus();
  }, [s.phase, s.sheet]);

  // "/" focuses search, like most search UIs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchBox.current) {
        e.preventDefault();
        searchBox.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && s.loadMore(), { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [s.loadMore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (s.phase === 'idle' || s.phase === 'parsing' || (s.phase === 'error' && !s.columns.length)) {
    return (
      <main className="landing">
        <h1 className="logo">adoc</h1>
        <p className="muted">Search any spreadsheet, row by row.</p>
        <DropZone onFile={s.load} busy={s.phase === 'parsing'} />
        {s.error && <p className="error">{s.error}</p>}
      </main>
    );
  }

  // Excel row numbers: +1 for 1-based, +1 more if the header row was consumed.
  const rowOffset = s.hasHeader ? 2 : 1;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="app">
      <header className="topbar">
        <button className="logo small" onClick={() => { s.reset(); setQuery(''); }} title="Open another file">
          adoc
        </button>
        <div className="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchBox}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${nf.format(s.rowCount)} rows…`}
            disabled={s.phase !== 'ready'}
            aria-label="Search rows"
          />
          {query && (
            <button className="clear" onClick={() => setQuery('')} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
      </header>

      <section className="meta">
        <div className="file">
          <strong>{s.fileName}</strong>
          {s.sheets.length > 1 && (
            <select value={s.sheet} onChange={(e) => s.select(e.target.value, s.header)} aria-label="Sheet">
              {s.sheets.map((sh) => (
                <option key={sh.name} value={sh.name}>
                  {sh.name} ({nf.format(sh.rowCount)})
                </option>
              ))}
            </select>
          )}
          <select
            value={s.header}
            onChange={(e) => s.select(s.sheet, e.target.value as HeaderMode)}
            aria-label="Header row"
          >
            <option value="auto">Header: auto ({s.hasHeader ? 'found' : 'none'})</option>
            <option value="yes">First row is header</option>
            <option value="no">No header row</option>
          </select>
        </div>

        <div className="columns">
          <span className="muted">{s.columns.length} columns</span>
          <ol>
            {s.columns.map((c, i) => (
              <li key={i}>
                <span className="idx">{i + 1}</span>
                {c}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <main className="results">
        {s.phase === 'indexing' && <p className="muted">Indexing sheet…</p>}
        {s.error && <p className="error">{s.error}</p>}

        {s.phase === 'ready' && hasQuery && (
          <p className="stats muted">
            {s.searching && s.results.length === 0
              ? 'Searching…'
              : `${nf.format(s.total)} ${s.total === 1 ? 'result' : 'results'} (${(s.ms / 1000).toFixed(3)} s)`}
          </p>
        )}

        {s.phase === 'ready' && !hasQuery && (
          <p className="hint muted">
            Type to search every column. Matching is case- and accent-insensitive, and all words must match. Press <kbd>/</kbd> to focus.
          </p>
        )}

        {hasQuery &&
          s.results.map((row) => (
            <ResultCard key={row.index} row={row} columns={s.columns} terms={terms} rowOffset={rowOffset} />
          ))}

        {hasQuery && s.phase === 'ready' && !s.searching && s.total === 0 && (
          <p className="muted">No rows match “{query.trim()}”.</p>
        )}

        <div ref={sentinel} />
        {hasQuery && s.results.length > 0 && s.results.length < s.total && (
          <button className="more" onClick={s.loadMore} disabled={s.searching}>
            {s.searching ? 'Loading…' : `Show more (${nf.format(s.total - s.results.length)} left)`}
          </button>
        )}
      </main>
    </div>
  );
}
