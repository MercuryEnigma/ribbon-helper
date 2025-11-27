export interface BerryRecommendation {
  berries: Array<{
    name: string;
    npcCount?: number; // undefined for finishing touches
  }>;
  notes?: string;
}

// Parse berry string like "1x Ganlon 4, 3x Salac 4, 2x Petaya 3, Apicot/Ganlon"
// where number after berry name is (npcCount + 1)
function parseBerryString(berryString: string): BerryRecommendation['berries'] {
  const berries: BerryRecommendation['berries'] = [];

  // Split by comma
  const parts = berryString.split(',').map(s => s.trim());

  for (const part of parts) {
    // Check if this is a finishing touch (contains /)
    if (part.includes('/')) {
      const finishingTouches = part.split('/').map(s => s.trim());
      for (const touch of finishingTouches) {
        berries.push({ name: touch });
      }
      continue;
    }

    // Parse format like "1x Ganlon 4" or "Ganlon 3P" or "Ganlon M"
    // Match: optional count + "x" + berry name + space + modifier
    const matchWithCount = part.match(/^(\d+)x\s+([A-Za-z\s]+?)\s+(\d+|[A-Z]+\d*|[A-Z]+)$/);
    const matchWithoutCount = part.match(/^([A-Za-z\s]+?)\s+(\d+|[A-Z]+\d*|[A-Z]+)$/);

    const match = matchWithCount || matchWithoutCount;

    if (match) {
      let count = 1;
      let berryName: string;
      let modifier: string;

      if (matchWithCount) {
        [, count, berryName, modifier] = match as any;
        count = parseInt(count as any, 10);
      } else if (matchWithoutCount) {
        [, berryName, modifier] = match as any;
      } else {
        continue;
      }

      // Determine NPC count based on modifier
      let npcCount: number | undefined;
      let displayName = berryName.trim();

      if (/^\d+$/.test(modifier)) {
        // Pure number: npcCount = number - 1
        npcCount = parseInt(modifier, 10) - 1;
      } else if (/^\d+P$/.test(modifier)) {
        // Format like "3P" or "4P": player blend
        displayName = `${berryName.trim()} (${modifier})`;
        npcCount = undefined;
      } else {
        // Letter modifier like "M" (Master), "Valley", "Chasm", etc.
        displayName = `${berryName.trim()} (${modifier})`;
        npcCount = undefined;
      }

      // Add berry 'count' times
      for (let i = 0; i < count; i++) {
        berries.push({ name: displayName, npcCount });
      }
    }
  }

  return berries;
}

// Data extracted directly from Gen 3 Pokeblock and Contest Lookup TSV file
// Column 20 (last column) contains the berry recommendations
const BERRY_DATA: Record<string, BerryRecommendation[]> = {
  // 1 player, no extras - Lines 5-9
  '1-false-false-false': [
    { berries: parseBerryString('4x Pomeg 4, 4x Kelpsy 4, 2x Qualot 4, 2x Hondew 4, 1x Grepa 4, Watmel 4') },
    { berries: parseBerryString('4x Pomeg 4, 2x Kelpsy 4, 2x Qualot 4, 1x Hondew 4, 4x Grepa 4, Pamtre 4') },
    { berries: parseBerryString('1x Pomeg 4, 4x Kelpsy 4, 4x Qualot 4, 2x Hondew 4, 2x Grepa 4, Durin 4') },
    { berries: parseBerryString('2x Pomeg 4, 1x Kelpsy 4, 4x Qualot 4, 4x Hondew 4, 2x Grepa 4, Belue 4') },
    { berries: parseBerryString('2x Pomeg 4, 2x Kelpsy 4, 1x Qualot 4, 4x Hondew 4, 4x Grepa 4, Spelon 4') },
  ],

  // 1 player, with GameCube - Lines 11-16
  '1-true-false-false': [
    { berries: parseBerryString('3x Ganlon 4, 3x Salac 4, 2x Petaya 3'),
      notes: 'Allows you to skip buying Apicot berries' },
    { berries: parseBerryString('3x Salac 4, 3x Petaya 4, 2x Apicot 3'),
      notes: 'Allows you to skip buying Ganlon berries' },
    { berries: parseBerryString('2x Salac 4, 3x Petaya 4, 1x Ganlon 3, 2x Apicot 3') },
    { berries: parseBerryString('2x Ganlon 4, 2x Salac 4, 1x Petaya 4, 1x Salac 3, 1x Petaya 3, 1x Apicot 3') },
    { berries: parseBerryString('2x Ganlon 4, 2x Salac 4, 1x Petaya 4, 1x Petaya 3, 2x Apicot 3') },
  ],

  // 1 player, with GameCube and Mirage Island - Lines 18-20
  '1-true-true-false': [
    { berries: parseBerryString('2x Ganlon 4, 3x Salac 4, 1x Liechi 3, 1x Petaya 3, 1x Apicot 3') },
    { berries: parseBerryString('2x Petaya 4, 3x Apicot 4, 2x Liechi 3, 1x Salac 3') },
    { berries: parseBerryString('2x Ganlon 4, 1x Petaya 4, 2x Apicot 4, 2x Liechi 3, 1x Petaya 3') },
  ],

  // 1 player, with GameCube and Berry Master - Lines 28-30
  '1-true-false-true': [
    { berries: parseBerryString('2x Salac 4, 3x Petaya 4, 2x Apicot 4, Ganlon M') },
    { berries: parseBerryString('4x Salac 4, 1x Petaya 4, 1x Petaya 3, 1x Apicot 3, Ganlon M') },
    { berries: parseBerryString('1x Ganlon 4, 2x Salac 4, 2x Apicot 4, 2x Petaya 3, Ganlon M') },
  ],

  // 1 player, with all options - Lines 32-37
  '1-true-true-true': [
    { berries: parseBerryString('2x Ganlon 4, 2x Petaya 4, 1x Apicot 4, 1x Liechi 3, 1x Salac 3, Liechi M') },
    { berries: parseBerryString('2x Ganlon 4, 2x Petaya 4, 1x Apicot 4, 1x Liechi 3, 1x Apicot 3, Salac M') },
    { berries: parseBerryString('2x Ganlon 4, 2x Salac 4, 1x Petaya 4, 2x Liechi 3, Apicot M') },
    { berries: parseBerryString('1x Ganlon 4, 1x Salac 4, 2x Petaya 4, 1x Apicot 4, 1x Ganlon 3, 1x Salac 3, Liechi M') },
    { berries: parseBerryString('1x Ganlon 4, 1x Petaya 4, 3x Apicot 4, 1x Liechi 3, 1x Petaya 3, Salac M') },
    { berries: parseBerryString('1x Salac 4, 2x Petaya 4, 2x Apicot 4, 1x Liechi 3, 1x Salac 3, Ganlon M') },
  ],

  // 2 players, no extras - Lines 39-43
  '2-false-false-false': [
    { berries: parseBerryString('4x Pomeg 4, 1x Kelpsy 4, 4x Qualot 4, 4x Qualot 4, Watmel/Belue') },
    { berries: parseBerryString('1x Pomeg 4, 4x Kelpsy 4, 4x Qualot 4, 4x Grepa 4, Pamtre/Durin') },
    { berries: parseBerryString('4x Pomeg 4, 4x Kelpsy 4, 4x Hondew 4, 1x Grepa 4, Spelon/Watmel') },
    { berries: parseBerryString('4x Pomeg 4, 4x Qualot 4, 1x Hondew 4, 4x Grepa 4, Belue/Pamtre') },
    { berries: parseBerryString('4x Kelpsy 4, 1x Qualot 4, 4x Hondew 4, 4x Grepa 4, Durin/Spelon') },
  ],

  // 2 players, with GameCube - Lines 45-46
  '2-true-false-false': [
    { berries: parseBerryString('1x Ganlon 4, 3x Salac 4, 1x Apicot 4, 2x Petaya 3, Apicot/Ganlon') },
    { berries: parseBerryString('1x Ganlon 4, 3x Salac 4, 1x Petaya 4, 1x Ganlon 3, 1x Petaya 3, Apicot/Ganlon') },
  ],

  // 2 players, with GameCube and Mirage Island - Lines 48-51
  '2-true-true-false': [
    { berries: parseBerryString('1x Ganlon 4, 3x Petaya 4, 1x Apicot 4, 1x Salac 3, 1x Apicot 3, Liechi/Salac') },
    { berries: parseBerryString('1x Ganlon 4, 1x Salac 4, 2x Petaya 4, 1x Apicot 4, 2x Apicot 3, Liechi/Salac') },
    { berries: parseBerryString('1x Ganlon 4, 3x Petaya 4, 1x Apicot 4, 1x Liechi 3, 1x Salac 3, Liechi/Salac') },
    { berries: parseBerryString('1x Ganlon 4, 3x Petaya 4, 1x Apicot 4, 1x Liechi 3, 1x Apicot 3, Liechi/Salac') },
  ],

  // 3 players, no extras - Lines 53-57
  '3-false-false-false': [
    { berries: parseBerryString('3x Magost 3P, 5x Rabuta 3P, 3x Nomel 3P, 2x PQ Filler, Tamato/Durin/Spelon') },
    { berries: parseBerryString('1x Tamato 3P, 4x Cornn 3P, 1x Magost 3P, 5x Rabuta 3P, 1x PQ Filler, 1x GK Filler, Magost/Spelon/Watmel') },
    { berries: parseBerryString('1x Cornn 3P, 4x Magost 3P, 2x Rabuta 3P, 4x Nomel 3P, 1x PQ Filler, 1x HP Filler, Cornn/Belue/Pamtre') },
    { berries: parseBerryString('1x Tamato 3P, 2x Magost 3P, 6x Rabuta 3P, 2x Nomel 3P, 2x PQ Filler, Rabuta/Durin/Pamtre') },
    { berries: parseBerryString('5x Rabuta 3P, 6x Nomel 3P, 2x PQ Filler, Cornn/Belue/Pamtre') },
  ],

  // 3 players, with GameCube - Lines 59-60
  '3-true-false-false': [
    { berries: parseBerryString('1x Ganlon 3P, 1x Salac 3P, 3x Petaya 3P, 2x Salac 4, Apicot/Ganlon/Pamtre') },
    { berries: parseBerryString('2x Salac 3P, 3x Petaya 3P, 1x Ganlon 4, 1x Apicot 4, Apicot/Ganlon/Pamtre') },
  ],

  // 3 players, with GameCube and Mirage Island - Lines 62-63
  '3-true-true-false': [
    { berries: parseBerryString('Liechi 3P, Ganlon 3P, Salac 3P, Petaya 3P, Apicot 3P, Ganlon 4, Petaya 4, Liechi/Salac/Belue') },
    { berries: parseBerryString('Liechi 3P, Ganlon 3P, Salac 3P, Petaya 3P, Apicot 3P, Ganlon 4, Apicot 4, Liechi/Salac/Belue') },
  ],

  // 4 players, no extras - Lines 71-72
  '4-false-false-false': [
    { berries: parseBerryString('3x Tamato 4P, 3x Cornn 4P, 3x Magost 4P, 1x Rabuta 4P, 4x Nomel 4P, Rabuta/Durin/Pamtre/Kelpsy') },
    { berries: parseBerryString('4x Tamato 4P, 3x Cornn 4P, 3x Magost 4P, 3x Rabuta 4P, 1x Nomel 4P, Nomel/Belue/Watmel/Qualot') },
  ],

  // 4 players, with GameCube - Lines 74-75
  '4-true-false-false': [
    { berries: parseBerryString('2x Petaya Valley, 1x Petaya Chasm, 1x Ganlon Slope, 1x Salac Slope, 3x Salac Spread, Apicot/Ganlon/Belue/Pamtre'),
      notes: 'Good enough to max out all stats regardless of nature.' },
    { berries: parseBerryString('1x Apicot Valley, 1x Petaya Valley, 1x Petaya Chasm, 1x Ganlon Duo, 2x Salac Slope, 2x Salac Spread, Ganlon/Petaya/Spelon/Hondew'),
      notes: 'Good enough to max out all stats regardless of nature.' },
  ],

  // 4 players, with GameCube and Mirage Island - Line 78
  '4-true-true-false': [
    { berries: parseBerryString('Ganlon Chasm, 2x Petaya Chasm, Liechi Duo, Salac Duo, Apicot Duo, Ganlon Slope, Apicot Slope, Liechi/Salac/Watmel/Belue'),
      notes: 'Good enough to max out all stats regardless of nature.' },
  ],
};

export function getBerryRecommendations(
  playerCount: 1 | 2 | 3 | 4,
  withGamecube: boolean,
  withMirageIsland: boolean,
  withBerryMaster: boolean
): BerryRecommendation[] {
  // Berry Master is only available for 1 player
  const actualBerryMaster = playerCount === 1 && withBerryMaster;

  // Mirage Island requires GameCube
  const actualMirageIsland = withGamecube && withMirageIsland;

  const key = `${playerCount}-${withGamecube}-${actualMirageIsland}-${actualBerryMaster}`;

  return BERRY_DATA[key] || [];
}
