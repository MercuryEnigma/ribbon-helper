/**
 * Scrape Battle Tree trainer Pokemon from Bulbapedia and match to setdex entries.
 *
 * Usage: node scrape_trainer_pokemon_sm.js
 *
 * This script:
 * 1. Fetches each trainer class page from Bulbapedia
 * 2. Parses the HTML table rows to extract Pokemon (name, item, moves, nature)
 * 3. Matches to setdex entries by comparing nature + item + moves
 * 4. Outputs trainer_pokemon_sm.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load setdex
const setdex = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../data/battle-facilities/sunmoon/setdex_sm.json'), 'utf8'
));

// Normalize move names - setdex has "(Doubled)" suffix for Avalanche/Revenge etc.
function normalizeMoves(moves) {
  return moves.map(m => m.replace(/\s*\(Doubled\)/g, ''));
}

// Build reverse lookup: "species|nature|item|sortedMoves" -> setLabel
const setdexLookup = new Map();
for (const [species, sets] of Object.entries(setdex)) {
  for (const [label, set] of Object.entries(sets)) {
    const moves = normalizeMoves([...set.moves]).filter(m => m).sort().join(',');
    const key = `${species}|${set.nature}|${set.item}|${moves}`;
    setdexLookup.set(key, label);
    // Also store with just species + nature + moves (for fuzzy item matching)
    const keyNoItem = `${species}|${set.nature}|${moves}`;
    if (!setdexLookup.has('noitem:' + keyNoItem)) {
      setdexLookup.set('noitem:' + keyNoItem, label);
    }
  }
}

// Trainer class pages - just the slug and list of all trainer names on that page
const trainerPages = [
  { slug: "Youngster", names: ["Florian", "Robin", "Max", "Bert", "Napoleon", "Brady"] },
  { slug: "Lass", names: ["Sophia", "Shanta", "Rachel", "Chan", "Samantha", "Inez"] },
  { slug: "Preschooler", names: ["Ferdinand", "Rico", "Rocky", "Jasper", "Kendra", "Mercy", "Helen", "Gladys", "Niara", "Victor", "Reina", "Naya"] },
  { slug: "Backpacker", names: ["Darla", "Tammy", "Reese", "Kayla", "Gwenny", "Fernanda"] },
  { slug: "Hiker", names: ["Cleavant", "Buster", "Arlo", "Levine", "Vivek", "Stellan"] },
  { slug: "Office_Worker", names: ["Percy", "Conley", "Emery", "Winnie", "Prudence", "Dominica", "Savir", "Harding", "Darrel", "Jana"] },
  { slug: "Punk_Guy", names: ["Kass", "Scoop", "Dylan", "Evander", "Etta", "Dustin"] },
  { slug: "Punk_Girl", names: ["Myrna", "Eva", "Agrata", "Abby", "Zed", "Edda"] },
  { slug: "Youth_Athlete", names: ["Parker", "Isaac", "Ayden", "Alwyn", "Mardea", "Gabriella", "Leena", "Buddy", "Hilario", "Thamina"] },
  { slug: "Rising_Star", names: ["Ryder", "Christopher", "Sorley", "Beatrice", "Brandi", "Marsha", "Dolly", "Erix", "Joaquin", "Marianne"] },
  { slug: "Sightseer", names: ["Cooper", "Darien", "Hart", "Kaula", "Charlene", "Odessa", "Alice", "Chen", "Christian", "Ezra"] },
  { slug: "Janitor", names: ["Jairo", "Xaden", "Giles", "Sika", "Paulo"] },
  { slug: "Worker", names: ["Skip", "JT", "Benjamin", "Dan", "Omar"] },
  { slug: "Gentleman", names: ["Henry", "Ikram", "Jerry", "Mechabob", "Abel"] },
  { slug: "Madame", names: ["Cheryl", "Christy", "Verna", "Donny", "Gracie"] },
  { slug: "Collector", names: ["Duncan", "Nobunaga", "Sam", "Dennis"] },
  { slug: "Golfer", names: ["Arnon", "Alim", "Zeno", "Anisa", "Calliope", "Christina", "Patrick", "Moe", "Bruce", "Susanna"] },
  { slug: "Pok%C3%A9mon_Breeder", names: ["Nedry", "Sheridan", "Kiernan", "Dara", "Rada", "Gertrude", "Lori", "Colby", "Danby", "Izel"] },
  { slug: "Bellhop", names: ["Dyson", "Chip", "Zero", "Donna", "Gilroy"] },
  { slug: "Cook", names: ["Julien", "Sly", "Noah", "Larry", "Tony"] },
  { slug: "Firefighter", names: ["Brantley", "Camber", "Presta", "Calder"] },
  { slug: "Police_Officer", names: ["Rendor", "Lou", "Benji"] },
  { slug: "Scientist", names: ["Cal", "Tivon", "Robyn", "Stein", "Cadel"] },
  { slug: "Black_Belt", names: ["Chucky", "Iniko", "Arnold", "Boris", "Bryson"] },
  { slug: "Dancer", names: ["Carrie", "Variel", "Atalanta", "Jo", "Tasanee"] },
  { slug: "Aether_Foundation", names: ["Harvey", "Luke", "Heidi", "Haley"] },
  { slug: "Ace_Trainer", names: ["Granville", "Raz", "Lea", "Sylvia", "Levi", "Hashim", "Munin", "Poppy", "Tamah", "Bette", "Horace"] },
  { slug: "Veteran", names: ["Kikujiro", "Xenophon", "Placido", "Ignacio", "Aino", "Xio", "Priya", "Candy", "Dooley", "Demiathena"] },
  { slug: "Pok%C3%A9mon_Center_Lady", names: ["Perri"] },
];

// Special trainers are on the main page
const specialTrainerSlugs = ["Anabel", "Colress", "Cynthia", "Dexio", "Grimsley", "Guzma", "Kiawe", "Mallow", "Plumeria", "Red", "Blue", "Sina", "Wally"];

function fetch(url) {
  return new Promise((resolve, reject) => {
    const doFetch = (fetchUrl) => {
      https.get(fetchUrl, { headers: { 'User-Agent': 'RibbonHelper/1.0 (Pokemon research tool)' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doFetch(res.headers.location);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    };
    doFetch(url);
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const NATURES = ['Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle', 'Hardy', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid'];

// Map sprite filename suffixes to form names
const FORM_MAP = {
  'A': '-Alola',        // e.g. 051AMS6.png = Dugtrio-Alola
  'Se': '-Sensu',       // Oricorio-Sensu
  'Pa': "-Pa'u",        // Oricorio-Pa'u
  'Pp': '-Pom-Pom',     // Oricorio-Pom-Pom
  'Ba': '-Baile',       // Oricorio-Baile
  'H': '-Heat',         // Rotom-Heat
  'W': '-Wash',         // Rotom-Wash
  'Fr': '-Frost',       // Rotom-Frost
  'Fa': '-Fan',         // Rotom-Fan
  'L': '-Mow',          // Rotom-Mow (L for Lawn)
  'Md': '-Midday',      // Lycanroc-Midday
  'Mn': '-Midnight',    // Lycanroc-Midnight
};

function detectForm(row) {
  // Check sprite filename for form indicators
  // Format: XXXssMS6.png where XXX is dex number and ss is form suffix
  const spriteMatch = row.match(/(\d{3})([A-Za-z]+)?MS\d+\.png/);
  if (spriteMatch && spriteMatch[2]) {
    const suffix = spriteMatch[2];
    for (const [key, form] of Object.entries(FORM_MAP)) {
      if (suffix === key) return form;
    }
    // Return raw suffix for debugging
    return { raw: suffix };
  }
  return null;
}

// Parse Pokemon rows from HTML table using multiline regex
function parsePokemonFromTable(tableHtml) {
  const pokemon = [];
  const rowRegex = /<tr[\s\S]*?<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[0];
    if (row.includes('<th')) continue;

    // Extract species: text link to Pokemon page
    const nameMatch = row.match(/<a href="\/wiki\/[^"]+\(Pok[^"]*\)"[^>]*>([^<]+)<\/a>/);
    if (!nameMatch) continue;
    let species = nameMatch[1].trim();

    // Detect form from sprite image
    const form = detectForm(row);
    if (form && typeof form === 'string') {
      if (form.startsWith('-')) {
        species = species + form;
      } else if (form.startsWith('Mega ')) {
        species = form + species;
      }
    }

    // Extract item: Bag_ image followed by item link
    let item = '';
    const itemMatch = row.match(/Bag_[^"]*"[^>]*>[^<]*<\/a><\/span>(?:&#160;|\s)*<a[^>]*>([^<]+)<\/a>/);
    if (itemMatch) item = itemMatch[1].trim();

    // Extract moves
    const moves = [];
    const moveRegex = /\(move\)"[^>]*><span[^>]*>([^<]+)<\/span><\/a>/g;
    let mm;
    while ((mm = moveRegex.exec(row)) !== null) {
      moves.push(mm[1].trim());
    }

    // Extract nature
    let nature = '';
    for (const n of NATURES) {
      if (row.includes('>' + n + '\n') || row.includes('>' + n + '<')) {
        nature = n;
        break;
      }
    }

    if (species && nature && moves.length > 0) {
      pokemon.push({ species, item, moves, nature });
    }
  }

  return pokemon;
}

// Match a Pokemon to its setdex label
function matchToSetdex(poke) {
  const sortedMoves = [...poke.moves].sort().join(',');

  // Try exact match
  const key = `${poke.species}|${poke.nature}|${poke.item}|${sortedMoves}`;
  if (setdexLookup.has(key)) return setdexLookup.get(key);

  // Try without item
  const keyNoItem = `noitem:${poke.species}|${poke.nature}|${sortedMoves}`;
  if (setdexLookup.has(keyNoItem)) return setdexLookup.get(keyNoItem);

  // Try species + moves only (nature might differ in how it's read)
  for (const [k, v] of setdexLookup.entries()) {
    if (!k.startsWith('noitem:') && k.startsWith(poke.species + '|') && k.endsWith('|' + sortedMoves)) {
      return v;
    }
  }

  // For species without form (Oricorio, Rotom, Lycanroc), try all form variants
  const baseSpecies = poke.species;
  const formVariants = Object.keys(setdex).filter(sp => sp.startsWith(baseSpecies + '-') || sp === baseSpecies);
  for (const variant of formVariants) {
    if (variant === baseSpecies) continue; // already tried
    const varKey = `${variant}|${poke.nature}|${poke.item}|${sortedMoves}`;
    if (setdexLookup.has(varKey)) return setdexLookup.get(varKey);
    const varKeyNoItem = `noitem:${variant}|${poke.nature}|${sortedMoves}`;
    if (setdexLookup.has(varKeyNoItem)) return setdexLookup.get(varKeyNoItem);
    for (const [k, v] of setdexLookup.entries()) {
      if (!k.startsWith('noitem:') && k.startsWith(variant + '|') && k.endsWith('|' + sortedMoves)) {
        return v;
      }
    }
  }

  return `${poke.species}-?`;
}

function parseTrainerClassPage(html, allNames) {
  const result = {};

  // Split by h3 sections - each has a header with trainer names and a table of Pokemon
  const sections = html.split(/<h3>/g);

  for (const section of sections) {
    const headerMatch = section.match(/class="mw-headline"[^>]*>([^<]+)<\/span>/);
    if (!headerMatch) continue;
    const header = headerMatch[1].trim();

    // Find which of our expected trainer names appear in this header
    const matchedNames = allNames.filter(n => header.includes(n));
    if (matchedNames.length === 0) continue;

    // Find the table in this section
    const tableMatch = section.match(/<table[^>]*class="roundy sortable"[\s\S]*?<\/table>/);
    if (!tableMatch) continue;

    const pokemon = parsePokemonFromTable(tableMatch[0]);
    if (pokemon.length === 0) continue;

    const labels = pokemon.map(p => matchToSetdex(p));
    for (const name of matchedNames) {
      result[name] = labels;
    }
  }

  return result;
}

async function main() {
  const allTrainerPokemon = {};
  let totalUnmatched = 0;

  for (let i = 0; i < trainerPages.length; i++) {
    const page = trainerPages[i];
    const url = `https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tree_Trainers/${page.slug}`;
    console.log(`[${i + 1}/${trainerPages.length}] Fetching ${page.slug}...`);

    try {
      const html = await fetch(url);
      const parsed = parseTrainerClassPage(html, page.names);
      const count = Object.keys(parsed).length;

      for (const [name, pokemon] of Object.entries(parsed)) {
        allTrainerPokemon[name] = pokemon;
        const unmatched = pokemon.filter(p => p.endsWith('-?')).length;
        if (unmatched > 0) totalUnmatched += unmatched;
      }

      console.log(`  Found ${count} trainers, ${Object.values(parsed).flat().length} Pokemon`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    if (i < trainerPages.length - 1) await sleep(1500);
  }

  // Fetch special trainers from the main page
  console.log(`\nFetching special trainers from main page...`);
  try {
    const mainHtml = fs.existsSync('/tmp/battle_tree_trainers.html')
      ? fs.readFileSync('/tmp/battle_tree_trainers.html', 'utf8')
      : await fetch('https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tree_Trainers');

    for (const name of specialTrainerSlugs) {
      // Find the section for this trainer
      const regex = new RegExp(`id="${name}"[\\s\\S]*?<table[^>]*class="roundy sortable"[\\s\\S]*?<\\/table>`, 'i');
      const match = mainHtml.match(regex);
      if (match) {
        const pokemon = parsePokemonFromTable(match[0]);
        if (pokemon.length > 0) {
          allTrainerPokemon[name] = pokemon.map(p => matchToSetdex(p));
          console.log(`  ${name}: ${pokemon.length} Pokemon`);
        }
      }
    }
  } catch (err) {
    console.error(`  Error fetching special trainers: ${err.message}`);
  }

  const outDir = path.join(__dirname, '../../data/battle-facilities/sunmoon');
  fs.writeFileSync(
    path.join(outDir, 'trainer_pokemon_sm.json'),
    JSON.stringify(allTrainerPokemon, null, 2)
  );

  const total = Object.values(allTrainerPokemon).reduce((s, arr) => s + arr.length, 0);
  const unmatched = Object.values(allTrainerPokemon).flat().filter(p => p.endsWith('-?')).length;
  console.log(`\nWrote trainer_pokemon_sm.json`);
  console.log(`  ${Object.keys(allTrainerPokemon).length} trainers`);
  console.log(`  ${total} total Pokemon entries`);
  console.log(`  ${unmatched} unmatched (marked -?)`);
  console.log(`  ${total - unmatched} matched to setdex`);
}

main().catch(console.error);
