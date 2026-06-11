import { describe, expect, it } from 'vitest';
import { scoreNormalizedIcons } from './ribbonMatcher';

function icon(color: [number, number, number], inset = 1) {
  const pixels = new Uint8ClampedArray(4 * 4 * 4);
  for (let y = inset; y < 4 - inset; y++) {
    for (let x = inset; x < 4 - inset; x++) {
      const offset = (y * 4 + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

describe('scoreNormalizedIcons', () => {
  it('ranks identical color and silhouette ahead of different icons', () => {
    const target = icon([210, 60, 120]);
    const same = icon([210, 60, 120]);
    const differentColor = icon([30, 160, 210]);
    const differentShape = icon([210, 60, 120], 0);

    expect(scoreNormalizedIcons(target, same)).toBe(0);
    expect(scoreNormalizedIcons(target, differentColor)).toBeGreaterThan(0);
    expect(scoreNormalizedIcons(target, differentShape)).toBeGreaterThan(0);
  });

  it('rejects arrays with incompatible dimensions', () => {
    expect(() => scoreNormalizedIcons(new Uint8ClampedArray(4), new Uint8ClampedArray(8)))
      .toThrow(/different sizes/);
  });
});
