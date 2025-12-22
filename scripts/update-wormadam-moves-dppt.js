#!/usr/bin/env node

/**
 * Script to split Wormadam movesets into separate forms (plant, sandy, trash)
 * for pokemon_moves_dppt.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOVES_FILE = path.join(__dirname, '../src/data/pokemon_moves_dppt.json');

// PokeAPI species IDs for Wormadam forms
const WORMADAM_FORMS = {
  'wormadam': 413,  // Base form (Plant Cloak)
  'wormadam-sandy': 10004,
  'wormadam-trash': 10005
};

// DPPT version groups
const VERSION_GROUPS = {
  'diamond-pearl': 'dphgsspt',
  'platinum': 'hgsspt',
  'heartgold-soulsilver': 'hgss'
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

function parseMoveData(moves) {
  const levelUpMovesDPHGSSPT = {};
  const levelUpMovesHGSSPT = {};
  const machineMovesDPHGSSPT = {};
  const tutorMovesHGSS = {};
  const tutorMovesHGSSPT = {};

  for (const moveEntry of moves) {
    const moveName = moveEntry.move.name;

    for (const versionDetail of moveEntry.version_group_details) {
      const versionGroup = versionDetail.version_group.name;
      const learnMethod = versionDetail.move_learn_method.name;
      const level = versionDetail.level_learned_at;

      // Level-up moves
      if (learnMethod === 'level-up' && level > 0) {
        if (versionGroup === 'diamond-pearl') {
          levelUpMovesDPHGSSPT[moveName] = level;
        } else if (versionGroup === 'platinum' || versionGroup === 'heartgold-soulsilver') {
          // Check if this move is new in HGSS/Pt (not in DP)
          if (!levelUpMovesDPHGSSPT[moveName]) {
            levelUpMovesHGSSPT[moveName] = level;
          }
        }
      }
      // Machine moves (TM/HM)
      else if (learnMethod === 'machine') {
        if (versionGroup === 'diamond-pearl' ||
            versionGroup === 'platinum' ||
            versionGroup === 'heartgold-soulsilver') {
          machineMovesDPHGSSPT[moveName] = 'machine';
        }
      }
      // Tutor moves
      else if (learnMethod === 'tutor') {
        if (versionGroup === 'heartgold-soulsilver') {
          tutorMovesHGSS[moveName] = 'tutor';
        } else if (versionGroup === 'platinum') {
          tutorMovesHGSSPT[moveName] = 'tutor';
        }
      }
    }
  }

  return {
    levelUpMovesDPHGSSPT,
    levelUpMovesHGSSPT,
    machineMovesDPHGSSPT,
    tutorMovesHGSS,
    tutorMovesHGSSPT
  };
}

function getTMNumber(moveName, existingData) {
  // Try to find the TM number from existing data
  if (existingData.wormadam?.['machine-dphgsspt']?.moves?.[moveName]) {
    return existingData.wormadam['machine-dphgsspt'].moves[moveName];
  }
  return null;
}

function buildFormEntry(moveData, existingData) {
  const {
    levelUpMovesDPHGSSPT,
    levelUpMovesHGSSPT,
    machineMovesDPHGSSPT,
    tutorMovesHGSS,
    tutorMovesHGSSPT
  } = moveData;

  const entry = {};

  // Level-up moves (DP/HGSS/Pt)
  if (Object.keys(levelUpMovesDPHGSSPT).length > 0) {
    entry['level-up-dphgsspt'] = {
      version: 'dphgsspt',
      moves: levelUpMovesDPHGSSPT
    };
  }

  // Level-up moves (HGSS/Pt only)
  if (Object.keys(levelUpMovesHGSSPT).length > 0) {
    entry['level-up-hgsspt'] = {
      version: 'hgsspt',
      moves: levelUpMovesHGSSPT
    };
  }

  // Machine moves (TM/HM)
  const machineMoves = {};
  for (const moveName of Object.keys(machineMovesDPHGSSPT)) {
    const tmNumber = getTMNumber(moveName, existingData);
    if (tmNumber) {
      machineMoves[moveName] = tmNumber;
    }
  }

  if (Object.keys(machineMoves).length > 0) {
    entry['machine-dphgsspt'] = {
      version: 'dphgsspt',
      moves: machineMoves
    };
  }

  // Tutor moves (HGSS only)
  if (Object.keys(tutorMovesHGSS).length > 0) {
    entry['tutor-hgss'] = {
      version: 'hgss',
      moves: tutorMovesHGSS
    };
  }

  // Tutor moves (HGSS/Pt)
  if (Object.keys(tutorMovesHGSSPT).length > 0) {
    entry['tutor-hgsspt'] = {
      version: 'hgsspt',
      moves: tutorMovesHGSSPT
    };
  }

  return entry;
}

async function updateWormadamMoves() {
  console.log('Reading pokemon_moves_dppt.json...');
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
  for (const [formName, moveData] of Object.entries(formMovesets)) {
    console.log(`\n${formName}:`);
    console.log(`  Level-up (DPHGSSPT): ${Object.keys(moveData.levelUpMovesDPHGSSPT).length}`);
    console.log(`  Level-up (HGSSPT): ${Object.keys(moveData.levelUpMovesHGSSPT).length}`);
    console.log(`  Machine moves: ${Object.keys(moveData.machineMovesDPHGSSPT).length}`);
    console.log(`  Tutor (HGSS): ${Object.keys(moveData.tutorMovesHGSS).length}`);
    console.log(`  Tutor (HGSSPT): ${Object.keys(moveData.tutorMovesHGSSPT).length}`);

    newEntries[formName] = buildFormEntry(moveData, movesData);
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

  console.log('\n✓ Successfully updated Wormadam movesets for DPPT!');
  console.log('  - Updated wormadam (Plant Cloak)');
  console.log('  - Added wormadam-sandy (Sandy Cloak)');
  console.log('  - Added wormadam-trash (Trash Cloak)');
}

// Run the script
updateWormadamMoves().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
