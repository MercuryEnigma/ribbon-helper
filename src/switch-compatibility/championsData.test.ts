import { describe, it, expect } from 'vitest';
import pokemonDb from '../data/pokemon.json';
import championsData from '../data/pokemon_champions.json';

const champions = championsData as Record<string, string[]>;
const pokemonKeys = new Set(Object.keys(pokemonDb));

describe('pokemon_champions.json', () => {
  it('contains only supported regulation rosters', () => {
    expect(Object.keys(champions).sort()).toEqual(['regulation-m-a', 'regulation-m-b']);
    expect(champions['regulation-m-a'].length).toBeGreaterThan(0);
    expect(champions['regulation-m-b'].length).toBeGreaterThan(0);
  });

  it('references existing Pokemon keys without duplicates', () => {
    for (const [slug, roster] of Object.entries(champions)) {
      const missingKeys = roster.filter(key => !pokemonKeys.has(key));
      const duplicateKeys = roster.filter((key, index) => roster.indexOf(key) !== index);

      expect(missingKeys, `${slug} has keys missing from pokemon.json`).toEqual([]);
      expect([...new Set(duplicateKeys)], `${slug} has duplicate keys`).toEqual([]);
    }
  });
});
