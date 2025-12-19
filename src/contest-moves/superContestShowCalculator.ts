import contestMoves from '../data/contest_moves_bdsp.json';
import contestEffects from '../data/contest_effects_bdsp.json';
import {
  MovesMap,
  sortMovesByPriority,
  type MoveInfoForSorting
} from './moveUtils';

export interface ContestShowMove {
  move: string;
  hype: number;
  move_role: string[];
}

interface MoveInfo extends MoveInfoForSorting {
  move: string;
  effectId: string;
  effect: any;
  hype: number;
  totalHype: number;
}

/**
 * Computes the optimal move options for BDSP Super Contest Shows.
 * Groups moves by total hype points and effect, then returns the top 3 moves.
 * @param availableMoves Map of move names to their learn methods
 * @returns Array of up to 3 contest show moves with their hype values
 */
export function getSuperContestShowOptimalMoves(
  availableMoves: MovesMap
): ContestShowMove[] {
  // Build list of all available moves with their total hype
  const moveInfos: MoveInfo[] = [];

  for (const [move, learnMethods] of Object.entries(availableMoves)) {
    const moveMeta = (contestMoves as any)[move];
    if (!moveMeta) continue;

    const effectId = String(moveMeta.effect);
    const effect = (contestEffects as any)[effectId];
    const moveHype = moveMeta.hype ?? 0;
    const addedHype = effect?.added_hype ?? 0;
    const totalHype = moveHype + addedHype;

    moveInfos.push({
      move,
      learnMethods,
      effectId,
      effect,
      hype: moveHype,
      totalHype,
    });
  }

  // Group moves by <totalHype, effectId>
  const groupKey = (m: MoveInfo) => `${m.totalHype}_${m.effectId}`;
  const groups = new Map<string, MoveInfo[]>();

  for (const moveInfo of moveInfos) {
    const key = groupKey(moveInfo);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(moveInfo);
  }

  // Sort moves within each group by priority
  for (const group of groups.values()) {
    group.sort(sortMovesByPriority);
  }

  // Sort groups by total hype (descending)
  const sortedGroups = Array.from(groups.values()).sort((a, b) => {
    return b[0].totalHype - a[0].totalHype;
  });

  // Select the first move from each of the top 3 groups
  const topMoves: ContestShowMove[] = [];
  for (let i = 0; i < Math.min(4, sortedGroups.length); i++) {
    const firstMove = sortedGroups[i][0];
    const move_role = sortedGroups[i]
      .filter(m => m.move !== firstMove.move)
      .map(m => m.move);
    topMoves.push({
      move: firstMove.move,
      hype: firstMove.totalHype,
      move_role,
    });
  }

  return topMoves;
}
