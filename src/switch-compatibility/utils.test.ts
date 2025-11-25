import { describe, it, expect } from 'vitest';
import {
  getPokemonDisplayName,
  filterPokemonByGames,
  getGamesForPokemon,
  getGameGroupNames,
  searchPokemonByName,
  GAME_GROUPS,
} from './utils';
import type { PokemonDatabase, PokemonData } from './types';

describe('getPokemonDisplayName', () => {
  it('should return the English name for regular Pokemon', () => {
    const data: PokemonData = {
      names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      games: ['sw', 'sh'],
    };
    expect(getPokemonDisplayName('pikachu', data)).toBe('Pikachu');
  });

  it('should return name with form for form variants', () => {
    const data: PokemonData = {
      names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      forms: { en: 'Alola Cap', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'male',
      games: ['sun', 'moon'],
    };
    expect(getPokemonDisplayName('pikachu-alola-cap', data)).toBe('Pikachu (Alola Cap)');
  });

  it('should return empty string when no names are provided', () => {
    const data: PokemonData = {
      gender: 'both',
      games: ['sw'],
    };
    expect(getPokemonDisplayName('unknown', data)).toBe('');
  });
});

describe('filterPokemonByGames', () => {
  const mockDb: PokemonDatabase = {
    bulbasaur: {
      names: { en: 'Bulbasaur', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      natdex: 1,
      games: ['sw', 'sh', 'bd', 'sp'],
    },
    pikachu: {
      names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      natdex: 25,
      games: ['sw', 'sh', 'lgp', 'lge'],
    },
    meowth: {
      names: { en: 'Meowth', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      natdex: 52,
      games: ['sh'],
    },
  };

  it('should return empty array when no games selected', () => {
    const result = filterPokemonByGames(mockDb, []);
    expect(result).toEqual([]);
  });

  it('should filter Pokemon available in all selected games', () => {
    const result = filterPokemonByGames(mockDb, ['sw', 'sh']);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.key)).toEqual(['bulbasaur', 'pikachu']);
  });

  it('should return only Pokemon in ALL selected games', () => {
    const result = filterPokemonByGames(mockDb, ['sw', 'sh', 'bd']);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('bulbasaur');
  });

  it('should handle invalid database gracefully', () => {
    const result = filterPokemonByGames(null as any, ['sw']);
    expect(result).toEqual([]);
  });

  it('should skip Pokemon with invalid games data', () => {
    const badDb: PokemonDatabase = {
      valid: {
        names: { en: 'Valid', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
        gender: 'both',
        natdex: 1,
        games: ['sw'],
      },
      invalid: {
        names: { en: 'Invalid', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
        gender: 'both',
        natdex: 2,
        games: null as any,
      },
    };
    const result = filterPokemonByGames(badDb, ['sw']);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('valid');
  });

  it('should sort results by national dex number', () => {
    const result = filterPokemonByGames(mockDb, ['sh']);
    expect(result[0].key).toBe('bulbasaur');
    expect(result[1].key).toBe('pikachu');
    expect(result[2].key).toBe('meowth');
  });
});

describe('getGamesForPokemon', () => {
  const mockDb: PokemonDatabase = {
    pikachu: {
      names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      games: ['sw', 'sh', 'bd', 'sp', 'scar', 'vio', 'x', 'y'],
    },
  };

  it('should return only Switch games', () => {
    const result = getGamesForPokemon(mockDb, 'pikachu');
    expect(result).toEqual(['sw', 'sh', 'bd', 'sp', 'scar', 'vio']);
    expect(result).not.toContain('x');
    expect(result).not.toContain('y');
  });

  it('should return empty array for non-existent Pokemon', () => {
    const result = getGamesForPokemon(mockDb, 'nonexistent');
    expect(result).toEqual([]);
  });

  it('should handle null database gracefully', () => {
    const result = getGamesForPokemon(null as any, 'pikachu');
    expect(result).toEqual([]);
  });

  it('should handle Pokemon with invalid games data', () => {
    const badDb: PokemonDatabase = {
      bad: {
        names: { en: 'Bad', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
        gender: 'both',
        games: null as any,
      },
    };
    const result = getGamesForPokemon(badDb, 'bad');
    expect(result).toEqual([]);
  });
});

describe('getGameGroupNames', () => {
  it('should return unique game group names', () => {
    const result = getGameGroupNames(['sw', 'sh', 'bd']);
    expect(result).toContain('Sword / Shield');
    expect(result).toContain('Brilliant Diamond / Shining Pearl');
  });

  it('should deduplicate groups with multiple game IDs', () => {
    const result = getGameGroupNames(['sw', 'sh']);
    expect(result).toEqual(['Sword / Shield']);
  });

  it('should return empty array for no games', () => {
    const result = getGameGroupNames([]);
    expect(result).toEqual([]);
  });

  it('should handle unknown game IDs gracefully', () => {
    const result = getGameGroupNames(['unknown', 'sw']);
    expect(result).toEqual(['Sword / Shield']);
  });

  it('should sort results alphabetically', () => {
    const result = getGameGroupNames(['scar', 'bd', 'lgp']);
    expect(result[0] < result[1]).toBe(true);
    expect(result[1] < result[2]).toBe(true);
  });
});

describe('searchPokemonByName', () => {
  const mockDb: PokemonDatabase = {
    bulbasaur: {
      names: { en: 'Bulbasaur', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      natdex: 1,
      games: ['sw'],
    },
    pikachu: {
      names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'both',
      natdex: 25,
      games: ['sw'],
    },
    'pikachu-alola-cap': {
      'data-source': 'pikachu',
      forms: { en: 'Alola Cap', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
      gender: 'male',
      natdex: 25,
      sort: 1,
      games: ['sun'],
    },
  };

  it('should find Pokemon by partial name match', () => {
    const result = searchPokemonByName(mockDb, 'pika');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some(p => p.key === 'pikachu')).toBe(true);
  });

  it('should be case insensitive', () => {
    const result = searchPokemonByName(mockDb, 'PIKA');
    expect(result.some(p => p.key === 'pikachu')).toBe(true);
  });

  it('should return empty array for empty search', () => {
    const result = searchPokemonByName(mockDb, '');
    expect(result).toEqual([]);
  });

  it('should handle null database gracefully', () => {
    const result = searchPokemonByName(null as any, 'pikachu');
    expect(result).toEqual([]);
  });

  it('should sort results by national dex', () => {
    const result = searchPokemonByName(mockDb, 'a'); // Both bulbasaur and pikachu contain 'a'
    const bulbasaurIndex = result.findIndex(p => p.key === 'bulbasaur');
    const pikachuIndex = result.findIndex(p => p.key === 'pikachu');
    if (bulbasaurIndex !== -1 && pikachuIndex !== -1) {
      expect(bulbasaurIndex < pikachuIndex).toBe(true);
    }
  });

  it('should include form variants in results', () => {
    const result = searchPokemonByName(mockDb, 'alola');
    expect(result.some(p => p.key === 'pikachu-alola-cap')).toBe(true);
  });
});

describe('GAME_GROUPS', () => {
  it('should have correct number of game groups', () => {
    expect(GAME_GROUPS).toHaveLength(5);
  });

  it('should have all required groups', () => {
    const groupNames = GAME_GROUPS.map(g => g.name);
    expect(groupNames).toContain("Let's Go Pikachu / Eevee");
    expect(groupNames).toContain('Sword / Shield');
    expect(groupNames).toContain('Brilliant Diamond / Shining Pearl');
    expect(groupNames).toContain('Legends: Arceus');
    expect(groupNames).toContain('Scarlet / Violet');
  });

  it('should have correct game IDs for each group', () => {
    const letsGo = GAME_GROUPS.find(g => g.name === "Let's Go Pikachu / Eevee");
    expect(letsGo?.ids).toEqual(['lgp', 'lge']);

    const swordShield = GAME_GROUPS.find(g => g.name === 'Sword / Shield');
    expect(swordShield?.ids).toEqual(['sw', 'sh']);

    const bdsp = GAME_GROUPS.find(g => g.name === 'Brilliant Diamond / Shining Pearl');
    expect(bdsp?.ids).toEqual(['bd', 'sp']);

    const la = GAME_GROUPS.find(g => g.name === 'Legends: Arceus');
    expect(la?.ids).toEqual(['pla']);

    const sv = GAME_GROUPS.find(g => g.name === 'Scarlet / Violet');
    expect(sv?.ids).toEqual(['scar', 'vio']);
  });
});
