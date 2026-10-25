import { useCallback, useEffect, useRef, useState } from 'react';
import type { FromWorker, HeaderMode, ResultRow, SheetInfo, ToWorker } from '../lib/protocol';

const PAGE = 50;

export type Phase = 'idle' | 'parsing' | 'indexing' | 'ready' | 'error';

export function useSheet() {
  const worker = useRef<Worker | null>(null);
  const searchId = useRef(0);
  const lastQuery = useRef('');

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [sheet, setSheet] = useState('');
  const [header, setHeader] = useState<HeaderMode>('auto');
  const [hasHeader, setHasHeader] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [total, setTotal] = useState(0);
  const [ms, setMs] = useState(0);
  const [searching, setSearching] = useState(false);

  const send = (msg: ToWorker, transfer: Transferable[] = []) => worker.current?.postMessage(msg, transfer);

  useEffect(() => {
    const w = new Worker(new URL('../workers/sheet.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    w.onmessage = (e: MessageEvent<FromWorker>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'loaded': {
          setSheets(msg.sheets);
          const first = msg.sheets.find((s) => s.rowCount > 0) ?? msg.sheets[0];
          if (!first) {
            setPhase('error');
            setError('The workbook has no sheets.');
            return;
          }
          setSheet(first.name);
          setPhase('indexing');
          w.postMessage({ type: 'select', sheet: first.name, header: 'auto' } satisfies ToWorker);
          break;
        }
        case 'ready':
          setSheet(msg.sheet);
          setColumns(msg.columns);
          setHasHeader(msg.hasHeader);
          setRowCount(msg.rowCount);
          setPhase('ready');
          if (lastQuery.current) runSearch(lastQuery.current, 0);
          break;
        case 'results':
          if (msg.id !== searchId.current) return; // stale response
          setResults((prev) => (msg.offset === 0 ? msg.rows : [...prev, ...msg.rows]));
          setTotal(msg.total);
          setMs(msg.ms);
          setSearching(false);
          break;
        case 'error':
          setPhase('error');
          setError(msg.message);
          setSearching(false);
          break;
      }
    };
    return () => w.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback((query: string, offset: number) => {
    lastQuery.current = query;
    if (offset === 0) searchId.current++;
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      setSearching(false);
      return;
    }
    setSearching(true);
    send({ type: 'search', id: searchId.current, query, offset, limit: PAGE });
  }, []);

  const load = useCallback(async (file: File) => {
    setFileName(file.name);
    setError(null);
    setResults([]);
    setTotal(0);
    setHeader('auto');
    setPhase('parsing');
    const buffer = await file.arrayBuffer();
    send({ type: 'load', buffer }, [buffer]);
  }, []);

  const select = useCallback((name: string, mode: HeaderMode) => {
    setSheet(name);
    setHeader(mode);
    setPhase('indexing');
    send({ type: 'select', sheet: name, header: mode });
  }, []);

  const search = useCallback((query: string) => runSearch(query, 0), [runSearch]);
  const loadMore = useCallback(() => {
    if (!searching && results.length < total) runSearch(lastQuery.current, results.length);
  }, [runSearch, searching, results.length, total]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSheets([]);
    setColumns([]);
    setResults([]);
    setTotal(0);
    lastQuery.current = '';
  }, []);

  return {
    phase, error, fileName, sheets, sheet, header, hasHeader, columns, rowCount,
    results, total, ms, searching,
    load, select, search, loadMore, reset,
  };
}
