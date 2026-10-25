/// <reference lib="webworker" />
import * as XLSX from 'xlsx';
import { fold, queryTerms } from '../lib/fold';
import type { FromWorker, HeaderMode, ToWorker } from '../lib/protocol';

// All data lives here so parsing and searching large sheets never blocks the UI.
let workbook: XLSX.WorkBook | null = null;
let rows: string[][] = [];
let haystacks: string[] = [];
let foldedCells: string[][] = [];
let cache: { query: string; matches: number[] } | null = null;

const SEP = '\u0001';
const post = (msg: FromWorker) => self.postMessage(msg);

function looksLikeHeader(first: string[] | undefined, columnCount: number): boolean {
  if (!first || first.length < columnCount) return false;
  const filled = first.map((c) => c.trim());
  if (filled.some((c) => c === '' || !Number.isNaN(Number(c)))) return false;
  return new Set(filled.map(fold)).size === filled.length;
}

function selectSheet(name: string, header: HeaderMode) {
  const ws = workbook?.Sheets[name];
  if (!ws) throw new Error(`Sheet "${name}" not found`);

  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
  const all = raw.map((r) => r.map((c) => String(c ?? '').trim()));
  const columnCount = all.reduce((m, r) => Math.max(m, r.length), 0);

  const hasHeader = header === 'yes' || (header === 'auto' && looksLikeHeader(all[0], columnCount));
  const columns = Array.from({ length: columnCount }, (_, i) =>
    (hasHeader && all[0][i]) || `Column ${XLSX.utils.encode_col(i)}`,
  );

  rows = (hasHeader ? all.slice(1) : all).map((r) =>
    r.length === columnCount ? r : [...r, ...Array(columnCount - r.length).fill('')],
  );
  foldedCells = rows.map((r) => r.map(fold));
  haystacks = foldedCells.map((r) => r.join(SEP));
  cache = null;

  post({ type: 'ready', sheet: name, columns, hasHeader, rowCount: rows.length });
}

// Lower is better: exact cell match, then a cell starting with the query, then anywhere.
function rank(i: number, whole: string, first: string): number {
  const cells = foldedCells[i];
  if (cells.includes(whole)) return 0;
  if (cells.some((c) => c.startsWith(first))) return 1;
  return 2;
}

function findMatches(query: string): number[] {
  if (cache?.query === query) return cache.matches;
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const whole = terms.join(' ');
  const buckets: number[][] = [[], [], []];
  for (let i = 0; i < haystacks.length; i++) {
    const h = haystacks[i];
    if (terms.every((t) => h.includes(t))) buckets[rank(i, whole, terms[0])].push(i);
  }
  const matches = buckets.flat();
  cache = { query, matches };
  return matches;
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'load': {
        workbook = XLSX.read(msg.buffer, { type: 'array', dense: true });
        const sheets = workbook.SheetNames.map((name) => {
          const ref = workbook!.Sheets[name]['!ref'];
          const range = ref ? XLSX.utils.decode_range(ref) : null;
          return {
            name,
            rowCount: range ? range.e.r - range.s.r + 1 : 0,
            columnCount: range ? range.e.c - range.s.c + 1 : 0,
          };
        });
        post({ type: 'loaded', sheets });
        break;
      }
      case 'select':
        selectSheet(msg.sheet, msg.header);
        break;
      case 'search': {
        const t0 = performance.now();
        const matches = findMatches(msg.query);
        const page = matches.slice(msg.offset, msg.offset + msg.limit);
        post({
          type: 'results',
          id: msg.id,
          total: matches.length,
          offset: msg.offset,
          rows: page.map((index) => ({ index, cells: rows[index] })),
          ms: performance.now() - t0,
        });
        break;
      }
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
