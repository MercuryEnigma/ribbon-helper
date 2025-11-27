import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the TSV file
const tsvPath = path.join(__dirname, '../src/data/Gen 3 Pokeblock and Contest Lookup - Efficient Blocks.tsv');
const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
const lines = tsvContent.split('\n');

const pokeblocks = {};

// Track current context
let currentContext = {
  gamecube: false,
  mirage: false,
  blendMaster: false,
  finishing: false,
  eReader: false,
  japaneseEReader: false
};

// Process each line
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split('\t');

  // Skip header and empty lines
  if (i < 3 || !line.trim()) continue;

  const firstCol = parts[0] || '';

  // Helper to validate nickname (must be quoted and not a number)
  const extractNickname = (value) => {
    if (!value) return null;
    const trimmed = value.trim();
    // Must be quoted
    if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;
    const nickname = trimmed.replace(/^"(.*)"$/, '$1');
    // Must not be a pure number or decimal (like "4.73")
    if (/^[\d.]+$/.test(nickname)) return null;
    // Must not contain "etc."
    if (nickname.includes('etc.')) return null;
    return nickname;
  };

  // Helper to extract berry names from description
  const extractBerryNames = (description) => {
    if (!description) return '';
    // Remove everything after '+' (like "+ 3 NPC", "+ Master")
    let berries = description.split('+')[0].trim();
    // Remove common non-berry words
    berries = berries.replace(/\s*\(.*?\)\s*/g, ''); // Remove parenthetical notes
    return berries.trim();
  };

  // Parse berry data from this line BEFORE updating context
  // (context lines often have berry data too!)

  // Parse berry data - 3-Player column (columns 19-27)
  const nickname3 = extractNickname(parts[27]);
  if (nickname3) {
    const berryDesc3 = parts[19] || '';
    const spicy = parseInt(parts[20]) || 0;
    const dry = parseInt(parts[21]) || 0;
    const sweet = parseInt(parts[22]) || 0;
    const bitter = parseInt(parts[23]) || 0;
    const sour = parseInt(parts[24]) || 0;
    const feel = parseInt(parts[25]) || 0;

    // Check for e-reader berries in the description
    let eReader = currentContext.eReader;
    let japaneseEReader = currentContext.japaneseEReader;
    if (berryDesc3.includes('Nutpea')) {
      eReader = true;
    }
    if (berryDesc3.includes('Kuo')) {
      japaneseEReader = true;
    }

    if (feel > 0) {
      pokeblocks[nickname3] = {
        berry: extractBerryNames(berryDesc3),
        spicy,
        dry,
        sweet,
        bitter,
        sour,
        feel,
        players: 3,
        npc: 2, // 3 players means 2 NPCs
        gamecube: currentContext.gamecube,
        mirage: currentContext.mirage,
        'blend-master': currentContext.blendMaster,
        finishing: currentContext.finishing,
        'e-reader': eReader,
        'japanese-e-reader': japaneseEReader
      };
    }
  }

  // Parse berry data - 4-Player column (columns 29-37, nickname at 37)
  const nickname4 = extractNickname(parts[37]);
  if (nickname4) {
    const berryDesc4 = parts[29] || '';
    const spicy = parseInt(parts[30]) || 0;
    const dry = parseInt(parts[31]) || 0;
    const sweet = parseInt(parts[32]) || 0;
    const bitter = parseInt(parts[33]) || 0;
    const sour = parseInt(parts[34]) || 0;
    const feel = parseInt(parts[35]) || 0;

    // Check for e-reader berries in the description
    let eReader = currentContext.eReader;
    let japaneseEReader = currentContext.japaneseEReader;
    if (berryDesc4.includes('Nutpea')) {
      eReader = true;
    }
    if (berryDesc4.includes('Kuo')) {
      japaneseEReader = true;
    }

    if (feel > 0) {
      pokeblocks[nickname4] = {
        berry: extractBerryNames(berryDesc4),
        spicy,
        dry,
        sweet,
        bitter,
        sour,
        feel,
        players: 4,
        npc: 3, // 4 players means 3 NPCs
        gamecube: currentContext.gamecube,
        mirage: currentContext.mirage,
        'blend-master': currentContext.blendMaster,
        finishing: currentContext.finishing,
        'e-reader': eReader,
        'japanese-e-reader': japaneseEReader
      };
    }
  }

  // NOW update context based on section headers
  if (firstCol.includes('With GameCube, plus Blend Master')) {
    currentContext.gamecube = true;
    currentContext.blendMaster = true;
    currentContext.mirage = false;
    continue;
  }
  if (firstCol.includes('With Mirage Island, plus Blend Master')) {
    currentContext.gamecube = true;
    currentContext.mirage = true;
    currentContext.blendMaster = true;
    continue;
  }
  if (firstCol.includes('With GameCube')) {
    currentContext.gamecube = true;
    currentContext.mirage = false;
    currentContext.blendMaster = false;
    currentContext.eReader = false;
    currentContext.japaneseEReader = false;
    continue;
  }
  if (firstCol.includes('With Mirage Island')) {
    currentContext.mirage = true;
    continue;
  }
  if (firstCol.includes('With Blend Master') || firstCol.includes('Blend Master')) {
    currentContext.blendMaster = true;
    continue;
  }
  if (firstCol.includes('Finishing Touch')) {
    currentContext.finishing = true;
    continue;
  }
  if (firstCol.includes('Japanese e-Reader')) {
    currentContext.japaneseEReader = true;
    currentContext.eReader = false;
    continue;
  }
  if (firstCol.includes('With e-Reader')) {
    currentContext.eReader = true;
    currentContext.japaneseEReader = false;
    continue;
  }
  if (firstCol.includes('Hoenn berries only')) {
    // Reset to base Hoenn (no special items)
    currentContext = {
      gamecube: false,
      mirage: false,
      blendMaster: false,
      finishing: false,
      eReader: false,
      japaneseEReader: false
    };
    continue;
  }

  // Parse berry data - Solo Player column (columns 1-8)
  const nickname1 = extractNickname(parts[8]);
  if (nickname1) {
    // Parse NPC count and players from berry name
    let players = 1;
    let npc = 0;

    if (firstCol.includes('+ 3 NPC')) {
      npc = 3;
    } else if (firstCol.includes('+ 2 NPC')) {
      npc = 2;
    } else if (firstCol.includes('+ 1 NPC')) {
      npc = 1;
    } else if (firstCol.includes('+ Master')) {
      npc = 0; // Blend master doesn't count as NPC in this context
    }

    const spicy = parseInt(parts[1]) || 0;
    const dry = parseInt(parts[2]) || 0;
    const sweet = parseInt(parts[3]) || 0;
    const bitter = parseInt(parts[4]) || 0;
    const sour = parseInt(parts[5]) || 0;
    const feel = parseInt(parts[6]) || 0;

    if (feel > 0) { // Only add valid entries
      pokeblocks[nickname1] = {
        berry: extractBerryNames(firstCol),
        spicy,
        dry,
        sweet,
        bitter,
        sour,
        feel,
        players,
        npc,
        gamecube: currentContext.gamecube,
        mirage: currentContext.mirage,
        'blend-master': currentContext.blendMaster,
        finishing: currentContext.finishing,
        'e-reader': currentContext.eReader,
        'japanese-e-reader': currentContext.japaneseEReader
      };
    }
  }
}

// Write the JSON file
const jsonPath = path.join(__dirname, '../src/data/pokeblocks.json');
fs.writeFileSync(jsonPath, JSON.stringify(pokeblocks, null, 2));

console.log(`Parsed ${Object.keys(pokeblocks).length} pokeblocks to ${jsonPath}`);
