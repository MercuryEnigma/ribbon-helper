import contestMoves from '../data/contest_moves_oras.json';
import contestEffects from '../data/contest_effects_oras.json';
import { MovesMap, LEARN_METHOD_PRIORITY, type ContestType } from './moveUtils';

export interface ContestMove {
  move: string;
  type: ContestType;
  appeal: number;
}

/**
 * Move archetypes categorize contest moves based on their effect patterns.
 * These archetypes help determine optimal move sequences for RSE contests.
 */
type Archetype =
  | 'SKIPPED'      // Move causes next move to be skipped
  | 'END'          // Move ends the performance early
  | 'LAST'         // Move that works best when used last in order
  | 'FIRST'        // Move that works best when used first in order
  | 'CONDITION'    // Move with appeal based on current star/condition count
  | 'NEXT_FIRST'   // Move that makes next move go first
  | 'NEXT_LAST'    // Move that makes next move go last
  | 'ADD_STAR'     // Move that adds stars/excitement
  | 'NONE';        // Standard move with no special effect

interface MoveInfo {
  move: string;
  learnMethods: Set<string>;
  type: ContestType;
  effectId: string;
  effect: any;
  archetype: Archetype;
}

interface ContestState {
    stars: number;        // Current condition/star count
    guaranteedOrder?: number;    // Previous move's turn order modifier (1=first, 4=last)
    skipNext: boolean;    // Whether this turn should be skipped
    endAll: boolean;      // Whether all future turns should be skipped
    turn: number;         // Current turn number (0-4)
    contestType?: ContestType;  // Contest type for appeal bonuses/penalties (undefined if 'all')
  }

const NUMBER_TURNS = 5;

/**
 * Map of contest types to their opposite types.
 * Moves with opposite types get -1 appeal penalty.
 */
const OPPOSITE_TYPES: Record<ContestType, ContestType[]> = {
  'cool': ['cute', 'smart', 'clever'],
  'beauty': ['smart', 'tough', 'clever'],
  'beautiful': ['clever', 'tough'],
  'cute': ['tough', 'cool'],
  'smart': ['cool', 'beauty', 'beautiful'],
  'clever': ['cool', 'beautiful'],
  'tough': ['beauty', 'beautiful', 'cute'],
};

/**
 * Determines the appeal modifier based on move type vs contest type.
 * @param moveType The type of the move being used
 * @param contestType The contest type (undefined if 'all' was selected)
 * @returns +1 if types match, -1 if opposite, 0 otherwise
 */
function getTypeAppealModifier(moveType: ContestType, contestType?: ContestType): number {
  if (!contestType) return 0;
  if (moveType === contestType) return 1;
  if (OPPOSITE_TYPES[contestType].includes(moveType)) return -1;
  return 0;
}

/**
 * Pre-defined contest strategies for optimal 5-move sequences.
 * Each strategy is a pattern of move archetypes that, when executed correctly,
 * maximizes appeal points in RSE contests.
 */
const STRATEGIES: Archetype[][] = [
  // First-order strategies: Prioritize going first in turn order
  ['ADD_STAR', 'NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST'],
  ['FIRST', 'NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST'],
  ['FIRST', 'NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'NONE'],
  ['NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST', 'NONE'],

  // Last-order strategies: Prioritize going last in turn order
  ['ADD_STAR', 'NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST'],
  ['FIRST', 'NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST'],
  ['NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST', 'NONE'],

  // Condition strategies: Prioritize raising condition
  ['ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'CONDITION'],
  ['ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'CONDITION', 'CONDITION'],
  ['ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'CONDITION', 'NONE'],
  ['ADD_STAR', 'ADD_STAR', 'CONDITION', 'ADD_STAR', 'NONE'],
  ['ADD_STAR', 'CONDITION', 'ADD_STAR', 'CONDITION', 'NONE'],

  // Mostly none
  ['FIRST', 'NONE', 'NONE', 'NONE', 'NONE'],
  ['NONE', 'NONE', 'NONE', 'NONE', 'NONE'],
];

/**
 * Combo pattern templates for testing different combo sequences.
 * Each pattern uses a combination of starter/finisher moves and archetypes.
 *
 * Pattern placeholders:
 * - 'STARTER': The combo starter move
 * - 'FINISHER': The combo finisher move (gets doubled appeal when following starter)
 * - Archetype strings: Any move archetype (e.g., 'FIRST', 'ADD_STAR', 'NONE')
 */
type ComboPatternTemplate = Array<'STARTER' | 'FINISHER' | Archetype>;

const COMBO_PATTERNS: ComboPatternTemplate[] = [
  ['STARTER', 'FINISHER', 'STARTER', 'FINISHER', 'NONE'],
  ['NONE', 'NONE', 'NONE', 'STARTER', 'FINISHER'],
  ['FIRST', 'NONE', 'NONE', 'STARTER', 'FINISHER'],
  ['FIRST', 'STARTER', 'FINISHER', 'STARTER', 'FINISHER'],
  ['NEXT_LAST', 'STARTER', 'FINISHER', 'STARTER', 'FINISHER'],
  ['ADD_STAR', 'STARTER', 'FINISHER', 'STARTER', 'FINISHER'],
  ['STARTER', 'FINISHER', 'STARTER', 'FINISHER', 'CONDITION'],
];

/**
 * Determines the archetype of a move based on its contest effect.
 * @param effect The effect data from contest_effects_rse.json
 * @returns The archetype category for the move
 */
function classifyEffect(effect: any): Archetype {
  if (effect?.skip) return 'SKIPPED';
  if (effect?.end) return 'END';
  if (effect?.last) return 'LAST';
  if (effect?.first) return 'FIRST';
  if (effect?.condition) return 'CONDITION';
  if (effect?.next === 1) return 'NEXT_FIRST';
  if (effect?.next === 4) return 'NEXT_LAST';
  if (typeof effect?.star === 'number' && effect.star > 0) return 'ADD_STAR';
  return 'NONE';
}

/**
 * Helper function to parse a learn method string and extract priority and level info.
 * @param methodStr A learn method string like "lvl 55", "tm-44", "purify", etc.
 * @returns Object with priority and level (for sorting)
 */
function parseLearnMethod(methodStr: string): { priority: number; level: number } {
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
 * Sorts moves by priority (highest first), then by level (descending for level-up moves).
 * Example: ["refresh" (purify), "hyper-beam" (lvl 55), "tackle" (lvl 5), "rest" (tm-44)]
 */
function sortMovesByPriority(a: MoveInfo, b: MoveInfo): number {
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
 * Organizes available moves into pools by their archetype.
 * This allows the strategy simulator to quickly select moves of the needed type.
 * Within each pool, moves are sorted by type (matching > neutral > opposite), then priority/appeal.
 * @param availableMoves Map of move names to their set of learn methods
 * @param contestType The contest type for type-based sorting (undefined if 'all')
 * @returns Object mapping each archetype to an array of moves with that archetype
 */
function buildMovePools(availableMoves: MovesMap, contestType?: ContestType): Record<Archetype, MoveInfo[]> {
  const pools: Record<Archetype, MoveInfo[]> = {
    SKIPPED: [],
    END: [],
    LAST: [],
    FIRST: [],
    CONDITION: [],
    NEXT_FIRST: [],
    NEXT_LAST: [],
    ADD_STAR: [],
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
  for (const [archetype, pool] of Object.entries(pools) as [Archetype, MoveInfo[]][]) {
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
 * @param state Current contest state (stars, turn order, skip status, turn number)
 * @returns Appeal calculation result with next state changes
 */
function computeAppeal(
  move: MoveInfo,
  state: ContestState
): { appeal: number; updatedState: ContestState } {
  // If this turn is skipped, return zero appeal and clear skip flag
  if (state.skipNext || state.endAll) {
    return {
      appeal: 0,
      updatedState: {
        guaranteedOrder: undefined,
        stars: state.stars,
        skipNext: false,
        endAll: state.endAll,
        turn: state.turn + 1,
        contestType: state.contestType
      }
    };
  }

  const effect = move.effect || {};
  let appeal = effect.appeal ?? 0;

  // Condition moves scale with current star count
  if (effect.condition) {
    if (state.stars === 0) appeal = 1;
    else if (state.stars === 1) appeal = 3;
    else if (state.stars === 2) appeal = 5;
    else appeal = 7;  // 3+ stars
  }

  // First-order moves get bonus appeal if going first
  if (effect.first && (state.turn === 0 || state.guaranteedOrder === 1)) {
    appeal = 6;
  }

  // Last-order moves get bonus appeal if going last
  if (effect.last && state.guaranteedOrder === 4) {
    appeal = 6;
  }

  // Stars add to appeal
  appeal += state.stars;

  // Contest type bonus/penalty
  appeal += getTypeAppealModifier(move.type, state.contestType);

  const starGain = typeof effect.star === 'number' ? effect.star : 0;
  const nextOrder = typeof effect.next === 'number' ? effect.next : undefined;
  const skipNext = !!effect.skip;
  const end = !!effect.end;

  const updatedState: ContestState = {
        guaranteedOrder: nextOrder,
        stars: state.stars + starGain,
        skipNext,
        endAll: end,
        turn: state.turn + 1,
        contestType: state.contestType
  };

  return { appeal, updatedState};
}

/**
 * Selects the best move from the pools based on the desired archetype or current state.
 * @param pools Available moves organized by archetype
 * @param desired The archetype requested by the strategy, or 'NONE' for free choice
 * @param state Current contest state
 * @param prevArchetype The archetype used in the previous turn (to avoid repetition)
 * @returns The selected move, or null if no suitable move is available
 */
function chooseMoveFromPool(
  pools: Record<Archetype, MoveInfo[]>,
  desired: Archetype | 'NONE',
  state: ContestState,
  prevMove?: MoveInfo
): MoveInfo | null {
  // If a specific archetype is requested, use the first available move of that type
  if (desired !== 'NONE') {
    const pool = pools[desired];
    if (pool.length === 0) return null;
    if (prevMove?.archetype !== desired) return pool[0];

    // Choosing the same archetype, so make sure moves are different
    if (pool.length < 2) return pool[0];
    return pool[0].move === prevMove?.move ? pool[1] : pool[0];
  }

  // For free choice: pick the move that maximizes immediate appeal
  // Avoid repeating single-entry archetypes and END moves
  let best: { move: MoveInfo; appeal: number } | null = null;

  for (const [archKey, list] of Object.entries(pools) as [Archetype, MoveInfo[]][]) {
    if (list.length === 0) continue;
    // Don't repeat an archetype if it only has one move
    // Never use END or SKIPPED moves if it isn't the last turn
    if ((archKey === 'END' || archKey === 'SKIPPED') 
      && state.turn < NUMBER_TURNS - 1) continue;

    const candidate1 = list[0];
    let simulated1 = computeAppeal(candidate1, state).appeal;
    if (candidate1.move === prevMove?.move) {
      simulated1 -= 1;
    }
    if (!best || simulated1 > best.appeal) {
      best = { move: candidate1, appeal: simulated1 };
    }

    if (list.length < 2) continue;
    const candidate2 = list[1];
    let simulated2 = computeAppeal(candidate2, state).appeal;
    if (candidate2.move === prevMove?.move) {
      simulated2 -= 1;
    }
    if (!best || simulated2 > best.appeal) {
      best = { move: candidate2, appeal: simulated2 };
    }
  }

  return best ? best.move : null;
}

/**
 * Simulates a complete 5-turn contest performance using a specific strategy.
 * @param pools Available moves organized by archetype
 * @param strategy The sequence of archetypes to use (defines move selection pattern)
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Total appeal and move sequence, or null if strategy cannot be executed
 */
function simulateStrategy(
  pools: Record<Archetype, MoveInfo[]>,
  strategy: (Archetype | 'NONE')[],
  contestType?: ContestType
): { total: number; sequence: ContestMove[] } | null {
  // Create working copies of pools to track usage during simulation
  const workingPools: Record<Archetype, MoveInfo[]> = {
    SKIPPED: [...pools.SKIPPED],
    END: [...pools.END],
    LAST: [...pools.LAST],
    FIRST: [...pools.FIRST],
    CONDITION: [...pools.CONDITION],
    NEXT_FIRST: [...pools.NEXT_FIRST],
    NEXT_LAST: [...pools.NEXT_LAST],
    ADD_STAR: [...pools.ADD_STAR],
    NONE: [...pools.NONE],
  };

  let state: ContestState = {
    stars: 0,
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType
  };
  let total = 0;
  const chosen: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;

  // Execute each turn of the strategy
  for (let i = 0; i < strategy.length; i++) {
    const desired = strategy[i];
    const move = chooseMoveFromPool(workingPools, desired as Archetype, state, prevMove);

    // Strategy fails if required move type is unavailable
    if (!move) return null;

    // Check if we already have 4 unique moves and this move is not one of them
    const uniqueMoves = new Set(chosen.map(m => m.move));
    if (uniqueMoves.size === 4 && !uniqueMoves.has(move.move)) {
      return null;
    }

    // Calculate appeal and update contest state
    const outcome = computeAppeal(move, state);
    let appeal = outcome.appeal;

    if (move.move === prevMove?.move) {
      appeal -= 1;
    }
    total += appeal;
    state = {...outcome.updatedState};
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
  pools:  Record<Archetype, MoveInfo[]>,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } | null {
  let best: { total: number; seq: ContestMove[] } | null = null;

  // Test each strategy and keep the one with highest total appeal
  for (const strategy of STRATEGIES) {
    // Quick check: skip strategies that require unavailable archetypes
    const needed = new Set(strategy.filter(s => s !== 'NONE') as Archetype[]);
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
 * Finds all eligible combo pairs from available moves.
 * A combo is eligible if both the starter move and finisher move are available.
 * The move listed in combos.before gets the doubled appeal bonus when used after the starter.
 *
 * Example: rest.combos.before = ['snore', 'sleep-talk']
 * This means: rest → snore (snore gets doubled) and rest → sleep-talk (sleep-talk gets doubled)
 */
function findEligibleCombos(availableMoves: MovesMap): Array<{ starter: string; finisher: string }> {
  const comboPairs: Array<{ starter: string; finisher: string }> = [];
  const moveNames = Object.keys(availableMoves);
  const moveSet = new Set(moveNames);

  for (const moveName of moveNames) {
    const moveMeta = (contestMoves as any)[moveName];
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
 * Simulates a single combo pattern and calculates total appeal.
 * @param pools Available moves organized by archetype
 * @param starterMove The combo starter move
 * @param finisherMove The combo finisher move (gets doubled appeal when following starter)
 * @param pattern The sequence pattern to test
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Total appeal and move sequence, or null if pattern cannot be executed
 */
function simulateSingleComboPattern(
  pools: Record<Archetype, MoveInfo[]>,
  starterMove: MoveInfo,
  finisherMove: MoveInfo,
  pattern: ComboPatternTemplate,
  contestType?: ContestType
): { total: number; sequence: ContestMove[] } | null {
  const workingPools: Record<Archetype, MoveInfo[]> = {
    SKIPPED: [...pools.SKIPPED],
    END: [...pools.END],
    LAST: [...pools.LAST],
    FIRST: [...pools.FIRST],
    CONDITION: [...pools.CONDITION],
    NEXT_FIRST: [...pools.NEXT_FIRST],
    NEXT_LAST: [...pools.NEXT_LAST],
    ADD_STAR: [...pools.ADD_STAR],
    NONE: [...pools.NONE],
  };

  let state: ContestState = {
    stars: 0,
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType
  };
  let total = 0;
  const chosen: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;
  let hadComboLastTurn = false;

  // Convert pattern template to actual moves/archetypes
  const resolvedPattern: (MoveInfo | Archetype)[] = pattern.map(slot => {
    if (slot === 'STARTER') return starterMove;
    if (slot === 'FINISHER') return finisherMove;
    return slot as Archetype;
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

    // Calculate base appeal
    const outcome = computeAppeal(move, state);
    let appeal = outcome.appeal;

    // Apply combo bonus: double appeal if this is a finisher following a starter
    // BUT not if the previous turn also had a combo bonus
    const isComboFinisher = move.move === finisherMove.move
      && prevMove?.move === starterMove.move;
    if (isComboFinisher && !hadComboLastTurn) {
      appeal += 3;
      hadComboLastTurn = true;
    } else {
      hadComboLastTurn = false;
    }

    if (move.move === prevMove?.move) {
      appeal -= 1;
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
  pools: Record<Archetype, MoveInfo[]>,
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
  pools: Record<Archetype, MoveInfo[]>,
  availableMoves: MovesMap,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } | null {
  const comboPairs = findEligibleCombos(availableMoves);
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
 * while avoiding skip/end moves (except on last turn) and duplicates.
 * @param pools Available moves organized by archetype
 * @param contestType The contest type for appeal bonuses/penalties (undefined if 'all')
 * @returns Array of 5 contest moves, or empty array if no moves available
 */
function getGreedyAttempt(
  pools: Record<Archetype, MoveInfo[]>,
  contestType?: ContestType
): { total: number; seq: ContestMove[] } {
  // Get all available moves
  const allMoves = Object.values(pools).flat();
  if (allMoves.length === 0) return {total: 0, seq: []};

  // Sort by base appeal + type modifier (descending)
  allMoves.sort((a, b) => {
    const appealA = (a.effect?.appeal ?? 0) + getTypeAppealModifier(a.type, contestType);
    const appealB = (b.effect?.appeal ?? 0) + getTypeAppealModifier(b.type, contestType);
    return appealB - appealA;
  });

  let state: ContestState = {
    stars: 0,
    guaranteedOrder: undefined,
    skipNext: false,
    endAll: false,
    turn: 0,
    contestType
  };
  let total: number = 0;
  const greedyStrat: ContestMove[] = [];
  let prevMove: MoveInfo | undefined = undefined;

  for (let i = 0; i < NUMBER_TURNS; i++) {
    let bestMove: MoveInfo | null = null;
    for (const move of allMoves) {
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
      let appeal = outcome.appeal;

      if (bestMove.move === prevMove?.move) {
        appeal -= 1;
      }

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
  return {total, seq: greedyStrat};
}

/**
 * Computes the optimal 5-move sequence for RSE contests.
 * Tries multiple pre-defined strategies and returns the one with highest total appeal.
 * @param availableMoves List of move names the Pokémon can learn
 * @param contestType The contest type filter (currently unused in selection)
 * @returns Array of 5 contest moves with their types and appeal values
 */
export function getContestSpectacularOptimalMoves(
  availableMoves: MovesMap,
  contestType: ContestType | 'all'
): ContestMove[] {
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
