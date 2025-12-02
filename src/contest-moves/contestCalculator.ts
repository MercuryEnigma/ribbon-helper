import contestMoves from '../data/contest_moves_rse.json';
import contestEffects from '../data/contest_effects_rse.json';
import type { ContestType } from './types';

export interface ContestMove {
  move: string;
  type: ContestType;
  appeal: number;
}

type Archetype =
  | 'SKIPPED'
  | 'END'
  | 'LAST'
  | 'FIRST'
  | 'CONDITION'
  | 'NEXT_FIRST'
  | 'NEXT_LAST'
  | 'ADD_STAR'
  | 'NONE';

interface MoveInfo {
  move: string;
  type: ContestType;
  effectId: string;
  effect: any;
  archetype: Archetype;
}

const STRATEGIES: Archetype[][] = [
  ['NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST', 'NONE'],
  ['CONDITION', 'NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST'],
  ['FIRST', 'NEXT_FIRST', 'FIRST', 'NEXT_FIRST', 'FIRST'],
  ['NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST', 'NONE'],
  ['CONDITION', 'NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST'],
  ['FIRST', 'NEXT_LAST', 'LAST', 'NEXT_LAST', 'LAST'],
  ['ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'CONDITION'],
  ['ADD_STAR', 'CONDITION', 'ADD_STAR', 'CONDITION', 'NONE'],
  ['ADD_STAR', 'ADD_STAR', 'ADD_STAR', 'CONDITION', 'CONDITION'],
];

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

function buildMovePools(availableMoves: string[]): Record<Archetype, MoveInfo[]> {
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

  for (const move of availableMoves) {
    const moveMeta = (contestMoves as any)[move];
    if (!moveMeta) continue;
    const effectId = String(moveMeta.effect);
    const effect = (contestEffects as any)[effectId];
    if (!effect) continue;
    const archetype = classifyEffect(effect);
    pools[archetype].push({
      move,
      type: moveMeta.type as ContestType,
      effectId,
      effect,
      archetype,
    });
  }

  return pools;
}

function computeAppeal(
  move: MoveInfo,
  state: {
    stars: number;
    prevNext?: number;
    skipNext: boolean;
    turn: number;
  }
): { appeal: number; nextVal?: number; starGain: number; skipNext: boolean; end: boolean } {
  if (state.skipNext) {
    return { appeal: 0, nextVal: undefined, starGain: 0, skipNext: false, end: false };
  }

  const effect = move.effect || {};
  let appeal = effect.appeal ?? 0;

  if (effect.condition) {
    if (state.stars === 0) appeal = 1;
    else if (state.stars === 1) appeal = 3;
    else if (state.stars === 2) appeal = 5;
    else appeal = 7;
  }

  if (effect.first && (state.turn === 0 || state.prevNext === 1)) {
    appeal = 6;
  }

  if (effect.last && state.prevNext === 4) {
    appeal = 6;
  }

  // Stars add to appeal for non-condition moves
  if (!effect.condition) {
    appeal += state.stars;
  }

  const starGain = typeof effect.star === 'number' ? effect.star : 0;
  const nextVal = typeof effect.next === 'number' ? effect.next : undefined;
  const skipNext = !!effect.skip;
  const end = !!effect.end;

  return { appeal, nextVal, starGain, skipNext, end };
}

function chooseMoveFromPool(
  pools: Record<Archetype, MoveInfo[]>,
  desired: Archetype | 'NONE',
  state: { stars: number; prevNext?: number; skipNext: boolean; turn: number },
  prevArchetype?: Archetype
): MoveInfo | null {
  if (desired !== 'NONE') {
    const pool = pools[desired];
    if (pool.length === 0) return null;
    // Use first available
    return pool[0];
  }

  // FREE/NONE: pick the move that maximizes immediate appeal, avoid repeating single-entry archetype back-to-back
  let best: { move: MoveInfo; appeal: number } | null = null;

  for (const [archKey, list] of Object.entries(pools) as [Archetype, MoveInfo[]][]) {
    if (list.length === 0) continue;
    if (prevArchetype === archKey && list.length === 1) continue;
    const candidate = list[0];
    const simulated = computeAppeal(candidate, state).appeal;
    if (!best || simulated > best.appeal) {
      best = { move: candidate, appeal: simulated };
    }
  }

  return best ? best.move : null;
}

function simulateStrategy(pools: Record<Archetype, MoveInfo[]>, strategy: (Archetype | 'NONE')[]): { total: number; sequence: ContestMove[] } | null {
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

  let stars = 0;
  let prevNext: number | undefined = undefined;
  let skipNext = false;
  let total = 0;
  const chosen: ContestMove[] = [];
  let prevArch: Archetype | undefined = undefined;

  for (let i = 0; i < strategy.length; i++) {
    const desired = strategy[i];
    const state = { stars, prevNext, skipNext, turn: i };
    const move = chooseMoveFromPool(workingPools, desired as Archetype, state, prevArch);
    if (!move) return null;

    // Remove from pool
    const pool = workingPools[move.archetype];
    pool.splice(pool.indexOf(move), 1);

    const outcome = computeAppeal(move, state);
    total += outcome.appeal;
    stars += outcome.starGain;
    prevNext = outcome.nextVal;
    skipNext = outcome.skipNext;
    prevArch = move.archetype;

    chosen.push({
      move: move.move,
      type: move.type,
      appeal: outcome.appeal,
    });

    if (outcome.end) {
      // Remaining moves cannot be done; append placeholders if needed
      while (chosen.length < 5) {
        chosen.push({
          move: '—',
          type: move.type,
          appeal: 0,
        });
      }
      break;
    }
  }

  // Ensure we have 5 moves; if strategy shorter or end triggered
  while (chosen.length < 5) {
    const fillerMove = chooseMoveFromPool(workingPools, 'NONE', { stars, prevNext, skipNext, turn: chosen.length }, prevArch);
    if (!fillerMove) {
      chosen.push({ move: '—', type: 'cool', appeal: 0 });
    } else {
      const outcome = computeAppeal(fillerMove, { stars, prevNext, skipNext, turn: chosen.length });
      chosen.push({ move: fillerMove.move, type: fillerMove.type, appeal: outcome.appeal });
    }
  }

  return { total, sequence: chosen.slice(0, 5) };
}

/**
 * Compute the best 5-move sequence for RSE contests.
 */
export function getRseContestMoves(
  availableMoves: string[],
  contestType: ContestType | 'all'
): ContestMove[] {
  const pools = buildMovePools(availableMoves);

  // Discard strategies that require missing archetypes
  let best: { total: number; seq: ContestMove[] } | null = null;

  for (const strategy of STRATEGIES) {
    // quick availability check
    const needed = new Set(strategy.filter(s => s !== 'NONE') as Archetype[]);
    let valid = true;
    needed.forEach(arch => {
      if (pools[arch].length === 0) valid = false;
    });
    if (!valid) continue;

    const result = simulateStrategy(pools, strategy);
    if (!result) continue;
    if (!best || result.total > best.total) {
      best = { total: result.total, seq: result.sequence };
    }
  }

  // Fallback: just pick any five moves with default type/appeal
  if (!best) {
    const pillType: ContestType = contestType === 'all' ? 'cool' : contestType;
    const pool = availableMoves.slice(0, 5);
    while (pool.length < 5 && availableMoves.length > 0) {
      pool.push(...availableMoves);
    }
    return pool.slice(0, 5).map((m, idx) => ({
      move: m,
      type: (contestMoves as any)[m]?.type ?? pillType,
      appeal: (idx % 6) + 1,
    }));
  }

  return best.seq.slice(0, 5);
}
