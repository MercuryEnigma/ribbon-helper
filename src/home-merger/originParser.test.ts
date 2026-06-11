import { describe, expect, it } from 'vitest';
import { normalizeOcrText, parseHomeOrigin } from './originParser';

describe('parseHomeOrigin', () => {
  it('maps a distant land to Gen 3', () => {
    expect(parseHomeOrigin(
      'Seems to have had a fateful encounter in a distant land on 05/18/2020',
    ).origin).toBe('Gen 3');
  });

  it('checks the full Virtual Console phrase before generic Kanto', () => {
    expect(parseHomeOrigin(
      'First met in the Kanto region in the good old days.',
    ).origin).toBe('VC');
  });

  it('maps current HOME regions to Switch', () => {
    expect(parseHomeOrigin('It was first met in the Paldea region.').origin)
      .toBe('Switch');
  });

  it('normalizes punctuation, accents, and whitespace', () => {
    expect(normalizeOcrText('  Pokémon—GO\n')).toBe('pokemon go');
  });

  it('returns no origin for unrelated text', () => {
    expect(parseHomeOrigin('Nature: Bashful').origin).toBeNull();
  });
});
