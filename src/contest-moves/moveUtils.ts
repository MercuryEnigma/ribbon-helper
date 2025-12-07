/**
 * Utility functions for processing Pokémon move data from pokemon_moves_rse.json
 */

/** Learn method categories */
export type LearnMethod = 'level-up' | 'machine' | 'tutor' | 'egg' | 'purify' | 'other';

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
  'egg': 3,
  'level-up': 4,
  'other': 5,
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
  if (methodKey.startsWith('purification')) return 'purify';
  if (methodKey.startsWith('light-ball-egg-')) return 'other';
  return null;
}

/**
 * Extracts all available moves for a Pokémon, organized by learn method.
 * Flattens version-specific data (e.g., "machine-coefrlgrsxd") into general categories.
 *
 * @param pokemonKey The Pokémon identifier (e.g., "vulpix-alola")
 * @param pokemonMoves The pokemon_moves_rse.json data
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
  pokemonMoves: Record<string, any>
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
  enabledMethods: Record<LearnMethod, boolean>
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

  return result;
}
