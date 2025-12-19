/**
 * Utility functions for processing Pokémon move data from pokemon_moves_rse.json
 */

/** Contest type categories */
export type ContestType = 'cool' | 'beauty' | 'beautiful' | 'cute' | 'smart' | 'clever' | 'tough';

/** Learn method categories */
export type LearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'purify' | 'pre-evolution' | 'other';

/** Map of moves to their set of learn method strings (e.g., {"rest": Set{"lvl 25", "tm-44"}}) */
export type MovesMap = Record<string, Set<string>>;

/** Map of learn methods to their moves (intermediate format with string values) */
type MovesByMethod = Record<string, string>;

/** Map of learn methods to their moves */
export type AvailableMovesByMethod = Partial<Record<LearnMethod, MovesByMethod>>;

/**
 * Priority order for learn methods when a move can be learned multiple ways.
 * Higher number = higher priority.
 */
export const LEARN_METHOD_PRIORITY: Record<LearnMethod, number> = {
  'tutor': 1,
  'machine': 2,
  'pre-evolution': 3,
  'egg': 4,
  'level-up': 5,
  'purify': 6,
  'other': 99,
};

/**
 * Maps a method key (e.g., "level-up-coefrlgrsxd") to its category (e.g., "level-up")
 */
function categorizeMethodKey(methodKey: string): LearnMethod | null {
  if (methodKey.startsWith('level-up-')) return 'level-up';
  if (methodKey.startsWith('machine-')) return 'machine';
  if (methodKey.startsWith('tutor-')) return 'tutor';
  if (methodKey.startsWith('egg-')) return 'egg';
  if (methodKey.startsWith('light-ball-egg-')) return 'egg';
  if (methodKey.startsWith('purification')) return 'purify';
  return null;
}

/**
 * Extracts all available moves for a Pokémon, organized by learn method.
 * Flattens version-specific data (e.g., "machine-coefrlgrsxd") into general categories.
 *
 * @param pokemonKey The Pokémon identifier (e.g., "vulpix-alola")
 * @param pokemonMoves The pokemon_moves_rse.json data
 * @param pokemonDb The pokemon.json database (optional, for pre-evolution moves)
 * @returns Map of learn methods to their moves with values
 *
 * @example
 * // Returns: {
 * //   "level-up": { "slam": "15", "tail-whip": "6" },
 * //   "machine": { "surf": "hm-03" }
 * // }
 * getAvailableMovesForPokemon("vulpix-alola", pokemonMovesRse)
 */
export function getAvailableMovesForPokemon(
  pokemonKey: string,
  pokemonMoves: Record<string, any>,
  pokemonDb?: Record<string, any>
): AvailableMovesByMethod {
  const pokemonData = pokemonMoves[pokemonKey];
  if (!pokemonData) return {};

  const result: AvailableMovesByMethod = {};

  // Process each version-specific method entry
  for (const [methodKey, entry] of Object.entries<any>(pokemonData)) {
    const category = categorizeMethodKey(methodKey);
    if (!category) continue;

    const moves = entry?.moves;
    if (!moves || typeof moves !== 'object') continue;

    // Initialize category if needed
    if (!result[category]) {
      result[category] = {};
    }

    // Merge moves into the category, preferring existing values to avoid overwriting
    // (earlier version entries take precedence)
    for (const [moveName, value] of Object.entries<string>(moves)) {
      if (!result[category]![moveName]) {
        result[category]![moveName] = value;
      }
    }
  }

  // Process pre-evolution moves if pokemonDb is provided
  if (pokemonDb) {
    const preEvoMoves = getPreEvolutionMoves(pokemonKey, pokemonMoves, pokemonDb, result);
    if (preEvoMoves.egg && Object.keys(preEvoMoves.egg).length > 0) {
      if (!result.egg) result.egg = {};
      Object.assign(result.egg, preEvoMoves.egg);
    }
    if (preEvoMoves.purify && Object.keys(preEvoMoves.purify).length > 0) {
      if (!result.purify) result.purify = {};
      Object.assign(result.purify, preEvoMoves.purify);
    }
    if (preEvoMoves['pre-evolution'] && Object.keys(preEvoMoves['pre-evolution']).length > 0) {
      result['pre-evolution'] = preEvoMoves['pre-evolution'];
    }
  }

  return result;
}

/**
 * Gets moves from pre-evolutions that the current Pokémon doesn't have.
 * Recursively processes the entire evolution chain.
 */
function getPreEvolutionMoves(
  pokemonKey: string,
  pokemonMoves: Record<string, any>,
  pokemonDb: Record<string, any>,
  currentMoves: AvailableMovesByMethod
): { egg?: Record<string, string>; purify?: Record<string, string>; 'pre-evolution'?: Record<string, string> } {
  const result: { egg?: Record<string, string>; purify?: Record<string, string>; 'pre-evolution'?: Record<string, string> } = {};

  const pokemonInfo = pokemonDb[pokemonKey];
  if (!pokemonInfo || !pokemonInfo.evolvesFrom) return result;

  const preEvoKey = pokemonInfo.evolvesFrom;
  const preEvoData = pokemonMoves[preEvoKey];

  // Skip if pre-evolution doesn't have move data
  if (!preEvoData) return result;

  // Get all moves from the pre-evolution
  const preEvoMoves = getAvailableMovesForPokemon(preEvoKey, pokemonMoves, pokemonDb);

  // Check each move in pre-evolution
  for (const [method, moves] of Object.entries(preEvoMoves) as [LearnMethod, Record<string, string>][]) {
    if (!moves) continue;

    for (const [moveName, value] of Object.entries(moves)) {
      // Check if current Pokémon has this move in ANY method
      const currentHasMove = Object.values(currentMoves).some(
        methodMoves => methodMoves && methodMoves[moveName]
      );

      if (!currentHasMove) {
        // If pre-evolution has it as egg move, add as egg
        if (method === 'egg') {
          if (!result.egg) result.egg = {};
          result.egg[moveName] = value;
        } else if (method === 'purify') {
          // If pre-evolution has it as purify move, add as purify
          if (!result.purify) result.purify = {};
          result.purify[moveName] = value;
        } else {
          // Otherwise add as pre-evolution
          if (!result['pre-evolution']) result['pre-evolution'] = {};
          // Use a generic value for pre-evolution moves
          result['pre-evolution'][moveName] = `from ${preEvoKey}`;
        }
      }
    }
  }

  return result;
}

/**
 * Filters available moves based on which learn methods are enabled.
 * Returns a set of all enabled learn method strings for each move.
 *
 * @param availableMoves Map of learn methods to their moves
 * @param enabledMethods Map of learn methods to whether they're enabled
 * @returns Map of move names to sets of learn method strings
 *
 * @example
 * // If machine = false:
 * // Returns: { "slam": Set{"lvl 15"}, "tail-whip": Set{"lvl 6"} }
 * filterAvailableMoves(
 *   { "level-up": { "slam": "15" }, "machine": { "surf": "hm-03" } },
 *   { "level-up": true, "machine": false, ... }
 * )
 *
 * @example
 * // If all enabled and "rest" appears in level-up ("25") and machine ("tm-44"):
 * // Returns: { "rest": Set{"lvl 25", "tm-44"} }
 * filterAvailableMoves(
 *   { "level-up": { "rest": "25" }, "machine": { "rest": "tm-44" } },
 *   { "level-up": true, "machine": true, ... }
 * )
 */
export function filterAvailableMoves(
  availableMoves: AvailableMovesByMethod,
  enabledMethods: Record<LearnMethod, boolean>,
  excludedMoves?: Set<string>
): MovesMap {
  const result: MovesMap = {};

  // Collect all moves from enabled methods
  for (const method of Object.keys(availableMoves) as LearnMethod[]) {
    if (!enabledMethods[method]) continue;

    const moves = availableMoves[method];
    if (!moves) continue;

    for (const [moveName, value] of Object.entries(moves)) {
      // Initialize the Set if this is the first time seeing this move
      if (!result[moveName]) {
        result[moveName] = new Set<string>();
      }

      // Add the formatted learn method string to the Set
      if (method === 'level-up') {
        result[moveName].add(`lvl ${value}`);
      } else {
        result[moveName].add(value);
      }
    }
  }

  // Filter out excluded moves
  if (excludedMoves) {
    for (const move of excludedMoves) {
      delete result[move];
    }
  }

  return result;
}

/**
 * Get which learn methods a specific move belongs to
 */
export function getMoveLearnMethods(
  move: string,
  availableMoves: AvailableMovesByMethod
): LearnMethod[] {
  const methods: LearnMethod[] = [];

  for (const method of Object.keys(availableMoves) as LearnMethod[]) {
    const moves = availableMoves[method];
    if (moves && moves[move]) {
      methods.push(method);
    }
  }

  return methods;
}

/**
 * Get all available moves that have at least one enabled learn method
 */
export function getSelectableMoves(
  availableMoves: AvailableMovesByMethod,
  enabledMethods: Record<LearnMethod, boolean>
): string[] {
  const moves = new Set<string>();

  for (const method of Object.keys(availableMoves) as LearnMethod[]) {
    if (!enabledMethods[method]) continue;

    const methodMoves = availableMoves[method];
    if (methodMoves) {
      Object.keys(methodMoves).forEach(move => moves.add(move));
    }
  }

  return Array.from(moves).sort();
}

/**
 * Calculate learn method filter states (full/partial/none) based on enabled methods and excluded moves
 */
export function getLearnMethodStates(
  availableMoves: AvailableMovesByMethod,
  enabledMethods: Record<LearnMethod, boolean>,
  excludedMoves: Set<string>
): Record<LearnMethod, 'full' | 'partial' | 'none'> {
  const states: Partial<Record<LearnMethod, 'full' | 'partial' | 'none'>> = {};

  for (const method of Object.keys(availableMoves) as LearnMethod[]) {
    const methodMoves = availableMoves[method];
    if (!methodMoves) continue;

    const moveNames = Object.keys(methodMoves);
    if (moveNames.length === 0) continue;

    if (!enabledMethods[method]) {
      states[method] = 'none';
      continue;
    }

    // Count how many moves of this method are excluded
    const excludedCount = moveNames.filter(m => excludedMoves.has(m)).length;

    if (excludedCount === 0) {
      states[method] = 'full';
    } else if (excludedCount === moveNames.length) {
      states[method] = 'none';
    } else {
      states[method] = 'partial';
    }
  }

  return states as Record<LearnMethod, 'full' | 'partial' | 'none'>;
}

/**
 * Map of contest types to their opposite types (RSE/DPPt version).
 * Moves with opposite types get -1 appeal penalty.
 * Note: ORAS has different opposite types due to 'beautiful' and 'clever' categories.
 */
export const OPPOSITE_TYPES: Record<ContestType, ContestType[]> = {
  'cool': ['cute', 'smart', 'clever'],
  'beauty': ['smart', 'clever', 'tough'],
  'beautiful': ['smart', 'clever', 'tough'],
  'cute': ['tough', 'cool'],
  'smart': ['cool', 'beauty', 'beautiful'],
  'clever': ['cool', 'beauty', 'beautiful'],
  'tough': ['beauty', 'beautiful', 'cute'],
};

/**
 * Determines the appeal modifier based on move type vs contest type.
 * @param moveType The type of the move being used
 * @param contestType The contest type (undefined if 'all' was selected)
 * @returns +1 if types match, -1 if opposite, 0 otherwise
 */
export function getTypeAppealModifier(moveType: ContestType, contestType?: ContestType, oppositeTypes: Record<ContestType, ContestType[]> = OPPOSITE_TYPES): number {
  if (!contestType) return 0;
  if (moveType === contestType) return 1;
  if (oppositeTypes[contestType]?.includes(moveType)) return -1;
  return 0;
}

/**
 * Helper function to parse a learn method string and extract priority and level info.
 * @param methodStr A learn method string like "lvl 55", "tm-44", "purify", etc.
 * @returns Object with priority and level (for sorting)
 */
export function parseLearnMethod(methodStr: string): { priority: number; level: number } {
  if (methodStr.startsWith('lvl ')) {
    const level = parseInt(methodStr.substring(4), 10);
    return { priority: LEARN_METHOD_PRIORITY['level-up'], level };
  } else if (methodStr.startsWith('tm-') || methodStr.startsWith('hm-')) {
    return { priority: LEARN_METHOD_PRIORITY['machine'], level: 0 };
  } else if (methodStr === 'tutor') {
    return { priority: LEARN_METHOD_PRIORITY['tutor'], level: 0 };
  } else if (methodStr === 'egg') {
    return { priority: LEARN_METHOD_PRIORITY['egg'], level: 0 };
  } else if (methodStr === 'purify') {
    return { priority: LEARN_METHOD_PRIORITY['purify'], level: 0 };
  } else {
    return { priority: LEARN_METHOD_PRIORITY['other'], level: 0 };
  }
}

/**
 * Generic move info interface for sorting functions
 */
export interface MoveInfoForSorting {
  learnMethods: Set<string>;
}

/**
 * Sorts moves by priority (highest first), then by level (descending for level-up moves).
 * Example: ["refresh" (purify), "hyper-beam" (lvl 55), "tackle" (lvl 5), "rest" (tm-44)]
 */
export function sortMovesByPriority<T extends MoveInfoForSorting>(a: T, b: T): number {
  // Get the highest priority method for each move
  let aHighest = { priority: 0, level: 0 };
  for (const methodStr of a.learnMethods) {
    const parsed = parseLearnMethod(methodStr);
    if (parsed.priority > aHighest.priority ||
        (parsed.priority === aHighest.priority && parsed.level > aHighest.level)) {
      aHighest = parsed;
    }
  }

  let bHighest = { priority: 0, level: 0 };
  for (const methodStr of b.learnMethods) {
    const parsed = parseLearnMethod(methodStr);
    if (parsed.priority > bHighest.priority ||
        (parsed.priority === bHighest.priority && parsed.level > bHighest.level)) {
      bHighest = parsed;
    }
  }

  // Sort by priority (higher first)
  if (aHighest.priority !== bHighest.priority) {
    return bHighest.priority - aHighest.priority;
  }

  // If same priority and both are level-up, sort by level (descending)
  if (aHighest.priority === LEARN_METHOD_PRIORITY['level-up']) {
    return bHighest.level - aHighest.level;
  }

  return 0;
}

/**
 * Finds all eligible combo pairs from available moves.
 * A combo is eligible if both the starter move and finisher move are available.
 * The move listed in combos.before gets the doubled appeal bonus when used after the starter.
 *
 * Example: rest.combos.before = ['snore', 'sleep-talk']
 * This means: rest → snore (snore gets doubled) and rest → sleep-talk (sleep-talk gets doubled)
 *
 * @param availableMoves Map of move names to their learn methods
 * @param contestMovesData The contest moves data with combo information
 * @returns Array of starter/finisher combo pairs
 */
export function findEligibleCombos(
  availableMoves: MovesMap,
  contestMovesData: Record<string, any>
): Array<{ starter: string; finisher: string }> {
  const comboPairs: Array<{ starter: string; finisher: string }> = [];
  const moveNames = Object.keys(availableMoves);
  const moveSet = new Set(moveNames);

  for (const moveName of moveNames) {
    const moveMeta = contestMovesData[moveName];
    if (!moveMeta?.combos?.before) continue;

    // combos.before lists moves that get bonus when used after THIS move
    // So starter = THIS move, finisher = move in combos.before
    for (const comboFinisher of moveMeta.combos.before) {
      if (moveSet.has(comboFinisher)) {
        comboPairs.push({ starter: moveName, finisher: comboFinisher });
      }
    }
  }

  return comboPairs;
}

/**
 * Get other moves that share the same archetype as the given move.
 */
export function getMoveRoleForMove<T extends { move: string; archetype: PropertyKey }>(
  pools: Record<PropertyKey, T[]>,
  move: T
): string[] {
  const pool = (pools as Record<PropertyKey, T[]>)[move.archetype] || [];
  return pool
    .filter(entry => entry.move !== move.move)
    .map(entry => entry.move);
}

/**
 * Contest effect data structure
 */
export interface ContestEffect {
  id: number;
  appeal: number;
  jam: number;
  effect_description?: string;  // Optional: ORAS doesn't have this
  flavor_text: string;
  star?: number;
  repeat?: boolean;  // Optional: ORAS has this for repeatable moves
}

/**
 * Contest move data structure
 */
export interface ContestMoveData {
  type: ContestType;
  effect: number;
  combos?: {  // Optional: ORAS doesn't have combos
    before: string[];
    after: string[];
  };
}

/**
 * Gets the contest effect details for a given move
 * @param moveName The move name (e.g., "tackle")
 * @param contestMovesData The contest moves data (contest_moves_rse.json)
 * @param contestEffectsData The contest effects data (contest_effects_rse.json)
 * @returns The contest effect details, or null if not found
 */
export function getContestEffectForMove(
  moveName: string,
  contestMovesData: Record<string, ContestMoveData>,
  contestEffectsData: Record<string, ContestEffect>
): ContestEffect | null {
  const moveData = contestMovesData[moveName];
  if (!moveData) return null;

  const effectId = moveData.effect.toString();
  const effectData = contestEffectsData[effectId];

  return effectData || null;
}
