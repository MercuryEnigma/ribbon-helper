/**
 * Extract SM (Gen 7) pokedex, moves, and setdex data from the
 * damage-calc JS files which use jQuery $.extend() inheritance chains.
 *
 * Usage: node extract_sm_data.js
 * Outputs JSON files to ../../data/battle-facilities/sunmoon/
 */

const fs = require('fs');
const path = require('path');

// Minimal $.extend polyfill (deep merge)
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key]);
  }
  return clone;
}

function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (!src) continue;
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        deepMerge(target[key], src[key]);
      } else if (Array.isArray(src[key])) {
        target[key] = [...src[key]];
      } else {
        target[key] = src[key];
      }
    }
  }
  return target;
}

// Mock jQuery - $.extend(true, target, ...sources) does deep merge INTO target
const $ = {
  extend: function(deep, target, ...sources) {
    if (deep === true) {
      return deepMerge(target, ...sources);
    }
    // shallow extend
    return Object.assign(target, ...sources);
  }
};

// ── Load pokedex ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/pokedex.js'), 'utf8'));

// After eval, POKEDEX_SM should be defined (with formes merged in)
const pokedexSM = POKEDEX_SM;

// ── Load moves ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/move_data.js'), 'utf8'));
const movesSM = MOVES_SM;

// ── Load setdex ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/setdex_gen7_sets.js'), 'utf8'));
const setdexSM = SETDEX_GEN7;

// ── Output ──
const outDir = path.join(__dirname, '../../data/battle-facilities/sunmoon');

// Remove the "sl" (special) stat from pokedex entries - not used in gen7
for (const mon of Object.values(pokedexSM)) {
  if (mon.bs && 'sl' in mon.bs) {
    delete mon.bs.sl;
  }
}

// Remove the "level" and "tier" field from setdex entries (we set level in our own config)
for (const sets of Object.values(setdexSM)) {
  for (const set of Object.values(sets)) {
    delete set.level;
    delete set.tier;
  }
}

fs.writeFileSync(path.join(outDir, 'pokedex_sm.json'), JSON.stringify(pokedexSM, null, 2));
fs.writeFileSync(path.join(outDir, 'moves_sm.json'), JSON.stringify(movesSM, null, 2));
fs.writeFileSync(path.join(outDir, 'setdex_sm.json'), JSON.stringify(setdexSM, null, 2));

console.log('Wrote pokedex_sm.json (' + Object.keys(pokedexSM).length + ' pokemon)');
console.log('Wrote moves_sm.json (' + Object.keys(movesSM).length + ' moves)');
console.log('Wrote setdex_sm.json (' + Object.keys(setdexSM).length + ' pokemon with sets)');
