import contestMoves from '../data/contest_moves_dppt.json';
import contestEffects from '../data/contest_effects_dppt.json';
import {
  MovesMap,
  type ContestType,
  OPPOSITE_TYPES,
  sortMovesByPriority,
  getMoveRoleForMove,
  type MoveInfoForSorting
} from './moveUtils';

export interface ContestMove {
  move: string;
  type: ContestType;
  appeal: number;
  move_role: string[];
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
  | 'VOLTAGE_BONUS' // Move that gives bonus appeal if Judge Voltage goes up
  | 'REPEAT'       // Move that can be repeated up to 2 times consecutively
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
  contestType?: ContestType;  // Contest type for Judge Voltage move effects (undefined if 'all')
  doubleNext: boolean;  // Whether the next turn's appeal should be doubled
  consecutiveUses: number;  // Number of times the current move has been used consecutively
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
  if (effect?.repeat) return 'REPEAT';
  return 'NONE';
}

/**
 * Organizes available moves into pools by their archetype.
 * This allows the strategy simulator to quickly select moves of the needed type.
 * Within each pool, moves are sorted by their DPPt appeal, then priority/level.
 * @param availableMoves Map of move names to their set of learn methods
 * @param contestType The contest type for move effects that depend on Judge Voltage (undefined if 'all')
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
    REPEAT: [],
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

  // Sort each pool: highest DPPt appeal first, then moves that keep the
  // Judge's Voltage down, then priority/level.
  for (const pool of Object.values(pools)) {
    pool.sort((a, b) => {
      const appealA = getBaseAppeal(a, contestType);
      const appealB = getBaseAppeal(b, contestType);
      if (appealA !== appealB) {
        return appealB - appealA; // Higher appeal first
      }

      const voltageA = getVoltageChange(a.type, contestType);
      const voltageB = getVoltageChange(b.type, contestType);
      if (voltageA !== voltageB) {
        return voltageA - voltageB; // Lower Voltage impact first
      }

      return sortMovesByPriority(a, b);
    });
  }

  return pools;
}

/**
 * How a move shifts the Judge's Voltage: +1 if the move's type matches the
 * contest, -1 if it is an opposite type, 0 otherwise. Raising the Voltage
 * earns no hearts by itself (only moves with an explicit Voltage effect
 * benefit), and any contestant can claim the jackpot when the meter fills,
 * so on equal appeal off-type moves are preferred to suppress the meter.
 */
function getVoltageChange(moveType: ContestType, contestType?: ContestType): number {
  if (!contestType) return 0;
  if (moveType === contestType) return 1;
  if (OPPOSITE_TYPES[contestType]?.includes(moveType)) return -1;
  return 0;
}

function getBaseAppeal(move: MoveInfo, contestType?: ContestType): number {
  const effect = move.effect || {};
  let appeal = effect.appeal ?? 0;

  if (
    typeof effect.voltage_bonus === 'number' &&
    contestType &&
    move.type === contestType
  ) {
    appeal += effect.voltage_bonus;
  }

  return appeal;
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
        consecutiveUses: 0,
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

  // Some DPPt moves earn extra appeal when their move type raises Judge Voltage.
  if (move.archetype === 'VOLTAGE_BONUS' && state.contestType && move.type === state.contestType) {
    appeal += effect.voltage_bonus ?? 0;
  }

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
    consecutiveUses: 0,  // Will be updated by caller if same move is used
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

    // Check repetition constraints based on REPEAT archetype
    if (prevMove && pool[0].move === prevMove.move) {
      if (pool[0].archetype !== 'REPEAT' || state.consecutiveUses >= 2) {
        // Cannot use this move, try the second one
        if (pool.length < 2) return null;
        return pool[1];
      }
    }

    return pool[0];
  }

  // For free choice: pick the move that maximizes immediate appeal,
  // preferring lower Voltage impact on ties.
  // Avoid repeating moves and END moves
  let best: { move: MoveInfo; appeal: number } | null = null;

  const consider = (candidate: MoveInfo) => {
    const simulated = computeAppeal(candidate, state).appeal;
    if (
      !best ||
      simulated > best.appeal ||
      (simulated === best.appeal &&
        getVoltageChange(candidate.type, state.contestType) <
          getVoltageChange(best.move.type, state.contestType))
    ) {
      best = { move: candidate, appeal: simulated };
    }
  };

  for (const [archKey, list] of Object.entries(pools) as [SuperArchetype, MoveInfo[]][]) {
    if (list.length === 0) continue;
    // Never use END or SKIPPED moves if it isn't the last turn
    if ((archKey === 'END' || archKey === 'SKIPPED')
      && state.turn < NUMBER_TURNS - 1) continue;

    const candidate1 = list[0];
    // Check repetition constraints based on REPEAT archetype
    if (prevMove && candidate1.move === prevMove.move) {
      if (candidate1.archetype !== 'REPEAT' || state.consecutiveUses >= 2) {
        // Cannot use candidate1, try candidate2
        if (list.length < 2) continue;
        consider(list[1]);
        continue;
      }
    }

    consider(candidate1);

    if (list.length < 2) continue;
    const candidate2 = list[1];
    // Check repetition constraints for candidate2
    if (prevMove && candidate2.move === prevMove.move) {
      if (candidate2.archetype !== 'REPEAT' || state.consecutiveUses >= 2) {
        continue;
      }
    }
    consider(candidate2);
  }

  return best ? best.move : null;
}

/**
 * Simulates a complete 4-turn contest performance using a specific strategy.
 * @param pools Available moves organized by archetype
 * @param strategy The sequence of archetypes to use (defines move selection pattern)
 * @param contestType The contest type for move effects that depend on Judge Voltage (undefined if 'all')
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
    REPEAT: [...pools.REPEAT],
    NONE: [...pools.NONE],
  };

  let state: SuperContestState = {
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType,
    doubleNext: false,
    consecutiveUses: 0,
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

    // Check repetition constraints based on REPEAT archetype
    // Without REPEAT: cannot use same move twice in a row
    // With REPEAT: can use up to 2 times in a row (but not 3)
    if (prevMove && move.move === prevMove.move) {
      if (move.archetype !== 'REPEAT' || state.consecutiveUses >= 2) {
        return null;
      }
    }

    // Check if we already have 4 unique moves and this move is not one of them
    const uniqueMoves = new Set(chosen.map(m => m.move));
    if (uniqueMoves.size === 4 && !uniqueMoves.has(move.move)) {
      return null;
    }

    // Calculate appeal and update contest state
    const outcome = computeAppeal(move, state);
    const appeal = outcome.appeal;

    total += appeal;
    const nextConsecutiveUses = (prevMove && move.move === prevMove.move) ? state.consecutiveUses + 1 : 1;
    state = { ...outcome.updatedState, consecutiveUses: nextConsecutiveUses };
    prevMove = move;

    const move_role = getMoveRoleForMove(workingPools, move);

    chosen.push({
      move: move.move,
      type: move.type,
      appeal: appeal,
      move_role,
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
 * Greedy fallback strategy that picks moves with highest appeal.
 * Sorts moves by DPPt appeal, then selects top moves
 * while avoiding skip/end moves (except on last turn) and same move repetitions.
 * @param pools Available moves organized by archetype
 * @param contestType The contest type for move effects that depend on Judge Voltage (undefined if 'all')
 * @returns Total and sequence of 4 contest moves, or empty array if no moves available
 */
function getGreedyAttempt(
  pools: Record<SuperArchetype, MoveInfo[]>,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } {
  // Get all available moves
  const allMoves = Object.values(pools).flat();
  if (allMoves.length === 0) return { total: 0, seq: [] };

  // Sort by base appeal plus explicit move effects (descending), preferring
  // moves that keep the Judge's Voltage down on ties.
  allMoves.sort((a, b) => {
    const appealA = getBaseAppeal(a, contestType);
    const appealB = getBaseAppeal(b, contestType);
    if (appealA !== appealB) {
      return appealB - appealA;
    }

    const voltageA = getVoltageChange(a.type, contestType);
    const voltageB = getVoltageChange(b.type, contestType);
    if (voltageA !== voltageB) {
      return voltageA - voltageB;
    }

    return sortMovesByPriority(a, b);
  });

  let state: SuperContestState = {
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType,
    doubleNext: false,
    consecutiveUses: 0,
  };
  let total: number = 0;
  const greedyStrat: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;

  for (let i = 0; i < NUMBER_TURNS; i++) {
    let bestMove: MoveInfo | null = null;
    for (const move of allMoves) {
      // Check repetition constraints based on REPEAT archetype
      if (prevMove && move.move === prevMove.move) {
        if (move.archetype !== 'REPEAT' || state.consecutiveUses >= 2) {
          continue;
        }
      }
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
      const nextConsecutiveUses = (prevMove && bestMove.move === prevMove.move) ? state.consecutiveUses + 1 : 1;
      state = { ...outcome.updatedState, consecutiveUses: nextConsecutiveUses };
      prevMove = bestMove;

      const move_role = getMoveRoleForMove(pools, bestMove);

      greedyStrat.push({
        move: bestMove.move,
        type: bestMove.type,
        appeal: appeal,
        move_role,
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

  // Fallback: if no strategy works, use greedy approach
  const greedy = getGreedyAttempt(pools, actualContestType);
  if (!best || greedy.total > best.total) {
    best = greedy;
  }

  return best.seq;
}
