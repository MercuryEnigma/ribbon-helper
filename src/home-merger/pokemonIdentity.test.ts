import { describe, expect, it } from 'vitest';
import type { PokemonDatabase } from '../switch-compatibility/types';
import { getFormOptions, matchPokemonIdentity } from './pokemonIdentity';

const pokemonDb: PokemonDatabase = {
  claydol: {
    names: { en: 'Claydol' } as never,
    natdex: 344,
    games: ['ruby'],
  },
  rattata: {
    names: { en: 'Rattata' } as never,
    natdex: 19,
    games: ['red-eng'],
  },
  'rattata-alola': {
    'data-source': 'rattata',
    forms: { en: 'Alolan Form' } as never,
    games: ['sun'],
  },
};

describe('matchPokemonIdentity', () => {
  it('matches OCR by Dex number and species name', () => {
    const result = matchPokemonIdentity(
      'Lv. 100 No. 0344 Claydol Ground Psychic',
      pokemonDb,
    );

    expect(result.dexNumber).toBe(344);
    expect(result.recognizedName).toBe('Claydol');
    expect(result.displayedTypes).toEqual(['Ground', 'Psychic']);
    expect(result.recognizedLevel).toBe(100);
    expect(result.candidates[0]?.pokemonKey).toBe('claydol');
  });

  it('returns base and alternate forms for correction', () => {
    expect(getFormOptions('rattata', pokemonDb).map(option => option.pokemonKey))
      .toEqual(['rattata', 'rattata-alola']);
  });
});
