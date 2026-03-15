/**
 * Extract Gen 4 (Pt/HGSS) pokedex, moves, and setdex data from the
 * damage-calc JS files which use jQuery $.extend() inheritance chains.
 *
 * Usage: node extract_gen4_data.js
 * Outputs JSON files to ../../data/battle-facilities/pthgss/
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
    return Object.assign(target, ...sources);
  }
};

// ── Load pokedex (builds POKEDEX_RBY → POKEDEX_GSC → POKEDEX_ADV → POKEDEX_DPP) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/pokedex.js'), 'utf8'));
const pokedexDPP = POKEDEX_DPP;

// ── Load moves (builds MOVES_RBY → MOVES_GSC → MOVES_ADV → MOVES_DPP) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/move_data.js'), 'utf8'));
const movesDPP = MOVES_DPP;

// ── Load setdex (SETDEX_PHGSS) ──
eval(fs.readFileSync(path.join(__dirname, 'game_data/setdex_gen4_sets.js'), 'utf8'));
const setdexPHGSS = SETDEX_PHGSS;

// ── Output ──
const outDir = path.join(__dirname, '../../data/battle-facilities/pthgss');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Remove the "sl" (special) stat and "ab" (absent abilities) artifact from pokedex entries
for (const mon of Object.values(pokedexDPP)) {
  if (mon.bs && 'sl' in mon.bs) delete mon.bs.sl;
  if ('ab' in mon) delete mon.ab;
  // Rename "abilities" field if stored as "ab" in some entries — already handled by deepMerge
}

// Remove the "level" and "tier" fields from setdex entries
for (const sets of Object.values(setdexPHGSS)) {
  for (const set of Object.values(sets)) {
    delete set.level;
    delete set.tier;
  }
}

fs.writeFileSync(path.join(outDir, 'pokedex_pthgss.json'), JSON.stringify(pokedexDPP, null, 2));
fs.writeFileSync(path.join(outDir, 'moves_pthgss.json'), JSON.stringify(movesDPP, null, 2));
fs.writeFileSync(path.join(outDir, 'setdex_pthgss.json'), JSON.stringify(setdexPHGSS, null, 2));

console.log('Wrote pokedex_pthgss.json (' + Object.keys(pokedexDPP).length + ' pokemon)');
console.log('Wrote moves_pthgss.json (' + Object.keys(movesDPP).length + ' moves)');
console.log('Wrote setdex_pthgss.json (' + Object.keys(setdexPHGSS).length + ' pokemon with sets)');
