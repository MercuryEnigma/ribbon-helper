import { describe, expect, it } from 'vitest';
import type { RibbonsMap } from '../switch-compatibility/ribbonUtils';
import {
  classifyRibbonCollection,
  normalizeEligibleRibbons,
} from './ribbonAnalysis';

function group(ribbons: string[]) {
  return {
    'available-ribbons': ribbons,
    'first-introduced': ribbons,
    'last-chance': [],
    'again': [],
  };
}

describe('normalizeEligibleRibbons', () => {
  it('removes merged legacy ribbons and keeps Transfer memory ribbons', () => {
    const eligible: RibbonsMap = {
      RSE: group(['cool-ribbon-hoenn', 'effort-ribbon']),
      DPPt: group(['ability-ribbon']),
      Transfer: group([
        'battle-memory-ribbon',
        'contest-memory-ribbon-gold',
      ]),
    };

    expect(normalizeEligibleRibbons(eligible)).toEqual([
      { ribbonId: 'effort-ribbon', gameGroups: ['RSE'] },
      { ribbonId: 'contest-memory-ribbon-gold', gameGroups: ['Transfer'] },
      { ribbonId: 'battle-memory-ribbon', gameGroups: ['Transfer'] },
    ]);
  });

  it('deduplicates recurring ribbons while retaining every eligible game group', () => {
    const eligible: RibbonsMap = {
      RSE: group(['effort-ribbon']),
      XY: group(['effort-ribbon']),
      BDSP: group(['effort-ribbon']),
    };

    expect(normalizeEligibleRibbons(eligible)).toEqual([
      {
        ribbonId: 'effort-ribbon',
        gameGroups: ['RSE', 'XY', 'BDSP'],
      },
    ]);
  });
});

describe('classifyRibbonCollection', () => {
  it('separates owned, still-obtainable, missed, and extra ribbons', () => {
    const eligible: RibbonsMap = {
      RSE: group(['champion-ribbon', 'effort-ribbon']),
      Transfer: group(['battle-memory-ribbon']),
      BDSP: group(['effort-ribbon', 'twinkling-star-ribbon']),
    };

    const result = classifyRibbonCollection(eligible, [
      'champion-ribbon',
      'classic-ribbon',
      'titan-mark',
    ]);

    expect(result.owned.map(item => item.detectedRibbonId)).toEqual([
      'champion-ribbon',
    ]);
    expect(result.stillObtainable.map(item => item.ribbonId)).toEqual([
      'effort-ribbon',
      'twinkling-star-ribbon',
    ]);
    expect(result.missed.map(item => item.ribbonId)).toEqual([
      'battle-memory-ribbon',
    ]);
    expect(result.extras).toEqual(['classic-ribbon', 'titan-mark']);
  });

  it('allows a gold Memory Ribbon to satisfy a standard expectation', () => {
    const eligible: RibbonsMap = {
      Transfer: group(['battle-memory-ribbon']),
    };

    const result = classifyRibbonCollection(eligible, [
      'battle-memory-ribbon-gold',
    ]);

    expect(result.owned).toEqual([
      {
        ribbonId: 'battle-memory-ribbon',
        gameGroups: ['Transfer'],
        detectedRibbonId: 'battle-memory-ribbon-gold',
        satisfaction: 'gold-upgrade',
      },
    ]);
    expect(result.missed).toEqual([]);
    expect(result.extras).toEqual([]);
  });

  it('does not allow a standard Memory Ribbon to satisfy a gold expectation', () => {
    const eligible: RibbonsMap = {
      Transfer: group(['contest-memory-ribbon-gold']),
    };

    const result = classifyRibbonCollection(eligible, [
      'contest-memory-ribbon',
    ]);

    expect(result.owned[0]?.satisfaction).toBe('standard-below-gold');
    expect(result.missed.map(item => item.ribbonId)).toEqual([
      'contest-memory-ribbon-gold',
    ]);
    expect(result.extras).toEqual([]);
  });

  it('always classifies size marks as special extras', () => {
    const eligible: RibbonsMap = {
      SV: group(['jumbo-mark', 'mini-mark', 'paldea-champion-ribbon']),
    };

    const result = classifyRibbonCollection(eligible, [
      'jumbo-mark',
      'mini-mark',
      'paldea-champion-ribbon',
    ]);

    expect(result.owned.map(item => item.ribbonId)).toEqual([
      'paldea-champion-ribbon',
    ]);
    expect(result.stillObtainable).toEqual([]);
    expect(result.extras).toEqual(['jumbo-mark', 'mini-mark']);
  });
});
