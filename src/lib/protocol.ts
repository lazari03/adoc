export type HeaderMode = 'auto' | 'yes' | 'no';

export type SheetInfo = { name: string; rowCount: number; columnCount: number };

export type ResultRow = { index: number; cells: string[] };

export type ToWorker =
  | { type: 'load'; buffer: ArrayBuffer }
  | { type: 'select'; sheet: string; header: HeaderMode }
  | { type: 'search'; id: number; query: string; offset: number; limit: number };

export type FromWorker =
  | { type: 'loaded'; sheets: SheetInfo[] }
  | { type: 'ready'; sheet: string; columns: string[]; hasHeader: boolean; rowCount: number }
  | { type: 'results'; id: number; total: number; offset: number; rows: ResultRow[]; ms: number }
  | { type: 'error'; message: string };
