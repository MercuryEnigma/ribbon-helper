import { describe, expect, it } from 'vitest';
import {
  chooseSeam,
  findBestVerticalOffset,
  type RowFeatures,
} from './overlapMatcher';

function toFeatures(rows: number[][]): RowFeatures {
  return {
    height: rows.length,
    size: rows[0].length,
    values: Uint8Array.from(rows.flat()),
  };
}

function documentRow(index: number): number[] {
  return [
    (index * 17 + 11) % 256,
    (index * 31 + 29) % 256,
    (index * 47 + 53) % 256,
    (index * 61 + 71) % 256,
    (index * 73 + 89) % 256,
    (index * 97 + 107) % 256,
  ];
}

describe('findBestVerticalOffset', () => {
  it('prefers the complete overlap over an earlier repeated section', () => {
    const document = Array.from({ length: 1100 }, (_, index) => documentRow(index));

    // The second screenshot starts with content that also appeared earlier in
    // the first screenshot. The correct alignment continues after this block.
    for (let row = 0; row < 120; row++) {
      document[500 + row] = [...document[300 + row]];
    }

    const first = toFeatures(document.slice(0, 800));
    const secondRows = document.slice(500, 1100).map(row => [...row]);

    // Simulate fixed viewport chrome at the top of the later screenshot.
    for (let row = 0; row < 12; row++) secondRows[row].fill(240);
    const second = toFeatures(secondRows);

    expect(findBestVerticalOffset(first, second)).toBe(500);
  });

  it('rejects images without a reliable overlap', () => {
    const first = toFeatures(Array.from({ length: 600 }, () => Array(6).fill(20)));
    const second = toFeatures(Array.from({ length: 600 }, () => Array(6).fill(220)));

    expect(findBestVerticalOffset(first, second)).toBeNull();
  });
});

describe('chooseSeam', () => {
  it('keeps the output height implied by the detected offset', () => {
    const document = Array.from({ length: 1100 }, (_, index) => documentRow(index));
    const first = toFeatures(document.slice(0, 800));
    const second = toFeatures(document.slice(500, 1100));
    const [cutY1, cutY2] = chooseSeam(first, second, 500);

    expect(cutY1 - cutY2).toBe(500);
    expect(cutY1 + (second.height - cutY2)).toBe(1100);
  });
});
