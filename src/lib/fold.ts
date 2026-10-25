// Case- and accent-insensitive folding so "skenderi" matches "Skënderi" and "cacorri" matches "Çaçorri".
const MARKS = /\p{M}/gu;

export function fold(s: string): string {
  return s.normalize('NFD').replace(MARKS, '').toLowerCase();
}

export function queryTerms(query: string): string[] {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))];
}

export type Range = [start: number, end: number];

/** Ranges in the ORIGINAL string covered by any term, matched on the folded string. */
export function matchRanges(text: string, terms: string[]): Range[] {
  if (!text || terms.length === 0) return [];

  // Fold one code point at a time, remembering where each folded char came from.
  let folded = '';
  const origStart: number[] = [];
  const origEnd: number[] = [];
  let i = 0;
  for (const ch of text) {
    const piece = fold(ch);
    // A lone combining mark folds to nothing; attach it to the previous char so highlights include it.
    if (!piece && origEnd.length) origEnd[origEnd.length - 1] = i + ch.length;
    for (let k = 0; k < piece.length; k++) {
      origStart.push(i);
      origEnd.push(i + ch.length);
    }
    folded += piece;
    i += ch.length;
  }

  const ranges: Range[] = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(term, from);
      if (at === -1) break;
      ranges.push([origStart[at], origEnd[at + term.length - 1]]);
      from = at + 1;
    }
  }
  if (ranges.length < 2) return ranges;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [ranges[0]];
  for (const r of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  }
  return merged;
}
