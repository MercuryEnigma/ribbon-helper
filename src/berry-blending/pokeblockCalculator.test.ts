import { describe, it, expect } from 'vitest';
import { calculateOptimalPokeblockKit, type Pokeblock } from './pokeblockCalculator';
import pokeblocks from '../data/pokeblocks.json';

const blockData = pokeblocks as Record<string, Pokeblock>;

describe('calculateOptimalPokeblockKit', () => {
  it('accumulates flavor stats correctly (including sour)', () => {
    const kit = calculateOptimalPokeblockKit(1, true, false, false, null);
    expect(kit).not.toBeNull();
    if (!kit) return;

    const totals = { spicy: 0, dry: 0, sweet: 0, bitter: 0, sour: 0 };

    for (const block of kit.blocks) {
      const data = blockData[block.name];
      expect(data).toBeDefined();

      totals.spicy = Math.min(255, totals.spicy + data.spicy);
      totals.dry = Math.min(255, totals.dry + data.dry);
      totals.sweet = Math.min(255, totals.sweet + data.sweet);
      totals.bitter = Math.min(255, totals.bitter + data.bitter);
      totals.sour = Math.min(255, totals.sour + data.sour);
    }

    expect(totals).toEqual(kit.totalStats);
  });

  it('uses a Berry Master finishing block when enabled', () => {
    const kit = calculateOptimalPokeblockKit(1, true, false, true, null);
    expect(kit).not.toBeNull();
    if (!kit) return;

    const lastBlock = kit.blocks[kit.blocks.length - 1];
    const data = blockData[lastBlock.name];
    expect(data).toBeDefined();
    expect(data.finishing).toBe(true);
    expect(data['blend-master']).toBe(true);
  });
});
