/**
 * Extract BDSP pokedex, moves, and setdex data from damage-calc JS source files.
 *
 * Usage: node extract_bdsp_data.js
 * Outputs JSON files to ../../data/battle-facilities/bdsp/
 *
 * Sources:
 *   - POKEDEX_BDSP from game_data/pokedex.js (POKEDEX_SM minus Gen 5+ Pokemon)
 *   - MOVES_SM from game_data/move_data.js (covers all Gen 4 moves + updates)
 *   - SETDEX_GEN80 from game_data/setdex_gen80_sets.js (BDSP Battle Tower sets)
 */

const fs = require('fs');
const path = require('path');

// Minimal $.extend polyfill (deep merge, matches damage-calc's jQuery usage)
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const clone = {};
  for (const key of Object.keys(obj)) clone[key] = deepClone(obj[key]);
  return clone;
}

function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (!src) continue;
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
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

const $ = {
  extend: function(deep, target, ...sources) {
    if (deep === true) return deepMerge(target, ...sources);
    return Object.assign(target, ...sources);
  }
};

// ── Load pokedex (builds chain up to POKEDEX_BDSP) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/pokedex.js'), 'utf8'));
const pokedexBDSP = POKEDEX_BDSP;

// ── Load moves (MOVES_SM covers all Gen 4 moves with Gen 6+ updates) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/move_data.js'), 'utf8'));
const movesBDSP = MOVES_SM;

// ── Load setdex (SETDEX_GEN80 = BDSP Battle Tower sets) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/setdex_gen80_sets.js'), 'utf8'));
const setdexBDSP = SETDEX_GEN80;

// ── Clean up pokedex ──
// Remove the "sl" (special stat) artifact present in some entries
for (const mon of Object.values(pokedexBDSP)) {
  if (mon.bs && 'sl' in mon.bs) delete mon.bs.sl;
  if ('ab' in mon) delete mon.ab;
}

// ── Clean up setdex ──
// Remove "level" and "tier" (we control level via mode config, tier is internal calc data).
// Keep "ability" — BDSP sets have specific abilities that matter for damage calc.
// Keep "ivs" — BDSP sets encode per-set IVs directly.
for (const sets of Object.values(setdexBDSP)) {
  for (const set of Object.values(sets)) {
    delete set.level;
    delete set.tier;
  }
}

// ── Output ──
const outDir = path.join(__dirname, '../../data/battle-facilities/bdsp');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'pokedex_bdsp.json'), JSON.stringify(pokedexBDSP, null, 2));
fs.writeFileSync(path.join(outDir, 'moves_bdsp.json'),   JSON.stringify(movesBDSP, null, 2));
fs.writeFileSync(path.join(outDir, 'setdex_bdsp.json'),  JSON.stringify(setdexBDSP, null, 2));

console.log('Wrote pokedex_bdsp.json (' + Object.keys(pokedexBDSP).length + ' pokemon)');
console.log('Wrote moves_bdsp.json ('   + Object.keys(movesBDSP).length   + ' moves)');
console.log('Wrote setdex_bdsp.json ('  + Object.keys(setdexBDSP).length  + ' pokemon with sets)');
