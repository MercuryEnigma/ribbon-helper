import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { calculatePokeblockFromBerries } from '../src/berry-blending/pokeblockBlending.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const useCsv = process.argv.includes('--useCsv');

// ASSUMED_RPM values (matching pokeblockBlending.ts)
const ASSUMED_RPM = {
  blend_master: 150.0,
  npc: 96.57,
  players: 89.91,
} as const;

interface OriginalPokeblock {
  berry: string;
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  players: number;
  npc: number;
  gamecube: boolean;
  mirage: boolean;
  "blend-master": boolean;
  finishing: boolean;
  "e-reader": boolean;
  "japanese-e-reader": boolean;
}

interface NpcBerryEntry {
  npc_1: string;
  npc_2: string;
  npc_3: string;
  blend_master: string;
}

interface OutputPokeblock {
  description: string;
  berries: string[];
  spicy: number;
  dry: number;
  sweet: number;
  bitter: number;
  sour: number;
  feel: number;
  efficiency: number;
  rpm: number;
  players: number;
  npc: number;
  gamecube: boolean;
  mirage: boolean;
  "blend-master": boolean;
  finishing: boolean;
  "e-reader": boolean;
  "japanese-e-reader": boolean;
}

const CSV_COLUMNS = {
  nickname: 0,
  berries: 1,
  spicy: 2,
  dry: 3,
  sweet: 4,
  bitter: 5,
  sour: 6,
  feel: 7,
  // index 8 is efficiency, 9 is intentionally blank
  japaneseEReader: 10,
  eReader: 11,
  blendMaster: 12,
  mirage: 13,
  gamecube: 14,
  npc: 15,
  players: 16,
  finishing: 17,
} as const;

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++; // handle CRLF
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
};

const parseNumber = (value?: string): number => {
  const parsed = Number((value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseBoolean = (value?: string): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
};

const normalizeBerries = (rawBerries: string): string[] => {
  const beforePlus = rawBerries.split('+')[0] || '';
  return beforePlus
    .split(',')
    .map((berry) => berry.trim())
    .filter((berry) => berry.length > 0);
};

const createNicknameFromBerries = (berries: string[]): string => {
  if (berries.length === 0) {
    return 'unknown';
  }
  const [first, ...rest] = berries;
  const suffix = rest.map((berry) => berry.slice(0, 2)).join('');
  return `${first}${suffix}`;
};

const loadPokeblocksFromCsv = (csvPath: string): Record<string, OriginalPokeblock> => {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);
  // Drop header row
  rows.shift();

  const records: Record<string, OriginalPokeblock> = {};

  for (const row of rows) {
    if (!row || row.every((cell) => cell.trim().length === 0)) {
      continue;
    }

    const rawBerries = (row[CSV_COLUMNS.berries] ?? '').replace(/^\uFEFF/, '');
    const berries = normalizeBerries(rawBerries);
    if (berries.length === 0) {
      continue;
    }

    const rawNickname = (row[CSV_COLUMNS.nickname] ?? '').replace(/^\uFEFF/, '').trim();
    const nickname = rawNickname.length > 0 ? rawNickname : createNicknameFromBerries(berries);

    records[nickname] = {
      berry: berries.join(', '),
      spicy: parseNumber(row[CSV_COLUMNS.spicy]),
      dry: parseNumber(row[CSV_COLUMNS.dry]),
      sweet: parseNumber(row[CSV_COLUMNS.sweet]),
      bitter: parseNumber(row[CSV_COLUMNS.bitter]),
      sour: parseNumber(row[CSV_COLUMNS.sour]),
      feel: parseNumber(row[CSV_COLUMNS.feel]),
      players: parseNumber(row[CSV_COLUMNS.players]),
      npc: parseNumber(row[CSV_COLUMNS.npc]),
      gamecube: parseBoolean(row[CSV_COLUMNS.gamecube]),
      mirage: parseBoolean(row[CSV_COLUMNS.mirage]),
      "blend-master": parseBoolean(row[CSV_COLUMNS.blendMaster]),
      finishing: parseBoolean(row[CSV_COLUMNS.finishing]),
      "e-reader": parseBoolean(row[CSV_COLUMNS.eReader]),
      "japanese-e-reader": parseBoolean(row[CSV_COLUMNS.japaneseEReader]),
    };
  }

  return records;
};

// Load input files
const pokeblocksPath = path.join(__dirname, '../src/data/pokeblocks.json');
const pokeblocksCsvPath = path.join(__dirname, '../src/data/gen3Pokeblocks_v2.csv');
const npcBerriesPath = path.join(__dirname, '../src/data/npc_berries_rse.json');
const outputPath = path.join(__dirname, '../src/data/pokeblocks_v2.json');

const pokeblocks: Record<string, OriginalPokeblock> = useCsv
  ? loadPokeblocksFromCsv(pokeblocksCsvPath)
  : JSON.parse(fs.readFileSync(pokeblocksPath, 'utf-8'));
const npcBerries: Record<string, NpcBerryEntry> = JSON.parse(
  fs.readFileSync(npcBerriesPath, 'utf-8')
);

const result: Record<string, OutputPokeblock> = {};

for (const [name, pokeblock] of Object.entries(pokeblocks)) {
  // Step 1: Parse berry field as comma-separated list
  const playerBerries = pokeblock.berry
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  // The main berry (first one) is used to look up NPC berries
  const mainBerry = playerBerries[0];
  const npcEntry = npcBerries[mainBerry];

  // Step 2: Build full berry list
  const allBerries: string[] = [...playerBerries];

  // Step 3: Add NPC berries based on npc count
  if (pokeblock.npc > 0 && npcEntry) {
    if (pokeblock.npc >= 1 && npcEntry.npc_1) {
      allBerries.push(npcEntry.npc_1);
    }
    if (pokeblock.npc >= 2 && npcEntry.npc_2) {
      allBerries.push(npcEntry.npc_2);
    }
    if (pokeblock.npc >= 3 && npcEntry.npc_3) {
      allBerries.push(npcEntry.npc_3);
    }
  }

  // Step 4: Add blend master berry if blend-master is true and solo blending
  // (When players > 1 with blend-master, the blend master is one of the players)
  if (pokeblock["blend-master"] && pokeblock.players === 1 && npcEntry && npcEntry.blend_master) {
    allBerries.push(npcEntry.blend_master);
  }

  // Step 5: Determine RPM
  let rpm: number;
  if (pokeblock["blend-master"]) {
    rpm = ASSUMED_RPM.blend_master;
  } else if (pokeblock.npc > 0) {
    rpm = ASSUMED_RPM.npc;
  } else {
    rpm = ASSUMED_RPM.players;
  }

  // Step 6: Calculate pokeblock stats
  let blendedResult;
  try {
    blendedResult = calculatePokeblockFromBerries(allBerries, rpm);
  } catch (error) {
    console.error(`Error calculating ${name}: ${error}`);
    console.error(`  Berries: ${allBerries.join(', ')}`);
    continue;
  }

  // Step 7: Build output object
  result[name] = {
    description: name,
    berries: allBerries,
    spicy: blendedResult.spicy,
    dry: blendedResult.dry,
    sweet: blendedResult.sweet,
    bitter: blendedResult.bitter,
    sour: blendedResult.sour,
    feel: blendedResult.feel,
    efficiency: blendedResult.efficiency,
    rpm: rpm,
    players: pokeblock.players,
    npc: pokeblock.npc,
    gamecube: pokeblock.gamecube,
    mirage: pokeblock.mirage,
    "blend-master": pokeblock["blend-master"],
    finishing: pokeblock.finishing,
    "e-reader": pokeblock["e-reader"],
    "japanese-e-reader": pokeblock["japanese-e-reader"],
  };
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Converted ${Object.keys(result).length} pokeblocks to ${outputPath}`);
