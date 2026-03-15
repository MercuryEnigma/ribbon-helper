/**
 * Scrape Gen 4 (Pt/HGSS) Battle Tower trainer data from Bulbapedia and match to setdex.
 *
 * Usage: node scrape_gen4_trainers.js
 *
 * Main page: https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Frontier_Trainers_in_Generation_IV
 *
 * Table columns: #, Trainer class, Name, then 8 battle range checkmark columns:
 *   1-7, 8-14, 15-21, 22-28, 29-35, 36-42, 43-49, 50+
 *
 * Each trainer name links to a class subpage:
 *   /wiki/List_of_Battle_Frontier_Trainers_in_Generation_IV/TrainerClass#TrainerName
 *
 * Outputs:
 *   - battle_trainers_pthgss.json
 *   - trainer_pokemon_pthgss.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const setdex = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../data/battle-facilities/pthgss/setdex_pthgss.json'), 'utf8'
));

// Normalize move names from Bulbapedia to match setdex naming.
// Bulbapedia sometimes omits spaces, uses old names, or lacks the "(Doubled)" suffix.
const MOVE_NAME_MAP = {
  'AncientPower':  'Ancient Power',
  'BubbleBeam':    'Bubble Beam',
  'DoubleSlap':    'Double Slap',
  'DragonBreath':  'Dragon Breath',
  'DynamicPunch':  'Dynamic Punch',
  'ExtremeSpeed':  'Extreme Speed',
  'Faint Attack':  'Feint Attack',
  'FeatherDance':  'Feather Dance',
  'GrassWhistle':  'Grass Whistle',
  'Hi Jump Kick':  'High Jump Kick',
  'PoisonPowder':  'Poison Powder',
  'Sand-Attack':   'Sand Attack',
  'Selfdestruct':  'Self-Destruct',
  'SmokeScreen':   'Smokescreen',
  'Softboiled':    'Soft-Boiled',
  'SolarBeam':     'Solar Beam',
  'ThunderPunch':  'Thunder Punch',
  'ThunderShock':  'Thunder Shock',
  'ViceGrip':      'Vise Grip',
};

function normalizeMove(m) {
  return MOVE_NAME_MAP[m] || m;
}

// Normalize setdex move names: remove "(Doubled)" suffix (Bulbapedia lists Avalanche/Revenge without it)
function normalizeSetdexMove(m) {
  return m.replace(/\s*\(Doubled\)$/, '');
}

// Build reverse lookup: "species|nature|item|sortedMoves" -> setLabel
const setdexLookup = new Map();
for (const [species, sets] of Object.entries(setdex)) {
  for (const [label, set] of Object.entries(sets)) {
    const moves = [...set.moves].filter(m => m).map(normalizeSetdexMove).sort().join(',');
    const key = `${species}|${set.nature}|${set.item}|${moves}`;
    setdexLookup.set(key, label);
    const keyNoItem = `${species}|${set.nature}|${moves}`;
    if (!setdexLookup.has('noitem:' + keyNoItem)) {
      setdexLookup.set('noitem:' + keyNoItem, label);
    }
  }
}

const BASE_URL = 'https://bulbapedia.bulbagarden.net';
const CACHE_DIR = '/tmp/gen4_bt_cache';

// Bulbapedia table column labels (used to read checkmarks — not stored in output)
const RANGE_LABELS = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'];

function fetchUrl(url, cacheKey) {
  if (cacheKey) {
    const cachePath = path.join(CACHE_DIR, cacheKey + '.html');
    if (fs.existsSync(cachePath)) {
      return Promise.resolve(fs.readFileSync(cachePath, 'utf8'));
    }
  }
  return new Promise((resolve, reject) => {
    const doFetch = (fetchUrl) => {
      const fullUrl = fetchUrl.startsWith('http') ? fetchUrl : BASE_URL + fetchUrl;
      https.get(fullUrl, { headers: { 'User-Agent': 'RibbonHelper/1.0 (Pokemon research tool)' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doFetch(res.headers.location);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (cacheKey) {
            if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
            fs.writeFileSync(path.join(CACHE_DIR, cacheKey + '.html'), data);
          }
          resolve(data);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    doFetch(url);
  });
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const NATURES = ['Adamant', 'Bashful', 'Bold', 'Brave', 'Calm', 'Careful', 'Docile', 'Gentle', 'Hardy',
  'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive', 'Naughty', 'Quiet',
  'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid'];

/**
 * Parse the main page table.
 * Each data row is <tr style="background:#fff"> with cells:
 *   <td>NNN</td>  <td>Trainer Class link</td>  <td>Trainer Name link</td>
 *   then 8 <th> cells for battle ranges 1-7 through 50+
 * A <th> with a checkmark (non-empty text content) means the trainer appears in that range.
 */
function parseTrainerList(html) {
  const trainers = [];
  // Match only data rows (not header rows)
  const rowRegex = /<tr style="background:#fff">([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];

    // Extract <td> cells (first 3)
    const tdCells = [];
    const tdRegex = /<td>([\s\S]*?)<\/td>/g;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      tdCells.push(tdMatch[1].trim());
    }
    if (tdCells.length < 3) continue;

    // Cell 0: trainer number
    const num = parseInt(tdCells[0].replace(/\D/g, ''), 10);
    if (isNaN(num) || num < 1) continue;

    // Cell 1: trainer class (strip gender symbols and HTML)
    const trainerClass = tdCells[1]
      .replace(/<[^>]+>/g, '')
      .replace(/[♂♀]/g, '')
      .trim();

    // Cell 2: trainer name + link
    const nameMatch = tdCells[2].match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!nameMatch) continue;
    const link = nameMatch[1];
    const trainerName = nameMatch[2].trim();

    // Extract anchor (trainer name in the class page)
    const anchorMatch = link.match(/#(.+)$/);
    const anchor = anchorMatch ? decodeURIComponent(anchorMatch[1]) : trainerName;

    // Extract class page slug from the link
    const slugMatch = link.match(/\/([^/]+)#/);
    const pageSlug = slugMatch ? slugMatch[1] : null;

    // Parse <th> cells for battle ranges (8 columns: 1-7 through 50+)
    const thCells = [];
    const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
    let thMatch;
    while ((thMatch = thRegex.exec(row)) !== null) {
      thCells.push(thMatch[1].trim());
    }
    const battleRanges = RANGE_LABELS.filter((_, i) => thCells[i] && thCells[i].includes('✔'));

    trainers.push({ number: num, class: trainerClass, name: trainerName, link, pageSlug, anchor, battleRanges });
  }

  return trainers;
}

/**
 * Match a scraped Pokemon to its setdex label.
 */
function matchToSetdex(poke) {
  const sortedMoves = [...poke.moves].sort().join(',');

  const key = `${poke.species}|${poke.nature}|${poke.item}|${sortedMoves}`;
  if (setdexLookup.has(key)) return setdexLookup.get(key);

  const keyNoItem = `noitem:${poke.species}|${poke.nature}|${sortedMoves}`;
  if (setdexLookup.has(keyNoItem)) return setdexLookup.get(keyNoItem);

  // Species + moves only
  for (const [k, v] of setdexLookup.entries()) {
    if (!k.startsWith('noitem:') && k.startsWith(poke.species + '|') && k.endsWith('|' + sortedMoves)) {
      return v;
    }
  }

  // Form variants
  const formVariants = Object.keys(setdex).filter(sp => sp.startsWith(poke.species + '-'));
  for (const variant of formVariants) {
    const varKey = `${variant}|${poke.nature}|${poke.item}|${sortedMoves}`;
    if (setdexLookup.has(varKey)) return setdexLookup.get(varKey);
    const varKeyNoItem = `noitem:${variant}|${poke.nature}|${sortedMoves}`;
    if (setdexLookup.has(varKeyNoItem)) return setdexLookup.get(varKeyNoItem);
  }

  return `${poke.species}-?`;
}

/**
 * Parse Pokemon from a wikitable on a trainer class page.
 */
function parsePokemonFromTable(tableHtml) {
  const pokemon = [];
  const rowRegex = /<tr[\s\S]*?<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[0];

    // Extract species from link to Pokemon page
    const nameMatch = row.match(/<a href="\/wiki\/[^"]+\(Pok[^"]*\)"[^>]*>([^<]+)<\/a>/);
    if (!nameMatch) continue;
    let species = nameMatch[1].trim();

    // Extract item
    let item = '';
    const itemMatch = row.match(/Bag_[^"]*"[^>]*>[^<]*<\/a><\/span>(?:&#160;|\s)*<a[^>]*>([^<]+)<\/a>/);
    if (itemMatch) item = itemMatch[1].trim();

    // Extract moves
    const moves = [];
    const moveRegex = /\(move\)"[^>]*><span[^>]*>([^<]+)<\/span><\/a>/g;
    let mm;
    while ((mm = moveRegex.exec(row)) !== null) {
      moves.push(normalizeMove(mm[1].trim()));
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

/**
 * Assign battle ranges based on trainer number.
 *
 * Gen 4 Battle Tower runs in 7-battle sets. Within each set:
 *   Battles 1-6 (or 8-13, etc.): regular pool
 *   Battle 7 (or 14, 21, etc.): harder "set final" pool
 *
 * Trainer number → which battles they appear in:
 *   1-80:   1-6
 *   81-100: 1-6, 8-13
 *   101-120: 7, 8-13, 15-20
 *   121-140: 14, 15-20, 22-27
 *   141-160: 21, 22-27, 29-34
 *   161-180: 28, 29-34, 36-41
 *   181-200: 35, 36-41, 43-48
 *   201-220: 42, 43-48, 50+
 *   221-300: 49, 50+
 */
function getRanges(num) {
  if (num <= 80)  return ['1-6'];
  if (num <= 100) return ['1-6', '8-13'];
  if (num <= 120) return ['7', '8-13', '15-20'];
  if (num <= 140) return ['14', '15-20', '22-27'];
  if (num <= 160) return ['21', '22-27', '29-34'];
  if (num <= 180) return ['28', '29-34', '36-41'];
  if (num <= 200) return ['35', '36-41', '43-48'];
  if (num <= 220) return ['42', '43-48', '50+'];
  return ['49', '50+'];
}

/**
 * Parse all trainer sections from a class page (like SM scraper).
 * Sections are split by h3 headers. Each section has the trainer name and a Pokemon table.
 */
function parseTrainerClassPage(html, expectedNames) {
  const result = {};
  const sections = html.split(/<h3>/g);

  for (const section of sections) {
    const headerMatch = section.match(/class="mw-headline"[^>]*>([^<]+)<\/span>/);
    if (!headerMatch) continue;
    const header = headerMatch[1].trim();

    const matchedNames = expectedNames.filter(n => header.includes(n));
    if (matchedNames.length === 0) continue;

    // Find the Pokemon table
    const tableMatch = section.match(/<table[^>]*class="[^"]*(?:roundy|wikitable)[^"]*sortable[^"]*"[\s\S]*?<\/table>/i)
      || section.match(/<table[^>]*sortable[\s\S]*?<\/table>/i)
      || section.match(/<table[^>]*wikitable[\s\S]*?<\/table>/i);
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
  const outDir = path.join(__dirname, '../../data/battle-facilities/pthgss');

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  console.log('Fetching main trainer list page...');
  const mainHtml = await fetchUrl(
    `${BASE_URL}/wiki/List_of_Battle_Frontier_Trainers_in_Generation_IV`,
    'main'
  );
  // Copy to well-known path for debugging
  fs.copyFileSync(path.join(CACHE_DIR, 'main.html'), '/tmp/gen4_bt_trainers.html');

  const trainers = parseTrainerList(mainHtml);
  console.log(`Found ${trainers.length} trainers in main page table`);

  if (trainers.length === 0) {
    console.error('ERROR: No trainers found. Check /tmp/gen4_bt_trainers.html.');
    process.exit(1);
  }

  // Group trainers by class page slug for efficient fetching
  const pageGroups = new Map(); // pageSlug -> [trainer, ...]
  for (const t of trainers) {
    if (!t.pageSlug) continue;
    if (!pageGroups.has(t.pageSlug)) pageGroups.set(t.pageSlug, []);
    pageGroups.get(t.pageSlug).push(t);
  }
  console.log(`${pageGroups.size} unique class pages to fetch\n`);

  // Fetch each class page and parse trainer Pokemon
  const trainerPokemon = {};
  let pageIndex = 0;
  for (const [slug, groupTrainers] of pageGroups.entries()) {
    pageIndex++;
    const url = `${BASE_URL}/wiki/List_of_Battle_Frontier_Trainers_in_Generation_IV/${slug}`;
    const names = groupTrainers.map(t => t.anchor);
    console.log(`[${pageIndex}/${pageGroups.size}] Fetching ${slug} (${names.length} trainers)...`);

    try {
      const html = await fetchUrl(url, 'class_' + slug);
      const parsed = parseTrainerClassPage(html, names);

      for (const [name, labels] of Object.entries(parsed)) {
        // Map anchor name back to trainer name (usually the same)
        const trainer = groupTrainers.find(t => t.anchor === name) || groupTrainers.find(t => t.name === name);
        const trainerName = trainer ? trainer.name : name;
        trainerPokemon[trainerName] = labels;
        const unmatched = labels.filter(l => l.endsWith('-?')).length;
        if (unmatched > 0) {
          console.log(`  ${trainerName}: ${labels.join(', ')} (${unmatched} unmatched)`);
        }
      }

      const found = Object.keys(parsed).length;
      const missed = names.filter(n => !parsed[n]).length;
      console.log(`  ${found}/${names.length} trainers found${missed > 0 ? `, ${missed} missing` : ''}`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    if (pageIndex < pageGroups.size) await sleep(1200);
  }

  // Build battle trainer list (no need to add Palmer separately — they're in the main table if present)
  // Check if Palmer is in the list; if not, add manually
  // Use getRanges(num) for precise battle ranges — Bulbapedia checkmarks are too broad
  const hasPalmer = trainers.some(t => t.name === 'Palmer');
  const battleTrainers = trainers.map(t => ({
    number: t.number,
    class: t.class,
    name: t.name,
    battleRanges: getRanges(t.number),
  }));

  if (!hasPalmer) {
    console.log('\nPalmer not found in trainer list — adding manually as boss');
    battleTrainers.push(
      { number: 9001, class: 'Tower Tycoon', name: 'Palmer', battleRanges: ['21'], boss: 'singles' },
      { number: 9002, class: 'Tower Tycoon', name: 'Palmer', battleRanges: ['49'], boss: 'singles' },
    );
  } else {
    for (const t of battleTrainers) {
      if (t.name === 'Palmer') t.boss = 'singles';
    }
  }

  // Write outputs
  fs.writeFileSync(
    path.join(outDir, 'battle_trainers_pthgss.json'),
    JSON.stringify(battleTrainers, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, 'trainer_pokemon_pthgss.json'),
    JSON.stringify(trainerPokemon, null, 2)
  );

  const totalPokemon = Object.values(trainerPokemon).reduce((s, arr) => s + arr.length, 0);
  const unmatched = Object.values(trainerPokemon).flat().filter(p => p.endsWith('-?')).length;
  console.log(`\nWrote battle_trainers_pthgss.json (${battleTrainers.length} trainers)`);
  console.log(`Wrote trainer_pokemon_pthgss.json`);
  console.log(`  ${Object.keys(trainerPokemon).length} trainers with Pokemon`);
  console.log(`  ${totalPokemon} total Pokemon entries`);
  console.log(`  ${unmatched} unmatched (marked -?)`);
  console.log(`  ${totalPokemon - unmatched} matched to setdex`);
}

main().catch(console.error);
