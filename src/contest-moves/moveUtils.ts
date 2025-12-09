/**
 * Utility functions for processing Pokémon move data from pokemon_moves_rse.json
 */

/** Contest type categories */
export type ContestType = 'cool' | 'beauty' | 'cute' | 'smart' | 'tough';

/** Learn method categories */
export type LearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'purify' | 'pre-evolution';

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
): { egg?: Record<string, string>; 'pre-evolution'?: Record<string, string> } {
  const result: { egg?: Record<string, string>; 'pre-evolution'?: Record<string, string> } = {};

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
 * Contest effect data structure
 */
export interface ContestEffect {
  id: number;
  appeal: number;
  jam: number;
  effect_description: string;
  flavor_text: string;
  star?: number;
}

/**
 * Contest move data structure
 */
export interface ContestMoveData {
  type: ContestType;
  effect: number;
  combos: {
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
