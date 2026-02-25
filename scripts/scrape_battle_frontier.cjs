#!/usr/bin/env node
// Scrapes Bulbapedia for Gen III Battle Frontier trainer data and outputs two JSON files:
//   - battle_trainers_em.json: maps battle ranges to trainer info
//   - trainer_pokemon_em.json: maps trainer names to their Pokemon sets (as setdex labels)
//
// Usage: node scripts/scrape_battle_frontier.js

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bulbapedia.bulbagarden.net/w/index.php?action=raw&title=';
const MAIN_PAGE = 'List_of_Battle_Frontier_Trainers_in_Generation_III';

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'];

// Trainer class subpage names (as they appear in wiki links)
const TRAINER_CLASSES = [
  'Youngster', 'Lass', 'School_Kid', 'Rich_Boy', 'Lady', 'Camper', 'Picnicker',
  'Tuber', 'Swimmer', 'Pokéfan', 'PKMN_Breeder', 'Bug_Catcher', 'Ninja_Boy',
  'Bug_Maniac', 'Fisherman', 'Ruin_Maniac', 'Collector', 'Parasol_Lady',
  'Beauty', 'Aroma_Lady', 'Guitarist', 'Bird_Keeper', 'Sailor', 'Hiker',
  'Kindler', 'Triathlete', 'Black_Belt', 'Battle_Girl', 'Expert', 'Psychic',
  'Hex_Maniac', 'PokéManiac', 'Gentleman', 'Cooltrainer', 'PKMN_Ranger',
  'Dragon_Tamer',
];

// Load the setdex to match Pokemon to their labels
function loadSetdex() {
  const setdexPath = path.join(__dirname, '..', 'src', 'battle-facilities', 'setdex_gen3.ts');
  const content = fs.readFileSync(setdexPath, 'utf8');

  // Extract the object literal (after the first `= {` and before the final `}`)
  const match = content.match(/export const SETDEX_EM[^=]*=\s*(\{[\s\S]*\})\s*$/);
  if (!match) throw new Error('Could not parse setdex');

  // Use eval to parse it (it's a JS object literal)
  const setdex = eval('(' + match[1] + ')');
  return setdex;
}

// Build a lookup map: "species|move1|move2|move3|move4|nature|item" -> setdex label
function buildSetdexLookup(setdex) {
  const lookup = {};
  for (const [species, sets] of Object.entries(setdex)) {
    for (const [label, set] of Object.entries(sets)) {
      // Normalize moves: empty strings become empty, sort is preserved (order matters)
      const moves = set.moves.map(m => m || '').join('|');
      const key = `${species}|${moves}|${set.nature}|${set.item}`;
      lookup[key] = label;
    }
  }
  return lookup;
}

async function fetchPage(title) {
  const url = `${BASE_URL}${encodeURIComponent(title)}`;
  console.log(`Fetching: ${title}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${title}`);
  return await response.text();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Parse the main trainer list page
function parseTrainerList(wikitext) {
  const trainers = [];
  const lines = wikitext.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Look for trainer number lines (e.g., "| 001")
    const numMatch = line.match(/^\|\s*(\d{3})\s*$/);
    if (numMatch) {
      const number = parseInt(numMatch[1], 10);

      // Next line: trainer class (e.g., "| {{tc|Youngster}}")
      i++;
      const classLine = lines[i]?.trim() || '';
      const classMatch = classLine.match(/\{\{tc\|([^}]+)\}\}/);
      const trainerClass = classMatch ? classMatch[1].replace('Ace Trainer|', '') : 'Unknown';

      // Next line: trainer name with link
      i++;
      const nameLine = lines[i]?.trim() || '';
      // Pattern: [[.../Youngster#Brady|Brady]] or [[...#Brady|Brady]]
      const nameMatch = nameLine.match(/#([^|]+)\|([^\]]+)\]\]/);
      const trainerName = nameMatch ? nameMatch[2] : 'Unknown';

      // Also extract the subpage path for later
      const pathMatch = nameLine.match(/\[\[([^#]+)#/);
      const subpage = pathMatch ? pathMatch[1] : '';

      // Next lines: battle range checkmarks (up to 8 columns)
      const battleRanges = [];
      for (let r = 0; r < BATTLE_RANGES.length; r++) {
        i++;
        const rangeLine = lines[i]?.trim() || '';
        if (rangeLine.includes('✔')) {
          battleRanges.push(BATTLE_RANGES[r]);
        }
      }

      trainers.push({
        number,
        class: trainerClass,
        name: trainerName,
        subpage,
        battleRanges,
      });
    }

    i++;
  }

  return trainers;
}

// Parse a trainer class subpage for Pokemon data
function parseTrainerPokemon(wikitext, setdexLookup) {
  const trainerPokemon = {};
  const lines = wikitext.split('\n');

  let currentTrainers = [];

  for (const line of lines) {
    // Section headers like: ===Brady, Conner, and Bradley{{anchor|Brady}}...===
    // or: ===Zachery{{anchor|Zachery}}===
    const headerMatch = line.match(/^===(.+?)===\s*$/);
    if (headerMatch) {
      const headerContent = headerMatch[1];
      // Extract all anchor names
      const anchorMatches = [...headerContent.matchAll(/\{\{anchor\|([^}]+)\}\}/g)];
      currentTrainers = anchorMatches.map(m => m[1]);
    }

    // Pokemon rows: {{lop/facility|game=3|dexNo|name|item|move1|type1|move2|type2|move3|type3|move4|type4|nature|hp|at|df|sa|sd|sp|}}
    const pokeMatch = line.match(/\{\{lop\/facility\|game=3\|(.+?)\}\}/);
    if (pokeMatch && currentTrainers.length > 0) {
      const parts = pokeMatch[1].split('|');
      // parts[0] = dex number, parts[1] = name, parts[2] = item
      // parts[3] = move1, parts[4] = type1, parts[5] = move2, parts[6] = type2
      // parts[7] = move3, parts[8] = type3, parts[9] = move4, parts[10] = type4
      // parts[11] = nature, parts[12-17] = hp,at,df,sa,sd,sp EVs

      const species = normalizeSpeciesName(parts[1]);
      const item = normalizeItemName(parts[2]);
      const move1 = normalizeMoveName(parts[3] || '');
      const move2 = normalizeMoveName(parts[5] || '');
      const move3 = normalizeMoveName(parts[7] || '');
      const move4 = normalizeMoveName(parts[9] || '');
      const nature = parts[11];

      // Build lookup key
      const key = `${species}|${move1}|${move2}|${move3}|${move4}|${nature}|${item}`;
      const setdexLabel = setdexLookup[key];

      if (!setdexLabel) {
        console.warn(`  No setdex match for: ${species} (${nature}, ${item}) [${move1}, ${move2}, ${move3}, ${move4}]`);
      } else {
        for (const trainer of currentTrainers) {
          if (!trainerPokemon[trainer]) trainerPokemon[trainer] = [];
          if (!trainerPokemon[trainer].includes(setdexLabel)) {
            trainerPokemon[trainer].push(setdexLabel);
          }
        }
      }
    }
  }

  return trainerPokemon;
}

// Normalize Bulbapedia move names to match setdex conventions
function normalizeMoveName(move) {
  const moveMap = {
    'AncientPower': 'Ancient Power',
    'BubbleBeam': 'Bubble Beam',
    'DoubleSlap': 'Double Slap',
    'DragonBreath': 'Dragon Breath',
    'DynamicPunch': 'Dynamic Punch',
    'ExtremeSpeed': 'Extreme Speed',
    'Faint Attack': 'Feint Attack',
    'FeatherDance': 'Feather Dance',
    'GrassWhistle': 'Grass Whistle',
    'Hi Jump Kick': 'High Jump Kick',
    'Revenge': 'Revenge (Doubled)',
    'Sand-Attack': 'Sand Attack',
    'Selfdestruct': 'Self-Destruct',
    'SmellingSalt': 'Smelling Salts',
    'Softboiled': 'Soft-Boiled',
    'SolarBeam': 'Solar Beam',
    'SonicBoom': 'Sonic Boom',
    'ThunderPunch': 'Thunder Punch',
    'ViceGrip': 'Vise Grip',
  };
  return moveMap[move] || move;
}

// Normalize Bulbapedia species names to match setdex conventions
function normalizeSpeciesName(species) {
  const speciesMap = {
    'Nidoran♀': 'Nidoran-F',
    'Nidoran♂': 'Nidoran-M',
  };
  // Also normalize curly/smart apostrophes to straight apostrophe
  species = species.replace(/[\u2018\u2019\u0060\u00B4]/g, "'");
  return speciesMap[species] || species;
}

// Normalize Bulbapedia item names to match setdex conventions
function normalizeItemName(item) {
  const itemMap = {
    'NeverMeltIce': 'Never-Melt Ice',
    'TwistedSpoon': 'Twisted Spoon',
    'SilverPowder': 'Silver Powder',
    'BrightPowder': 'Bright Powder',
    'BlackGlasses': 'Black Glasses',
    'DeepSeaTooth': 'Deep Sea Tooth',
    'DeepSeaScale': 'Deep Sea Scale',
  };
  return itemMap[item] || item;
}

// Extract unique subpage paths from trainer list
function getUniqueSubpages(trainers) {
  const subpages = new Set();
  for (const trainer of trainers) {
    if (trainer.subpage) {
      subpages.add(trainer.subpage);
    }
  }
  return [...subpages];
}

async function main() {
  console.log('Loading setdex...');
  const setdex = loadSetdex();
  const setdexLookup = buildSetdexLookup(setdex);
  console.log(`Setdex has ${Object.keys(setdexLookup).length} entries`);

  // 1. Fetch and parse the main trainer list
  console.log('\nFetching main trainer list...');
  const mainPage = await fetchPage(MAIN_PAGE);
  const trainers = parseTrainerList(mainPage);
  console.log(`Found ${trainers.length} trainers`);

  // Build battle_trainers_em.json
  const battleTrainers = trainers.map(t => ({
    number: t.number,
    class: t.class,
    name: t.name,
    battleRanges: t.battleRanges,
  }));

  // 2. Fetch all trainer class subpages and parse Pokemon
  const subpages = getUniqueSubpages(trainers);
  console.log(`\nFetching ${subpages.length} trainer class subpages...`);

  const allTrainerPokemon = {};

  for (const subpage of subpages) {
    // Convert wiki link to page title
    const pageTitle = subpage.replace(/ /g, '_');
    await sleep(500); // Be polite to Bulbapedia
    try {
      const pageContent = await fetchPage(pageTitle);
      const pokemonData = parseTrainerPokemon(pageContent, setdexLookup);

      for (const [trainer, pokemon] of Object.entries(pokemonData)) {
        if (allTrainerPokemon[trainer]) {
          // Merge (shouldn't happen, but just in case)
          for (const p of pokemon) {
            if (!allTrainerPokemon[trainer].includes(p)) {
              allTrainerPokemon[trainer].push(p);
            }
          }
        } else {
          allTrainerPokemon[trainer] = pokemon;
        }
      }
    } catch (err) {
      console.error(`Error fetching ${subpage}: ${err.message}`);
    }
  }

  // Cross-reference: verify all trainers from the main list have Pokemon data
  let matched = 0;
  let unmatched = 0;
  for (const trainer of trainers) {
    if (allTrainerPokemon[trainer.name]) {
      matched++;
    } else {
      console.warn(`No Pokemon data found for trainer: ${trainer.name} (${trainer.class})`);
      unmatched++;
    }
  }
  console.log(`\nMatched ${matched}/${trainers.length} trainers (${unmatched} unmatched)`);

  // Write output files
  const outDir = path.join(__dirname, '..', 'src', 'battle-facilities');

  const battleTrainersPath = path.join(outDir, 'battle_trainers_em.json');
  fs.writeFileSync(battleTrainersPath, JSON.stringify(battleTrainers, null, 2));
  console.log(`\nWrote ${battleTrainersPath}`);

  const trainerPokemonPath = path.join(outDir, 'trainer_pokemon_em.json');
  fs.writeFileSync(trainerPokemonPath, JSON.stringify(allTrainerPokemon, null, 2));
  console.log(`Wrote ${trainerPokemonPath}`);

  // Stats
  const totalPokemonSets = Object.values(allTrainerPokemon).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\nTotal: ${Object.keys(allTrainerPokemon).length} trainers, ${totalPokemonSets} total Pokemon assignments`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
