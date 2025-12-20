import type { PokemonDatabase } from './types';
import ribbonsData from '../data/ribbons.json';

export interface RibbonsByGame {
  'available-ribbons': string[];
  'first-introduced': string[];
  'last-chance': string[];
  'again': string[];
}

export type RibbonsMap = {
  [key in 'Colo/XD' | 'RSE' | 'DPPt' | 'HGSS' | 'Transfer' | 'XY' | 'ORAS' | 'SM / USUM' | 'SwSh' | 'BDSP' | 'PLA' | 'SV' | 'PLZA']?: RibbonsByGame;
};

const MEMORY_RIBBONS = ['battle-memory-ribbon', 'battle-memory-ribbon-gold', 'contest-memory-ribbon', 'contest-memory-ribbon-gold'];
export type MERGE_TYPES = 'battle' | 'contest';

// Game groupings
const GAME_GROUPS: Record<string, string[]> = {
  'Colo/XD': ['colosseum', 'xd'],
  'RSE': ['ruby', 'sapphire', 'emerald'],
  'DPPt': ['diamond', 'pearl', 'platinum'],
  'HGSS': ['hg', 'ss'],
  'Transfer': [],
  'XY': ['x', 'y'],
  'ORAS': ['or', 'as'],
  'SM / USUM': ['sun', 'moon', 'usun', 'umoon'],
  'SwSh': ['swh', 'sh'],
  'BDSP': ['bd', 'sp'],
  'PLA': ['pla'],
  'SV': ['scar', 'vio'],
  'PLZA': ['plza']
};

// Generation to games mapping
const GENERATION_GAMES: Record<string, string[]> = {
  'Gen 3': ['ruby', 'sapphire', 'emerald', 'colosseum', 'xd'],
  'Gen 4': ['diamond', 'pearl', 'platinum', 'hg', 'ss'],
  'Gen 5': ['black', 'white', 'black2', 'white2'], // No ribbons but can get later generation ribbons
  'Gen 6': ['x', 'y', 'or', 'as'],
  'VC': [], // No ribbons but can get later generation ribbons
  'Gen 7': ['sun', 'moon', 'usun', 'umoon'],
  'GO': ['swh', 'sh', 'bd', 'sp', 'pla', 'scar', 'vio'], // GO Pokemon can access Switch games
  'Switch': ['swh', 'sh', 'bd', 'sp', 'pla', 'scar', 'vio'],
  'PLZA': ['plza']
};

// Generation order for "moving up"
const GENERATION_ORDER = ['Gen 3', 'Gen 4', 'Gen 5', 'Gen 6', 'VC', 'Gen 7', 'GO', 'Switch', 'PLZA'];

// Game group generation
const GAME_GROUP_GENERATION: Record<string, number> = {
  'Colo/XD': 3,
  'RSE': 3,
  'DPPt': 4,
  'HGSS': 4,
  'Transfer': 5,
  'XY': 6,
  'ORAS': 6,
  'SM / USUM': 7,
  'SwSh': 8,
  'BDSP': 8,
  'PLA': 8,
  'SV': 9
};

interface RibbonData {
  gen: number;
  merge?: MERGE_TYPES;
  available: string[] | null;
  banned?: string[];
  bannedBDSP?: string[];
  nomythical?: boolean;
  nomythicalBDSP?: boolean;
  [key: string]: any;
}

/**
 * Checks if a Pokemon can access a specific game
 */
function canAccessGame(pokemonKey: string, game: string, pokemonDb: PokemonDatabase): boolean {
  const pokemonData = pokemonDb[pokemonKey];
  if (!pokemonData) return false;

  // Check if pokemon has the game in its game list
  if (pokemonData.games && pokemonData.games.includes(game)) {
    return true;
  }

  return false;
}

/**
 * Checks if Pokemon can access any game in a group
 */
function canAccessGameGroup(pokemonKey: string, games: string[], pokemonDb: PokemonDatabase): boolean {
  return games.some(game => canAccessGame(pokemonKey, game, pokemonDb));
}

/**
 * Gets the starting generation index
 */
function getStartingGenerationIndex(generation: string): number {
  const index = GENERATION_ORDER.indexOf(generation);
  return index === -1 ? 0 : index;
}

/**
 * Checks if Pokemon can obtain a specific ribbon
 */
function canObtainRibbon(
  pokemonKey: string,
  ribbonKey: string,
  ribbonData: RibbonData,
  level: number,
  startGenIndex: number,
  isShadow: boolean,
  pokemonDb: PokemonDatabase,
  gameGroup?: string
): boolean {
  // Check if Pokemon can access any of the games where the ribbon is available
  if (!ribbonData.available || ribbonData.available.length === 0) {
    return false;
  }

  const canAccess = ribbonData.available.some(game =>
    canAccessGame(pokemonKey, game, pokemonDb)
  );

  if (!canAccess) {
    return false;
  }

  // Check generation requirement - Pokemon can only move up in generations
  // A ribbon is accessible if it's available in ANY game from the starting generation or later
  const ribbonGen = ribbonData.gen;
  const hasAccessibleGame = GENERATION_ORDER.slice(startGenIndex).some(gen => {
    const games = GENERATION_GAMES[gen];
    return ribbonData.available !== null && ribbonData.available.some(game => games.includes(game));
  });

  if (!hasAccessibleGame) {
    return false;
  }

  // Check if Pokemon is banned for this ribbon
  if (ribbonData.banned && ribbonData.banned.includes(pokemonKey)) {
    return false;
  }

  // Check game-specific banned lists
  if (gameGroup === 'BDSP' && ribbonData.bannedBDSP && ribbonData.bannedBDSP.includes(pokemonKey)) {
    return false;
  }

  // Check if mythical Pokemon are banned
  const pokemonData = pokemonDb[pokemonKey];
  if (ribbonData.nomythical && pokemonData?.mythical) {
    return false;
  }

  // Check game-specific mythical restrictions
  if (gameGroup === 'BDSP' && ribbonData.nomythicalBDSP && pokemonData?.mythical) {
    return false;
  }

  // Special ribbon requirements
  if (ribbonKey === 'national-ribbon' && !isShadow) {
    return false;
  }

  if (ribbonKey === 'winning-ribbon' && level > 50) {
    return false;
  }

  if (ribbonKey === 'footprint-ribbon') {
    // In BDSP specifically, level must be 70 or lower
    // Exception: voiceless Pokemon can always get it
    if (gameGroup === 'BDSP' && !pokemonData?.voiceless && level > 70) {
      return false;
    }
  }

  return true;
}

/**
 * Gets available ribbons for a Pokemon
 */
export function getAvailableRibbons(
  pokemonKey: string,
  level: number,
  generation: string,
  isShadow: boolean,
  pokemonDb: PokemonDatabase
): RibbonsMap {
  const result: RibbonsMap = {};
  const startGenIndex = getStartingGenerationIndex(generation);

  let merged_ribbons: Record<MERGE_TYPES, number> = {"battle": 0, "contest": 0};

  // Track which ribbons were previously available to determine "again" status
  const ribbonFirstAppearance: Map<string, string> = new Map();

  // Process each game group in generation order
  const sortedGroups = Object.keys(GAME_GROUPS).sort((a, b) => {
    return GAME_GROUP_GENERATION[a] - GAME_GROUP_GENERATION[b];
  });

  for (const groupName of sortedGroups) {
    if (groupName === 'Transfer') {
      const memoryRibbons: string[] = [];
      if (merged_ribbons['battle'] >= 7) {
        memoryRibbons.push('battle-memory-ribbon-gold');
      } else if (merged_ribbons['battle'] > 1) {
        memoryRibbons.push('battle-memory-ribbon');
      }

      if (merged_ribbons['contest'] >= 40) {
        memoryRibbons.push('contest-memory-ribbon-gold');
      } else if (merged_ribbons['contest'] > 1) {
        memoryRibbons.push('contest-memory-ribbon');
      }

      if (memoryRibbons.length > 0) {
        result[groupName as keyof RibbonsMap] = {
          'available-ribbons': memoryRibbons,
          'first-introduced': memoryRibbons,
          'last-chance': [],
          'again': []
        };
      }
    }
    const games = GAME_GROUPS[groupName];

    // Check if Pokemon can access this game group
    if (!canAccessGameGroup(pokemonKey, games, pokemonDb)) {
      continue;
    }

    // Special case: Spinda cannot transfer to BDSP unless starting from Switch generation
    if (pokemonKey === 'spinda' && groupName === 'BDSP' && generation !== 'Switch') {
      continue;
    }

    // Check if this game group is accessible from the starting generation
    // Use findLastIndex to prefer the most recent generation (e.g., Switch over GO for SwSh games)
    const groupGenIndex = GENERATION_ORDER.findLastIndex(gen => {
      const genGames = GENERATION_GAMES[gen];
      return games.some(game => genGames.includes(game));
    });

    if (groupGenIndex < startGenIndex) {
      continue;
    }

    const availableRibbons: string[] = [];
    const firstIntroduced: string[] = [];
    const lastChance: string[] = [];
    const again: string[] = [];

    // Check each ribbon
    for (const [ribbonKey, ribbonData] of Object.entries(ribbonsData as Record<string, RibbonData>)) {
      // Check if ribbon is available in this game group
      const availableInGroup = ribbonData.available?.some(game => games.includes(game));
      if (!availableInGroup) {
        continue;
      }

      if (MEMORY_RIBBONS.includes(ribbonKey)) {
        continue;
      }

      // Check if Pokemon can obtain this ribbon
      if (!canObtainRibbon(pokemonKey, ribbonKey, ribbonData, level, startGenIndex, isShadow, pokemonDb, groupName)) {
        continue;
      }

      if (ribbonData.merge) {
        merged_ribbons[ribbonData.merge] += 1;
      }

      availableRibbons.push(ribbonKey);

      // Check if this is the first appearance of the ribbon
      if (!ribbonFirstAppearance.has(ribbonKey)) {
        ribbonFirstAppearance.set(ribbonKey, groupName);
        firstIntroduced.push(ribbonKey);
      } else {
        // This is not the first appearance, so it's "again"
        again.push(ribbonKey);
      }

      // Check if this is the last chance to get this ribbon
      // A ribbon is "last chance" if it's not available in any later accessible game groups
      let isLastChance = true;
      for (let i = sortedGroups.indexOf(groupName) + 1; i < sortedGroups.length; i++) {
        const laterGroup = sortedGroups[i];
        const laterGames = GAME_GROUPS[laterGroup];

        // Check if Pokemon can access the later group
        if (!canAccessGameGroup(pokemonKey, laterGames, pokemonDb)) {
          continue;
        }

        // Check if ribbon is available in the later group
        const availableInLaterGroup = ribbonData.available?.some(game => laterGames.includes(game));
        if (availableInLaterGroup) {
          // Check if Pokemon can still obtain it in the later group
          if (canObtainRibbon(pokemonKey, ribbonKey, ribbonData, level, startGenIndex, isShadow, pokemonDb, laterGroup)) {
            isLastChance = false;
            break;
          }
        }
      }

      if (isLastChance) {
        lastChance.push(ribbonKey);
      }
    }

    if (availableRibbons.length > 0) {
      result[groupName as keyof RibbonsMap] = {
        'available-ribbons': availableRibbons,
        'first-introduced': firstIntroduced,
        'last-chance': lastChance,
        'again': again
      };
    }
  }

  return result;
}
