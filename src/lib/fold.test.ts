import { describe, expect, it } from 'vitest';
import { fold, matchRanges, queryTerms } from './fold';

describe('fold', () => {
  it('strips accents and lowercases', () => {
    expect(fold('Zezë Çaçorri ÉCOLE')).toBe('zeze cacorri ecole');
  });
});

describe('queryTerms', () => {
  it('splits, folds and dedupes', () => {
    expect(queryTerms('  Golf  golf GRÌ ')).toEqual(['golf', 'gri']);
  });
});

describe('matchRanges', () => {
  it('maps folded matches back to original indices', () => {
    const text = 'Gri E Errët';
    const [r] = matchRanges(text, ['erret']);
    expect(text.slice(...r)).toBe('Errët');
  });

  it('handles decomposed input', () => {
    const text = 'Zezë x'; // e + combining diaeresis
    const [r] = matchRanges(text, ['zeze']);
    expect(text.slice(...r)).toBe('Zezë');
  });

  it('merges overlapping ranges and finds repeats', () => {
    expect(matchRanges('abc-abc', ['abc', 'bc'])).toEqual([[0, 3], [4, 7]]);
    expect(matchRanges('aaaa', ['aa'])).toEqual([[0, 4]]);
  });

  it('returns nothing without terms', () => {
    expect(matchRanges('abc', [])).toEqual([]);
  });
});
