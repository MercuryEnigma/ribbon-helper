import { describe, expect, it } from 'vitest';
import pokemonData from '../data/pokemon.json';
import gamesData from '../data/games.json';
import { filterPokemonByGames, getAvailableGenerations, getGamesForPokemon } from './utils';
import { getAvailableRibbons } from './ribbonUtils';
import { classifyRibbonCollection } from '../home-merger/ribbonAnalysis';
import { parseHomeOrigin } from '../home-merger/originParser';
import { mapRibbonsGuideOrigin } from '../home-merger/ribbonsGuideExport';
import type { PokemonDatabase } from './types';

const db = pokemonData as PokemonDatabase;
const FRLG_SWITCH_ORIGIN = 'FRLG (Switch)';
const ribbons = (key: string, level = 50) => getAvailableRibbons(key, level, FRLG_SWITCH_ORIGIN, false, db);

describe('FRLG Switch roster and origins', () => {
  it('classifies the Switch releases as Generation 8', () => {
    expect((gamesData as Record<string, { gen?: number }>)['frlg-switch'].gen).toBe(8);
  });

  it('includes native encounters, gifts, breeding, evolutions, and unlocked ticket encounters', () => {
    const roster = filterPokemonByGames(Object.fromEntries(Object.entries(db).filter(([, data]) => data.games)), ['fr-switch', 'lg-switch']).map(p => p.key);
    expect(roster).toHaveLength(215);
    expect(roster).toEqual(expect.arrayContaining([
      'bulbasaur', 'mewtwo', 'togepi', 'pichu', 'politoed', 'scizor',
      'tyrogue', 'hitmontop', 'azurill', 'wynaut', 'lugia', 'ho-oh', 'deoxys',
    ]));
    for (const key of ['mew', 'celebi', 'jirachi', 'treecko', 'chikorita', 'espeon', 'umbreon', 'sylveon', 'raichu-alola']) {
      expect(roster).not.toContain(key);
    }
  });

  it('derives origin options from game availability, like other Switch games', () => {
    expect(getAvailableGenerations(db.pikachu, db, 'pikachu').has(FRLG_SWITCH_ORIGIN)).toBe(true);
    for (const key of ['sylveon', 'annihilape', 'kleavor', 'weezing-galar', 'raichu-alola', 'mew']) {
      expect(getAvailableGenerations(db[key], db, key).has(FRLG_SWITCH_ORIGIN)).toBe(false);
      expect(getGamesForPokemon(db, key)).not.toContain('fr-switch');
    }
  });

});

describe('FRLG Switch ribbon route', () => {
  it('offers Champion before HOME and only modern ribbons afterward', () => {
    const path = ribbons('pikachu');
    expect(path['FRLG (Switch)']?.['last-chance']).toEqual(['champion-ribbon']);
    expect(Object.keys(path)).toEqual(['FRLG (Switch)', 'SwSh', 'BDSP', 'PLA', 'SV']);
    const all = Object.values(path).flatMap(group => group!['available-ribbons']);
    for (const excluded of ['national-ribbon', 'earth-ribbon', 'winning-ribbon', 'victory-ribbon', 'contest-memory-ribbon', 'battle-memory-ribbon']) {
      expect(all).not.toContain(excluded);
    }
  });

  it('uses the current species game availability for an evolved Pokémon', () => {
    const path = ribbons('annihilape');
    expect(path['FRLG (Switch)']).toBeUndefined();
    expect(path.BDSP).toBeUndefined();
    expect(path.SV?.['available-ribbons']).toContain('paldea-champion-ribbon');
  });

  it('does not route other origins through transfer-out-only FRLG Switch', () => {
    for (const origin of ['Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'VC', 'Gen 7', 'GO', 'Switch', 'PLZA']) {
      expect(getAvailableRibbons('pikachu', 50, origin, false, db)['FRLG (Switch)']).toBeUndefined();
    }

    const genSeven = getAvailableRibbons('pikachu', 50, 'Gen 7', false, db);
    const analysis = classifyRibbonCollection(genSeven, []);
    expect([
      ...analysis.stillObtainable,
      ...analysis.missed,
    ].map(ribbon => ribbon.ribbonId)).not.toContain('champion-ribbon');
  });

  it('preserves existing Footprint level restrictions and the voiceless exception', () => {
    expect(ribbons('pikachu', 71).BDSP?.['available-ribbons']).not.toContain('footprint-ribbon');
    expect(ribbons('pikachu', 70).BDSP?.['available-ribbons']).toContain('footprint-ribbon');
    expect(ribbons('magnemite', 100).BDSP?.['available-ribbons']).toContain('footprint-ribbon');
  });

  it('only offers Master Rank in SwSh for FRLG Switch origins', () => {
    const path = ribbons('pikachu');
    expect(path.SwSh?.['available-ribbons']).toContain('master-rank-ribbon');
    expect(path.SwSh?.['first-introduced']).toContain('master-rank-ribbon');
    expect(path.SwSh?.['last-chance'].filter(r => r === 'master-rank-ribbon')).toHaveLength(1);
    for (const category of Object.values(path.SV!)) {
      expect(category).not.toContain('master-rank-ribbon');
    }
    const analysis = classifyRibbonCollection(path, []);
    expect(analysis.stillObtainable.find(r => r.ribbonId === 'master-rank-ribbon')?.gameGroups).toEqual(['SwSh']);
  });

  it('excludes Master Rank for SV-only species with an FRLG Switch origin', () => {
    for (const key of ['hoppip', 'annihilape']) {
      const path = ribbons(key);
      expect(path.SwSh).toBeUndefined();
      expect(path.SV?.['available-ribbons']).toContain('paldea-champion-ribbon');
      expect(Object.values(path).flatMap(group => group!['available-ribbons'])).not.toContain('master-rank-ribbon');
      const analysis = classifyRibbonCollection(path, []);
      expect([...analysis.stillObtainable, ...analysis.missed].map(r => r.ribbonId)).not.toContain('master-rank-ribbon');
    }
  });

  it('keeps SV Master Rank available to other origins, including the original GBA games', () => {
    for (const origin of ['Gen 3', 'Switch']) {
      const path = getAvailableRibbons('pikachu', 50, origin, false, db);
      expect(path.SV?.['available-ribbons']).toContain('master-rank-ribbon');
      expect(path.SwSh?.['last-chance']).not.toContain('master-rank-ribbon');
    }
  });

  it('classifies an absent Champion as missed in HOME, or owned when present', () => {
    const missing = classifyRibbonCollection(ribbons('pikachu'), []);
    expect(missing.missed.map(r => r.ribbonId)).toContain('champion-ribbon');
    expect(missing.stillObtainable.map(r => r.ribbonId)).not.toContain('champion-ribbon');
    const owned = classifyRibbonCollection(ribbons('pikachu'), ['champion-ribbon']);
    expect(owned.owned.map(r => r.ribbonId)).toContain('champion-ribbon');
    expect(owned.missed.map(r => r.ribbonId)).not.toContain('champion-ribbon');
  });
});

describe('FRLG Switch HOME recognition and export', () => {
  it('requires distinguishing evidence and leaves ambiguous text manually correctable', () => {
    expect(parseHomeOrigin('FireRed (Switch)').origin).toBe(FRLG_SWITCH_ORIGIN);
    expect(parseHomeOrigin('a distant land').origin).toBe('Gen 3');
    expect(parseHomeOrigin('the Kanto region').origin).toBe('Switch');
    expect(parseHomeOrigin('Kanto region in the good old days').origin).toBe('VC');
    expect(parseHomeOrigin('FireRed').origin).not.toBe(FRLG_SWITCH_ORIGIN);
  });

  it('exports the verified origin even after a manual correction of ambiguous OCR', () => {
    expect(mapRibbonsGuideOrigin(FRLG_SWITCH_ORIGIN, 'a distant land')).toEqual({ originmark: 'gba', origingame: 'frlg-switch' });
    expect(mapRibbonsGuideOrigin(FRLG_SWITCH_ORIGIN, null)).toEqual({ originmark: 'gba', origingame: 'frlg-switch' });
  });
});
