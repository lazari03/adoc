# adoc

Search any spreadsheet the way you search the web. Drop in an `.xlsx`, `.xls`, `.ods` or `.csv` file. adoc detects the columns, lists them in order, and gives you one search bar across every cell. Each result shows the full row, with the matching characters highlighted.

- Runs entirely in the browser. The file is never uploaded.
- Parsing and search run in a Web Worker, so large sheets (hundreds of thousands of rows) don't freeze the UI.
- Matching is case- and accent-insensitive (`skenderi` matches `Skënderi`). Every word in the query must match.
- Ranking: exact cell matches first, then cells that start with the query, then matches anywhere.
- Header row is auto-detected, and you can override it. Columns without a header are labelled `Column A`, `Column B`, and so on.
- Multi-sheet workbooks: pick the sheet from the dropdown.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm test         # unit tests for matching/highlighting
```

## Structure

```
src/
  workers/sheet.worker.ts   parse (SheetJS), column detection, indexing, search
  hooks/useSheet.ts         worker bridge: state, pagination, stale-response guard
  lib/fold.ts               accent/case folding + highlight ranges
  components/               DropZone, ResultCard, Highlight
```
