#!/usr/bin/env node

/**
 * Script to split Wormadam movesets into separate forms (plant, sandy, trash)
 * for pokemon_moves_oras.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVES_FILE = path.join(__dirname, '../src/data/pokemon_moves_oras.json');

// PokeAPI species IDs for Wormadam forms
const WORMADAM_FORMS = {
  'wormadam': 413,  // Base form (Plant Cloak)
  'wormadam-sandy': 10004,
  'wormadam-trash': 10005
};

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
        // We'll need to determine the TM/HM number
        // For now, mark as machine move
        machineMoves[moveName] = 'machine';
      } else if (learnMethod === 'tutor') {
        tutorMoves[moveName] = 'tutor';
      }
    }
  }

  return { levelUpMoves, machineMoves, tutorMoves };
}

function getTMNumber(moveName, existingData) {
  // Try to find the TM number from existing data
  if (existingData.wormadam?.['machine-orasxy']?.moves?.[moveName]) {
    return existingData.wormadam['machine-orasxy'].moves[moveName];
  }
  if (existingData.wormadam?.['machine-oras']?.moves?.[moveName]) {
    return existingData.wormadam['machine-oras'].moves[moveName];
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

async function updateWormadamMoves() {
  console.log('Reading pokemon_moves_oras.json...');
  const movesData = JSON.parse(fs.readFileSync(MOVES_FILE, 'utf8'));

  // Fetch movesets for all three forms
  const formMovesets = {};

  for (const [formName, speciesId] of Object.entries(WORMADAM_FORMS)) {
    const moves = await fetchMoveset(speciesId);
    formMovesets[formName] = parseMoveData(moves);
  }

  // Build entries for each form
  console.log('\nBuilding form entries...');

  const newEntries = {};
  for (const [formName, { levelUpMoves, machineMoves, tutorMoves }] of Object.entries(formMovesets)) {
    console.log(`\n${formName}:`);
    console.log(`  Level-up moves: ${Object.keys(levelUpMoves).length}`);
    console.log(`  Machine moves: ${Object.keys(machineMoves).length}`);
    console.log(`  Tutor moves: ${Object.keys(tutorMoves).length}`);

    newEntries[formName] = buildFormEntry(levelUpMoves, machineMoves, tutorMoves, movesData);
  }

  // Remove old wormadam entry and add new form-specific entries
  console.log('\nUpdating JSON...');

  // Find the position of wormadam in the file
  const keys = Object.keys(movesData);
  let wormadamIndex = keys.indexOf('wormadam');

  // If not found, try wormadam-plant (in case it was already renamed)
  if (wormadamIndex === -1) {
    wormadamIndex = keys.indexOf('wormadam-plant');
  }

  if (wormadamIndex === -1) {
    throw new Error('Could not find wormadam or wormadam-plant entry in moves data');
  }

  // Create new data object with updated entries
  const updatedData = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    if (key === 'wormadam' || key === 'wormadam-plant') {
      // Update wormadam and add other forms (skip if we already added them)
      if (!updatedData['wormadam']) {
        updatedData['wormadam'] = newEntries['wormadam'];
        updatedData['wormadam-sandy'] = newEntries['wormadam-sandy'];
        updatedData['wormadam-trash'] = newEntries['wormadam-trash'];
      }
    } else {
      updatedData[key] = movesData[key];
    }
  }

  // Write back to file
  console.log('\nWriting updated data...');
  fs.writeFileSync(MOVES_FILE, JSON.stringify(updatedData, null, 2), 'utf8');

  console.log('\n✓ Successfully updated Wormadam movesets!');
  console.log('  - Updated wormadam (Plant Cloak)');
  console.log('  - Added wormadam-sandy (Sandy Cloak)');
  console.log('  - Added wormadam-trash (Trash Cloak)');
}

// Run the script
updateWormadamMoves().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
