import { getAvailableRibbons } from './ribbonUtils';
import type { PokemonDatabase } from './types';

// Mock Pokemon database for testing
const mockPokemonDb: PokemonDatabase = {
  'ralts': {
    natdex: 280,
    names: { en: 'Ralts' },
    games: ['ruby', 'sapphire', 'emerald', 'colosseum', 'xd', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'black', 'white', 'black2', 'white2', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'scar', 'vio']
  },
  'sudowoodo': {
    natdex: 185,
    names: { en: 'Sudowoodo' },
    games: ['colosseum', 'xd', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'pla', 'scar', 'vio']
  },
  'spinda': {
    natdex: 327,
    names: { en: 'Spinda' },
    games: ['ruby', 'sapphire', 'emerald', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'bd', 'sp']
  },
  'claydol': {
    natdex: 344,
    names: { en: 'Claydol' },
    games: ['ruby', 'sapphire', 'emerald', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'bd', 'sp', 'scar', 'vio']
  },
  'mew': {
    natdex: 151,
    names: { en: 'Mew' },
    games: ['ruby', 'sapphire', 'emerald', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'scar', 'vio'],
    mythical: true
  },
  'ho-oh': {
    natdex: 250,
    names: { en: 'Ho-Oh' },
    games: ['colosseum', 'xd', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'scar', 'vio']
  },
  'jirachi': {
    natdex: 385,
    names: { en: 'Jirachi' },
    games: ['ruby', 'sapphire', 'emerald', 'colosseum', 'xd', 'diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'scar', 'vio'],
    mythical: true
  },
  'mewtwo': {
    natdex: 150,
    names: { en: 'Mewtwo' },
    games: ['diamond', 'pearl', 'platinum', 'hg', 'ss', 'x', 'y', 'or', 'as', 'sun', 'moon', 'usun', 'umoon', 'swh', 'sh', 'bd', 'sp', 'scar', 'vio']
  }
};

describe('ribbonUtils', () => {
  describe('getAvailableRibbons', () => {
    test('Shadow Pokemon (Gen 3) should get national-ribbon in Colo/XD', () => {
      const result = getAvailableRibbons('sudowoodo', 50, 'Gen 3', true, mockPokemonDb);

      expect(result['Colo/XD']).toBeDefined();
      expect(result['Colo/XD']?.['available-ribbons']).toContain('national-ribbon');
    });

    test('Non-shadow Pokemon should NOT get national-ribbon', () => {
      const result = getAvailableRibbons('sudowoodo', 50, 'Gen 3', false, mockPokemonDb);

      if (result['Colo/XD']) {
        expect(result['Colo/XD']?.['available-ribbons']).not.toContain('national-ribbon');
      }
    });

    test('Pokemon level 50 or below should get winning-ribbon in RSE', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 3', false, mockPokemonDb);

      expect(result['RSE']).toBeDefined();
      expect(result['RSE']?.['available-ribbons']).toContain('winning-ribbon');
    });

    test('Pokemon above level 50 should NOT get winning-ribbon', () => {
      const result = getAvailableRibbons('ralts', 51, 'Gen 3', false, mockPokemonDb);

      if (result['RSE']) {
        expect(result['RSE']?.['available-ribbons']).not.toContain('winning-ribbon');
      }
    });

    test('Mythical Pokemon should NOT get ribbons with nomythical=true', () => {
      const result = getAvailableRibbons('mew', 50, 'Gen 3', false, mockPokemonDb);

      // ability-ribbon and winning-ribbon have nomythical=true
      if (result['RSE']) {
        expect(result['RSE']?.['available-ribbons']).not.toContain('winning-ribbon');
      }
    });

    test('Banned Pokemon should NOT get ribbons they are banned from', () => {
      const result = getAvailableRibbons('ho-oh', 50, 'Gen 3', false, mockPokemonDb);

      // ho-oh is banned from winning-ribbon and ability-ribbon
      if (result['RSE']) {
        expect(result['RSE']?.['available-ribbons']).not.toContain('winning-ribbon');
      }
    });

    test('Pokemon starting in Gen 6 should only get Gen 6+ ribbons', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 6', false, mockPokemonDb);

      // Should NOT have Gen 3 or Gen 4 game groups
      expect(result['Colo/XD']).toBeUndefined();
      expect(result['RSE']).toBeUndefined();
      expect(result['DPPt']).toBeUndefined();
      expect(result['HGSS']).toBeUndefined();

      // Should have Gen 6+ game groups
      expect(result['XY'] || result['ORAS']).toBeDefined();
    });

    test('Pokemon not available in a game should not get ribbons from that game', () => {
      // Claydol is not available in PLA
      const result = getAvailableRibbons('claydol', 50, 'Gen 3', false, mockPokemonDb);

      // Should not have PLA ribbons (like hisui-ribbon)
      expect(result['PLA']).toBeUndefined();
    });

    test('Pokemon available in BDSP but not SwSh should still get BDSP ribbons', () => {
      // Claydol is available in BDSP but not SwSh
      const result = getAvailableRibbons('claydol', 50, 'Gen 3', false, mockPokemonDb);

      // Should have BDSP ribbons (like tower-master-ribbon)
      expect(result['BDSP']).toBeDefined();
    });

    test('footprint-ribbon should have no level restriction for Gen 3/4 Pokemon', () => {
      const result = getAvailableRibbons('ralts', 100, 'Gen 3', false, mockPokemonDb);

      // Should be able to get footprint-ribbon even at level 100 if available in DPPt
      // Check XY, ORAS, or SM/USUM where footprint-ribbon is available
      const hasFootprint = result['XY']?.['available-ribbons'].includes('footprint-ribbon') ||
                          result['ORAS']?.['available-ribbons'].includes('footprint-ribbon') ||
                          result['SM / USUM']?.['available-ribbons'].includes('footprint-ribbon');

      expect(hasFootprint).toBe(true);
    });

    test('footprint-ribbon should require level 70 or below for Gen 5+ Pokemon', () => {
      const resultHigh = getAvailableRibbons('ralts', 71, 'Gen 5', false, mockPokemonDb);
      const resultLow = getAvailableRibbons('ralts', 70, 'Gen 5', false, mockPokemonDb);

      // Level 71 should not get footprint-ribbon
      if (resultHigh['XY']) {
        expect(resultHigh['XY']?.['available-ribbons']).not.toContain('footprint-ribbon');
      }

      // Level 70 should get footprint-ribbon
      expect(
        resultLow['XY']?.['available-ribbons'].includes('footprint-ribbon') ||
        resultLow['ORAS']?.['available-ribbons'].includes('footprint-ribbon')
      ).toBe(true);
    });

    test('first-introduced should contain ribbons first available in that game group', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 3', false, mockPokemonDb);

      // Contest ribbons should be first introduced in RSE
      expect(result['RSE']?.['first-introduced'].length).toBeGreaterThan(0);

      // Check that a ribbon in first-introduced is not in any previous game group
      if (result['RSE']?.['first-introduced'].length) {
        const firstRibbon = result['RSE']['first-introduced'][0];
        expect(result['Colo/XD']?.['available-ribbons']).not.toContain(firstRibbon);
      }
    });

    test('again should contain ribbons that were previously available', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 3', false, mockPokemonDb);

      // Effort ribbon should appear in multiple generations
      // Check if it's marked as "again" in later game groups
      let foundAgain = false;
      for (const groupName of Object.keys(result)) {
        const group = result[groupName as keyof typeof result];
        if (group?.['again'].includes('effort-ribbon')) {
          foundAgain = true;
          break;
        }
      }

      // effort-ribbon is available in Gen 3, 4, 6, 7, 8, 9 so it should appear as "again"
      expect(foundAgain).toBe(true);
    });

    test('last-chance should contain ribbons not available in later game groups', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 3', false, mockPokemonDb);

      // Some Gen 3 contest ribbons are last chance in RSE
      // Check that last-chance ribbons are actually not available later
      if (result['RSE']?.['last-chance'].length) {
        const lastChanceRibbon = result['RSE']['last-chance'][0];

        // Check that this ribbon doesn't appear in later game groups
        let appearsLater = false;
        const gameGroups = Object.keys(result);
        const rseIndex = gameGroups.indexOf('RSE');

        for (let i = rseIndex + 1; i < gameGroups.length; i++) {
          const laterGroup = result[gameGroups[i] as keyof typeof result];
          if (laterGroup?.['available-ribbons'].includes(lastChanceRibbon)) {
            appearsLater = true;
            break;
          }
        }

        expect(appearsLater).toBe(false);
      }
    });

    test('available-ribbons should be union of first-introduced, last-chance, and again', () => {
      const result = getAvailableRibbons('ralts', 50, 'Gen 3', false, mockPokemonDb);

      for (const groupName of Object.keys(result)) {
        const group = result[groupName as keyof typeof result];
        if (group) {
          const union = new Set([
            ...group['first-introduced'],
            ...group['last-chance'],
            ...group['again']
          ]);

          expect(group['available-ribbons'].length).toBe(union.size);
          expect(new Set(group['available-ribbons'])).toEqual(union);
        }
      }
    });

    test('Pokemon in bannedBDSP should NOT get tower-master-ribbon in BDSP', () => {
      const result = getAvailableRibbons('mewtwo', 50, 'Gen 4', false, mockPokemonDb);

      // Mewtwo should NOT get tower-master-ribbon in BDSP (due to bannedBDSP)
      if (result['BDSP']) {
        expect(result['BDSP']?.['available-ribbons']).not.toContain('tower-master-ribbon');
      }
    });

    test('Pokemon in bannedBDSP should still get tower-master-ribbon in SwSh', () => {
      const result = getAvailableRibbons('mewtwo', 50, 'Gen 4', false, mockPokemonDb);

      // Mewtwo SHOULD get tower-master-ribbon in SwSh (not banned there)
      if (result['SwSh']) {
        expect(result['SwSh']?.['available-ribbons']).toContain('tower-master-ribbon');
      }
    });

    test('Mythical Pokemon should NOT get tower-master-ribbon in BDSP (nomythicalBDSP)', () => {
      const result = getAvailableRibbons('jirachi', 50, 'Gen 3', false, mockPokemonDb);

      // Jirachi is mythical and should NOT get tower-master-ribbon in BDSP
      if (result['BDSP']) {
        expect(result['BDSP']?.['available-ribbons']).not.toContain('tower-master-ribbon');
      }
    });

    test('Spinda from non-Switch generation should NOT get BDSP ribbons', () => {
      const result = getAvailableRibbons('spinda', 50, 'Gen 3', false, mockPokemonDb);

      // Spinda from Gen 3 cannot transfer to BDSP
      expect(result['BDSP']).toBeUndefined();
    });
  });
});
