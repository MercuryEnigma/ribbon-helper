import contestMoves from '../data/contest_moves_dppt.json';
import contestEffects from '../data/contest_effects_dppt.json';
import {
  MovesMap,
  type ContestType,
  getTypeAppealModifier,
  sortMovesByPriority,
  findEligibleCombos,
  type MoveInfoForSorting
} from './moveUtils';

export interface ContestMove {
  move: string;
  type: ContestType;
  appeal: number;
}

/**
 * Move archetypes categorize contest moves based on their effect patterns.
 * These archetypes help determine optimal move sequences for DPPt Super Contests.
 */
type SuperArchetype =
  | 'SKIPPED'      // Move causes next move to be skipped
  | 'END'          // Move ends the performance early
  | 'LAST'         // Move that works best when used last in order
  | 'FIRST'        // Move that works best when used first in order
  | 'NEXT_FIRST'   // Move that makes next move go first
  | 'NEXT_LAST'    // Move that makes next move go last
  | 'DOUBLE'       // Move that doubles the next turn's appeal
  | 'VOLTAGE_BONUS' // Move that gives +4 appeal if same contest type
  | 'NONE';        // Standard move with no special effect

interface MoveInfo extends MoveInfoForSorting {
  move: string;
  type: ContestType;
  effectId: string;
  effect: any;
  archetype: SuperArchetype;
}

interface SuperContestState {
  guaranteedOrder?: number;    // Previous move's turn order modifier (1=first, 4=last)
  skipNext: boolean;    // Whether this turn should be skipped
  endAll: boolean;      // Whether all future turns should be skipped
  turn: number;         // Current turn number (0-3)
  contestType?: ContestType;  // Contest type for appeal bonuses/penalties (undefined if 'all')
  doubleNext: boolean;  // Whether the next turn's appeal should be doubled
}

const NUMBER_TURNS = 4;

/**
 * Pre-defined contest strategies for optimal 4-move sequences.
 * Each strategy is a pattern of move archetypes that, when executed correctly,
 * maximizes appeal points in DPPt Super Contests.
 */
const STRATEGIES: SuperArchetype[][] = [
  ['FIRST', 'NEXT_FIRST', 'FIRST', 'NONE'],
  ['FIRST', 'NEXT_LAST', 'LAST', 'NONE'],
  ['NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST'],
  ['DOUBLE', 'NONE', 'DOUBLE', 'NONE'],
];

/**
 * Combo pattern templates for testing different combo sequences.
 * Each pattern uses a combination of starter/finisher moves and archetypes.
 *
 * Pattern placeholders:
 * - 'STARTER': The combo starter move
 * - 'FINISHER': The combo finisher move (gets doubled appeal when following starter)
 * - Archetype strings: Any move archetype (e.g., 'FIRST', 'DOUBLE', 'NONE')
 */
type ComboPatternTemplate = Array<'STARTER' | 'FINISHER' | SuperArchetype>;

const COMBO_PATTERNS: ComboPatternTemplate[] = [
  ['STARTER', 'FINISHER', 'STARTER', 'FINISHER'],
  ['NONE', 'STARTER', 'FINISHER', 'NONE'],
  ['FIRST', 'STARTER', 'FINISHER', 'NONE'],
  ['NEXT_LAST', 'STARTER', 'FINISHER', 'NONE'],
  ['DOUBLE', 'STARTER', 'FINISHER', 'NONE'],
];

/**
 * Determines the archetype of a move based on its contest effect.
 * @param effect The effect data from contest_effects_dppt.json
 * @returns The archetype category for the move
 */
function classifyEffect(effect: any): SuperArchetype {
  if (effect?.skip) return 'SKIPPED';
  if (effect?.end) return 'END';
  if (effect?.last) return 'LAST';
  if (effect?.first) return 'FIRST';
  if (effect?.next === 1) return 'NEXT_FIRST';
  if (effect?.next === 4) return 'NEXT_LAST';
  if (effect?.doubles) return 'DOUBLE';
  if (typeof effect?.voltage_bonus === 'number' && effect.voltage_bonus > 0) return 'VOLTAGE_BONUS';
  return 'NONE';
}

/**
 * Organizes available moves into pools by their archetype.
 * This allows the strategy simulator to quickly select moves of the needed type.
 * Within each pool, moves are sorted by type (matching > neutral > opposite), then priority/appeal.
 * @param availableMoves Map of move names to their set of learn methods
 * @param contestType The contest type for type-based sorting (undefined if 'all')
 * @returns Object mapping each archetype to an array of moves with that archetype
 */
function buildMovePools(availableMoves: MovesMap, contestType?: ContestType): Record<SuperArchetype, MoveInfo[]> {
  const pools: Record<SuperArchetype, MoveInfo[]> = {
    SKIPPED: [],
    END: [],
    LAST: [],
    FIRST: [],
    NEXT_FIRST: [],
    NEXT_LAST: [],
    DOUBLE: [],
    VOLTAGE_BONUS: [],
    NONE: [],
  };

  for (const [move, learnMethods] of Object.entries(availableMoves)) {
    const moveMeta = (contestMoves as any)[move];
    if (!moveMeta) continue;

    const effectId = String(moveMeta.effect);
    const effect = (contestEffects as any)[effectId];
    if (!effect) continue;

    const archetype = classifyEffect(effect);
    pools[archetype].push({
      move,
      learnMethods,
      type: moveMeta.type as ContestType,
      effectId,
      effect,
      archetype,
    });
  }

  // Sort each pool
  for (const [archetype, pool] of Object.entries(pools) as [SuperArchetype, MoveInfo[]][]) {
    if (archetype === 'NONE') {
      // For NONE archetype: sort by type modifier, then appeal, then priority/level
      pool.sort((a, b) => {
        // Primary: type modifier (matching > neutral > opposite)
        if (contestType) {
          const modA = getTypeAppealModifier(a.type, contestType);
          const modB = getTypeAppealModifier(b.type, contestType);
          if (modA !== modB) {
            return modB - modA; // Higher modifier first (+1 > 0 > -1)
          }
        }

        // Secondary: base appeal
        const appealA = a.effect?.appeal ?? 0;
        const appealB = b.effect?.appeal ?? 0;
        if (appealA !== appealB) {
          return appealB - appealA; // Higher appeal first
        }

        // Tertiary: priority/level
        return sortMovesByPriority(a, b);
      });
    } else {
      // For specific archetypes: sort by type modifier, then priority/level
      pool.sort((a, b) => {
        // Primary: type modifier (matching > neutral > opposite)
        if (contestType) {
          const modA = getTypeAppealModifier(a.type, contestType);
          const modB = getTypeAppealModifier(b.type, contestType);
          if (modA !== modB) {
            return modB - modA; // Higher modifier first (+1 > 0 > -1)
          }
        }

        // Secondary: priority/level
        return sortMovesByPriority(a, b);
      });
    }
  }

  return pools;
}

/**
 * Calculates the appeal points a move will generate in the current contest state.
 * @param move The move being used
 * @param state Current contest state (turn order, skip status, turn number, double status)
 * @returns Appeal calculation result with next state changes
 */
function computeAppeal(
  move: MoveInfo,
  state: SuperContestState
): { appeal: number; updatedState: SuperContestState } {
  // If this turn is skipped, return zero appeal and clear skip flag
  if (state.skipNext || state.endAll) {
    return {
      appeal: 0,
      updatedState: {
        guaranteedOrder: undefined,
        skipNext: false,
        endAll: state.endAll,
        turn: state.turn + 1,
        contestType: state.contestType,
        doubleNext: false,
      }
    };
  }

  const effect = move.effect || {};
  let appeal = effect.appeal ?? 0;

  // First-order moves get 4 appeal if going first (not 6 like RSE)
  if (effect.first && (state.turn === 0 || state.guaranteedOrder === 1)) {
    appeal = 4;
  }

  // Last-order moves get 4 appeal if going last (not 6 like RSE)
  if (effect.last && state.guaranteedOrder === 4) {
    appeal = 4;
  }

  // Voltage bonus: gives +4 appeal if same contest type (not "all")
  if (move.archetype === 'VOLTAGE_BONUS' && state.contestType && move.type === state.contestType) {
    appeal = 4;
  }

  // Contest type bonus/penalty
  appeal += getTypeAppealModifier(move.type, state.contestType);

  // Double appeal if previous move set doubleNext flag
  if (state.doubleNext) {
    appeal *= 2;
  }

  const nextOrder = typeof effect.next === 'number' ? effect.next : undefined;
  const skipNext = !!effect.skip;
  const end = !!effect.end;
  const doubleNext = !!effect.doubles;

  const updatedState: SuperContestState = {
    guaranteedOrder: nextOrder,
    skipNext,
    endAll: end,
    turn: state.turn + 1,
    contestType: state.contestType,
    doubleNext,
  };

  return { appeal, updatedState };
}

/**
 * Selects the best move from the pools based on the desired archetype or current state.
 * @param pools Available moves organized by archetype
 * @param desired The archetype requested by the strategy, or 'NONE' for free choice
 * @param state Current contest state
 * @param prevMove The move used in the previous turn (to avoid repetition)
 * @returns The selected move, or null if no suitable move is available
 */
function chooseMoveFromPool(
  pools: Record<SuperArchetype, MoveInfo[]>,
  desired: SuperArchetype | 'NONE',
  state: SuperContestState,
  prevMove?: MoveInfo
): MoveInfo | null {
  // If a specific archetype is requested, use the first available move of that type
  if (desired !== 'NONE') {
    const pool = pools[desired];
    if (pool.length === 0) return null;

    // Must avoid using the same move twice in a row (hard constraint)
    if (prevMove && pool[0].move === prevMove.move) {
      if (pool.length < 2) return null;
      return pool[1];
    }

    return pool[0];
  }

  // For free choice: pick the move that maximizes immediate appeal
  // Avoid repeating moves and END moves
  let best: { move: MoveInfo; appeal: number } | null = null;

  for (const [archKey, list] of Object.entries(pools) as [SuperArchetype, MoveInfo[]][]) {
    if (list.length === 0) continue;
    // Never use END or SKIPPED moves if it isn't the last turn
    if ((archKey === 'END' || archKey === 'SKIPPED')
      && state.turn < NUMBER_TURNS - 1) continue;

    const candidate1 = list[0];
    // Hard constraint: cannot use same move twice in a row
    if (prevMove && candidate1.move === prevMove.move) {
      if (list.length < 2) continue;
      const candidate2 = list[1];
      const simulated2 = computeAppeal(candidate2, state).appeal;
      if (!best || simulated2 > best.appeal) {
        best = { move: candidate2, appeal: simulated2 };
      }
      continue;
    }

    const simulated1 = computeAppeal(candidate1, state).appeal;
    if (!best || simulated1 > best.appeal) {
      best = { move: candidate1, appeal: simulated1 };
    }

    if (list.length < 2) continue;
    const candidate2 = list[1];
    if (prevMove && candidate2.move === prevMove.move) continue;
    const simulated2 = computeAppeal(candidate2, state).appeal;
    if (!best || simulated2 > best.appeal) {
      best = { move: candidate2, appeal: simulated2 };
    }
  }

  return best ? best.move : null;
}

/**
 * Simulates a complete 4-turn contest performance using a specific strategy.
 * @param pools Available moves organized by archetype
 * @param strategy The sequence of archetypes to use (defines move selection pattern)
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Total appeal and move sequence, or null if strategy cannot be executed
 */
function simulateStrategy(
  pools: Record<SuperArchetype, MoveInfo[]>,
  strategy: (SuperArchetype | 'NONE')[],
  contestType?: ContestType
): { total: number; sequence: ContestMove[] } | null {
  // Create working copies of pools to track usage during simulation
  const workingPools: Record<SuperArchetype, MoveInfo[]> = {
    SKIPPED: [...pools.SKIPPED],
    END: [...pools.END],
    LAST: [...pools.LAST],
    FIRST: [...pools.FIRST],
    NEXT_FIRST: [...pools.NEXT_FIRST],
    NEXT_LAST: [...pools.NEXT_LAST],
    DOUBLE: [...pools.DOUBLE],
    VOLTAGE_BONUS: [...pools.VOLTAGE_BONUS],
    NONE: [...pools.NONE],
  };

  let state: SuperContestState = {
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType,
    doubleNext: false,
  };
  let total = 0;
  const chosen: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;

  // Execute each turn of the strategy
  for (let i = 0; i < strategy.length; i++) {
    const desired = strategy[i];
    const move = chooseMoveFromPool(workingPools, desired as SuperArchetype, state, prevMove);

    // Strategy fails if required move type is unavailable
    if (!move) return null;

    // Hard constraint: cannot use the same move twice in a row
    if (prevMove && move.move === prevMove.move) return null;

    // Check if we already have 4 unique moves and this move is not one of them
    const uniqueMoves = new Set(chosen.map(m => m.move));
    if (uniqueMoves.size === 4 && !uniqueMoves.has(move.move)) {
      return null;
    }

    // Calculate appeal and update contest state
    const outcome = computeAppeal(move, state);
    const appeal = outcome.appeal;

    total += appeal;
    state = { ...outcome.updatedState };
    prevMove = move;

    chosen.push({
      move: move.move,
      type: move.type,
      appeal: appeal,
    });
  }

  return { total, sequence: chosen };
}

function getBestPresetStrategy(
  pools: Record<SuperArchetype, MoveInfo[]>,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } | null {
  let best: { total: number; seq: ContestMove[] } | null = null;

  // Test each strategy and keep the one with highest total appeal
  for (const strategy of STRATEGIES) {
    // Quick check: skip strategies that require unavailable archetypes
    const needed = new Set(strategy.filter(s => s !== 'NONE') as SuperArchetype[]);
    let valid = true;
    needed.forEach(arch => {
      if (pools[arch].length === 0) valid = false;
    });
    if (!valid) continue;

    const result = simulateStrategy(pools, strategy, contestType);
    if (!result) continue;

    if (!best || result.total > best.total) {
      best = { total: result.total, seq: result.sequence };
    }
  }
  return best;
}

/**
 * Simulates a single combo pattern and calculates total appeal.
 * @param pools Available moves organized by archetype
 * @param starterMove The combo starter move
 * @param finisherMove The combo finisher move (gets doubled appeal when following starter)
 * @param pattern The sequence pattern to test
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Total appeal and move sequence, or null if pattern cannot be executed
 */
function simulateSingleComboPattern(
  pools: Record<SuperArchetype, MoveInfo[]>,
  starterMove: MoveInfo,
  finisherMove: MoveInfo,
  pattern: ComboPatternTemplate,
  contestType?: ContestType
): { total: number; sequence: ContestMove[] } | null {
  const workingPools: Record<SuperArchetype, MoveInfo[]> = {
    SKIPPED: [...pools.SKIPPED],
    END: [...pools.END],
    LAST: [...pools.LAST],
    FIRST: [...pools.FIRST],
    NEXT_FIRST: [...pools.NEXT_FIRST],
    NEXT_LAST: [...pools.NEXT_LAST],
    DOUBLE: [...pools.DOUBLE],
    VOLTAGE_BONUS: [...pools.VOLTAGE_BONUS],
    NONE: [...pools.NONE],
  };

  let state: SuperContestState = {
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType,
    doubleNext: false,
  };
  let total = 0;
  const chosen: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;
  let hadComboLastTurn = false;

  // Convert pattern template to actual moves/archetypes
  const resolvedPattern: (MoveInfo | SuperArchetype)[] = pattern.map(slot => {
    if (slot === 'STARTER') return starterMove;
    if (slot === 'FINISHER') return finisherMove;
    return slot as SuperArchetype;
  });

  for (let i = 0; i < NUMBER_TURNS; i++) {
    const desiredMove = resolvedPattern[i];
    let move: MoveInfo | null;

    if (typeof desiredMove === 'string') {
      // Choose best move of archetype
      move = chooseMoveFromPool(workingPools, desiredMove, state, prevMove);
      if (!move) return null;
    } else {
      move = desiredMove;
    }

    // Hard constraint: cannot use the same move twice in a row
    if (prevMove && move.move === prevMove.move) return null;

    // Calculate base appeal
    const outcome = computeAppeal(move, state);
    let appeal = outcome.appeal;

    // Apply combo bonus: double appeal if this is a finisher following a starter
    // BUT not if the previous turn also had a combo bonus
    const isComboFinisher = move.move === finisherMove.move
      && prevMove?.move === starterMove.move;
    if (isComboFinisher && !hadComboLastTurn) {
      appeal *= 2;
      hadComboLastTurn = true;
    } else {
      hadComboLastTurn = false;
    }

    total += appeal;
    state = { ...outcome.updatedState };
    prevMove = move;

    chosen.push({
      move: move.move,
      type: move.type,
      appeal: appeal,
    });
  }

  return { total, sequence: chosen };
}

/**
 * Simulates all combo patterns and returns the one with highest total appeal.
 * Tests different sequence variations to find the optimal combo strategy.
 */
function simulateComboStrategy(
  pools: Record<SuperArchetype, MoveInfo[]>,
  starterMove: MoveInfo,
  finisherMove: MoveInfo,
  contestType?: ContestType
): { total: number; sequence: ContestMove[] } | null {
  let best: { total: number; sequence: ContestMove[] } | null = null;

  for (const pattern of COMBO_PATTERNS) {
    const result = simulateSingleComboPattern(pools, starterMove, finisherMove, pattern, contestType);
    if (!result) continue;

    if (!best || result.total > best.total) {
      best = result;
    }
  }

  return best;
}

/**
 * Tests all possible combo pairs to find the one with highest total appeal.
 */
function getBestCombo(
  pools: Record<SuperArchetype, MoveInfo[]>,
  availableMoves: MovesMap,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } | null {
  const comboPairs = findEligibleCombos(availableMoves, contestMoves);
  if (comboPairs.length === 0) return null;

  let best: { total: number; seq: ContestMove[] } | null = null;

  // Create a quick lookup for MoveInfo by move name
  const moveInfoMap = new Map<string, MoveInfo>();
  for (const pool of Object.values(pools)) {
    for (const moveInfo of pool) {
      moveInfoMap.set(moveInfo.move, moveInfo);
    }
  }

  for (const combo of comboPairs) {
    const starterInfo = moveInfoMap.get(combo.starter);
    const finisherInfo = moveInfoMap.get(combo.finisher);

    if (!starterInfo || !finisherInfo) continue;

    const result = simulateComboStrategy(pools, starterInfo, finisherInfo, contestType);
    if (!result) continue;

    if (!best || result.total > best.total) {
      best = { total: result.total, seq: result.sequence };
    }
  }

  return best;
}

/**
 * Greedy fallback strategy that picks moves with highest appeal.
 * Sorts moves by base appeal plus contest type modifier, then selects top moves
 * while avoiding skip/end moves (except on last turn) and same move repetitions.
 * @param pools Available moves organized by archetype
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Total and sequence of 4 contest moves, or empty array if no moves available
 */
function getGreedyAttempt(
  pools: Record<SuperArchetype, MoveInfo[]>,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } {
  // Get all available moves
  const allMoves = Object.values(pools).flat();
  if (allMoves.length === 0) return { total: 0, seq: [] };

  // Sort by base appeal + type modifier (descending)
  allMoves.sort((a, b) => {
    const appealA = (a.effect?.appeal ?? 0) + getTypeAppealModifier(a.type, contestType);
    const appealB = (b.effect?.appeal ?? 0) + getTypeAppealModifier(b.type, contestType);
    return appealB - appealA;
  });

  let state: SuperContestState = {
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType,
    doubleNext: false,
  };
  let total: number = 0;
  const greedyStrat: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;

  for (let i = 0; i < NUMBER_TURNS; i++) {
    let bestMove: MoveInfo | null = null;
    for (const move of allMoves) {
      // Hard constraint: cannot use same move twice in a row
      if (prevMove && move.move === prevMove.move) continue;
      if (!move.effect?.skip && !move.effect?.end) {
        bestMove = move;
        break;
      }
      if (i === NUMBER_TURNS - 1) {
        bestMove = move;
        break;
      }
    }

    if (bestMove) {
      const outcome = computeAppeal(bestMove, state);
      const appeal = outcome.appeal;

      total += appeal;
      state = { ...outcome.updatedState };
      prevMove = bestMove;

      greedyStrat.push({
        move: bestMove.move,
        type: bestMove.type,
        appeal: appeal,
      });
    }
  }
  return { total, seq: greedyStrat };
}

/**
 * Computes the optimal 4-move sequence for DPPt Super Contests.
 * Tries multiple pre-defined strategies and returns the one with highest total appeal.
 * @param availableMoves Map of move names to their learn methods
 * @param contestType The contest type filter
 * @returns Array of 4 contest moves with their types and appeal values
 */
export function getSuperContestOptimalMoves(
  availableMoves: MovesMap,
  contestType: ContestType | 'all'
): ContestMove[] {
  // If Pokemon only has 1 move, they are not eligible for super contests
  const moveCount = Object.keys(availableMoves).length;
  if (moveCount <= 1) {
    return [];
  }

  const actualContestType = contestType === 'all' ? undefined : contestType;
  const pools = buildMovePools(availableMoves, actualContestType);

  let best: { total: number; seq: ContestMove[] } | null = null;

  // Test several preset strategies
  const bestStrategy = getBestPresetStrategy(pools, actualContestType);
  best = bestStrategy;

  // Test combo strategies and use if better than preset strategies
  const bestCombo = getBestCombo(pools, availableMoves, actualContestType);
  if (bestCombo && (!best || bestCombo.total > best.total)) {
    best = bestCombo;
  }

  // Fallback: if no strategy works, use greedy approach
  const greedy = getGreedyAttempt(pools, actualContestType);
  if (!best || greedy.total > best.total) {
    best = greedy;
  }

  return best.seq;
}
