import { describe, expect, it } from 'vitest';
import type { RibbonCellMatch } from './ribbonMatcher';
import {
  HOME_OBTAINABLE_ORDER,
  resolveHomeRibbonOrder,
} from './homeRibbonOrder';

function match(
  best: [string, number],
  alternatives: [string, number][] = [],
): RibbonCellMatch {
  return {
    cell: { row: 0, column: 0, x: 0, y: 0, width: 10, height: 10 },
    best: { ribbonId: best[0], score: best[1] },
    alternatives: alternatives.map(([ribbonId, score]) => ({ ribbonId, score })),
    confidence: 1 - best[1],
    margin: 0,
    accepted: false,
  };
}

describe('resolveHomeRibbonOrder', () => {
  it('uses surrounding ribbons to resolve a close daily-ribbon match', () => {
    const resolved = resolveHomeRibbonOrder([
      match(['effort-ribbon', 0.03]),
      match(['shock-ribbon', 0.09], [['alert-ribbon', 0.1]]),
      match(['shock-ribbon', 0.08], [['alert-ribbon', 0.11]]),
      match(['downcast-ribbon', 0.04]),
    ]);

    expect(resolved.map(item => item.best.ribbonId)).toEqual([
      'effort-ribbon',
      'alert-ribbon',
      'shock-ribbon',
      'downcast-ribbon',
    ]);
    expect(resolved.every(item => item.accepted)).toBe(true);
  });

  it('allows a strong special ribbon outside the normal sequence', () => {
    const resolved = resolveHomeRibbonOrder([
      match(['classic-ribbon', 0.02], [['champion-ribbon', 0.2]]),
      match(['sinnoh-champion-ribbon', 0.03]),
    ]);

    expect(resolved[0].best.ribbonId).toBe('classic-ribbon');
  });

  it('contains the complete Odyx obtainable sequence', () => {
    expect(HOME_OBTAINABLE_ORDER).toHaveLength(45);
    expect(HOME_OBTAINABLE_ORDER.slice(-3)).toEqual([
      'itemfinder-mark',
      'partner-mark',
      'gourmand-mark',
    ]);
  });
});
