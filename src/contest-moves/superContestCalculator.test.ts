import { describe, expect, it } from 'vitest';
import { getSuperContestOptimalMoves } from './superContestCalculator';
import type { MovesMap } from './moveUtils';

function moves(...moveNames: string[]): MovesMap {
  return Object.fromEntries(
    moveNames.map(move => [move, new Set(['test'])]),
  ) as MovesMap;
}

describe('getSuperContestOptimalMoves', () => {
  it('does not add a generic same-type appeal bonus in DPPt', () => {
    const result = getSuperContestOptimalMoves(moves('slash', 'cut'), 'cool');

    expect(result).toHaveLength(4);
    expect(result.every(move => move.appeal === 3)).toBe(true);
  });

  it('does not apply a generic opposite-type appeal penalty in DPPt', () => {
    const result = getSuperContestOptimalMoves(moves('slash', 'cut'), 'cute');

    expect(result).toHaveLength(4);
    expect(result.every(move => move.appeal === 3)).toBe(true);
  });

  it('matches the Rage into Slash DPPt appeal sequence', () => {
    const result = getSuperContestOptimalMoves(moves('rage', 'slash'), 'cool');

    expect(result.slice(0, 2).map(move => [move.move, move.appeal])).toEqual([
      ['rage', 0],
      ['slash', 6],
    ]);
  });

  it('keeps explicit Judge Voltage bonus effects without adding generic type appeal', () => {
    const result = getSuperContestOptimalMoves(moves('poison-jab', 'slash'), 'smart');

    expect(result[0]).toMatchObject({
      move: 'poison-jab',
      appeal: 4,
    });
  });

  it('prefers off-type moves on equal appeal to suppress Judge Voltage', () => {
    // All three are plain appeal-3 moves. In a Cool contest, slash (Cool)
    // raises the Voltage, pound (Tough) is neutral, and confusion (Smart)
    // lowers it — the safest picks avoid feeding anyone a jackpot.
    const result = getSuperContestOptimalMoves(moves('slash', 'pound', 'confusion'), 'cool');

    expect(result).toHaveLength(4);
    expect(result.map(move => move.move)).toEqual(['confusion', 'pound', 'confusion', 'pound']);
    expect(result.every(move => move.appeal === 3)).toBe(true);
  });

  it('still prefers a matching-type Voltage bonus move over equal off-type appeal', () => {
    // poison-jab in a Smart contest earns 2 + 2 = 4, beating plain 3-appeal moves.
    const result = getSuperContestOptimalMoves(moves('poison-jab', 'confusion', 'pound'), 'smart');

    expect(result[0]).toMatchObject({ move: 'poison-jab', appeal: 4 });
  });
});
