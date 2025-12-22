#!/usr/bin/env node

/**
 * Script to add Meowstic-F (female) moveset to pokemon_moves_oras.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVES_FILE = path.join(__dirname, '../src/data/pokemon_moves_oras.json');

// PokeAPI species IDs
const MEOWSTIC_FEMALE_ID = 10025;

async function fetchMoveset(speciesId) {
  const url = `https://pokeapi.co/api/v2/pokemon/${speciesId}`;
  console.log(`Fetching moves for species ${speciesId}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.moves;
}

function parseMoveData(moves, generation = 'omega-ruby-alpha-sapphire') {
  const levelUpMoves = {};
  const machineMoves = {};
  const tutorMoves = {};

  for (const moveEntry of moves) {
    const moveName = moveEntry.move.name;

    for (const versionDetail of moveEntry.version_group_details) {
      if (versionDetail.version_group.name !== generation) continue;

      const learnMethod = versionDetail.move_learn_method.name;
      const level = versionDetail.level_learned_at;

      if (learnMethod === 'level-up' && level > 0) {
        levelUpMoves[moveName] = level;
      } else if (learnMethod === 'machine') {
        machineMoves[moveName] = 'machine';
      } else if (learnMethod === 'tutor') {
        tutorMoves[moveName] = 'tutor';
      }
    }
  }

  return { levelUpMoves, machineMoves, tutorMoves };
}

function getTMNumber(moveName, existingData) {
  // Try to find the TM number from existing meowstic data
  if (existingData.meowstic?.['machine-orasxy']?.moves?.[moveName]) {
    return existingData.meowstic['machine-orasxy'].moves[moveName];
  }
  if (existingData.meowstic?.['machine-oras']?.moves?.[moveName]) {
    return existingData.meowstic['machine-oras'].moves[moveName];
  }
  return null;
}

function buildFormEntry(levelUpMoves, machineMoves, tutorMoves, existingData) {
  const entry = {};

  // Level-up moves
  if (Object.keys(levelUpMoves).length > 0) {
    entry['level-up-orasxy'] = {
      version: 'orasxy',
      moves: levelUpMoves
    };
  }

  // Machine moves (TM/HM)
  const orasxyMachines = {};
  const orasMachines = {};

  for (const moveName of Object.keys(machineMoves)) {
    const tmNumber = getTMNumber(moveName, existingData);
    if (tmNumber) {
      if (tmNumber === 'tm-94') {
        // Secret Power is ORAS-only
        orasMachines[moveName] = tmNumber;
      } else {
        orasxyMachines[moveName] = tmNumber;
      }
    }
  }

  if (Object.keys(orasxyMachines).length > 0) {
    entry['machine-orasxy'] = {
      version: 'orasxy',
      moves: orasxyMachines
    };
  }

  if (Object.keys(orasMachines).length > 0) {
    entry['machine-oras'] = {
      version: 'oras',
      moves: orasMachines
    };
  }

  // Tutor moves
  if (Object.keys(tutorMoves).length > 0) {
    entry['tutor-oras'] = {
      version: 'oras',
      moves: tutorMoves
    };
  }

  return entry;
}

async function addMeowsticFMoves() {
  console.log('Reading pokemon_moves_oras.json...');
  const movesData = JSON.parse(fs.readFileSync(MOVES_FILE, 'utf8'));

  // Check if meowstic-f already exists
  if (movesData['meowstic-f']) {
    console.log('⚠️  meowstic-f entry already exists. Updating it...');
  }

  // Fetch moveset for Meowstic-F
  console.log('\nFetching Meowstic-F moveset...');
  const moves = await fetchMoveset(MEOWSTIC_FEMALE_ID);
  const { levelUpMoves, machineMoves, tutorMoves } = parseMoveData(moves);

  console.log('\nMeowstic-F moves:');
  console.log(`  Level-up moves: ${Object.keys(levelUpMoves).length}`);
  console.log(`  Machine moves: ${Object.keys(machineMoves).length}`);
  console.log(`  Tutor moves: ${Object.keys(tutorMoves).length}`);

  // Build entry for Meowstic-F
  const meowsticFEntry = buildFormEntry(levelUpMoves, machineMoves, tutorMoves, movesData);

  // Find the position of meowstic in the file
  const keys = Object.keys(movesData);
  const meowsticIndex = keys.indexOf('meowstic');

  if (meowsticIndex === -1) {
    throw new Error('Could not find meowstic entry in moves data');
  }

  // Create new data object with meowstic-f added after meowstic
  console.log('\nUpdating JSON...');
  const updatedData = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    // Add the current key
    updatedData[key] = movesData[key];

    // If this is meowstic and meowstic-f doesn't exist yet, add it next
    if (key === 'meowstic' && !movesData['meowstic-f']) {
      updatedData['meowstic-f'] = meowsticFEntry;
    }
  }

  // If meowstic-f already existed, update it
  if (movesData['meowstic-f']) {
    updatedData['meowstic-f'] = meowsticFEntry;
  }

  // Write back to file
  console.log('\nWriting updated data...');
  fs.writeFileSync(MOVES_FILE, JSON.stringify(updatedData, null, 2), 'utf8');

  console.log('\n✓ Successfully added/updated Meowstic-F moveset!');
  console.log('  - meowstic: Male form (unchanged)');
  console.log('  - meowstic-f: Female form (added/updated)');
}

// Run the script
addMeowsticFMoves().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
