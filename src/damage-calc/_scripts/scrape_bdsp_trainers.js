/**
 * Scrape BDSP Battle Tower trainer data from Bulbapedia.
 *
 * Data structure:
 *
 * battle_trainers_bdsp.json — array of trainer objects:
 *   Regular trainer:  { class, name, sets: { "regular-singles": [1,2], "master-singles": true, ... } }
 *   Regular boss:     { class, name, battleNum: 21|49, boss: "regular" }
 *   Master boss:      { class, name, rank: 1..10, boss: "master-singles"|"master-doubles" }
 *   Master-doubles pair: { class: "...", name: "Name1 and Name2", sets: { "master-doubles": true } }
 *
 * trainer_pokemon_bdsp.json — map of trainer name → mode+set → [set-labels]:
 *   Regular trainer:  "Lloyd" → { "regular-singles-1": [...], "regular-doubles-2": [...] }
 *   Master trainer:   "Myron" → { "regular-singles-5": [...], "master-singles": [...] }
 *   Pair:             "Myron and Jane" → { "master-doubles": [...] }
 *   Boss:             "Roark" → { "master-singles-7": [...] }
 *
 * Battle ranges (handled in bdspBattles.ts):
 *   regular-singles/doubles: set N → battles (N-1)*7+1 to N*7; Palmer boss at 21 and 49
 *   master-singles/doubles:  every 7th battle (7,14,21,...,70) = rank boss; otherwise any master trainer
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Paths ────────────────────────────────────────────────────────────────────

const OUT_DIR   = path.join(__dirname, '../../data/battle-facilities/bdsp');
const CACHE_DIR = '/tmp/bdsp_bt_cache2';
const BASE_URL  = 'https://bulbapedia.bulbagarden.net';
const BASE_WIKI = '/wiki/List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Brilliant_Diamond_and_Shining_Pearl';

// ── Setdex lookup ────────────────────────────────────────────────────────────

const setdex = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'setdex_bdsp.json'), 'utf8'));

const setdexIndex = new Map();
for (const [species, sets] of Object.entries(setdex)) {
  for (const [label, set] of Object.entries(sets)) {
    const moves = [...(set.moves || [])].filter(Boolean).sort().join(',');
    const ability = set.ability || '';

    const full    = `${species}|${ability}|${set.item}|${moves}`;
    const noItem  = `noitem:${species}|${ability}|${moves}`;
    const noAb    = `noab:${species}|${set.item}|${moves}`;
    const movOnly = `mov:${species}|${moves}`;

    if (!setdexIndex.has(full))   setdexIndex.set(full,   label);
    if (!setdexIndex.has(noItem)) setdexIndex.set(noItem, label);
    if (!setdexIndex.has(noAb))   setdexIndex.set(noAb,   label);
    if (!setdexIndex.has(movOnly)) setdexIndex.set(movOnly, label);
  }
}

// ── HTTP / cache ─────────────────────────────────────────────────────────────

function cacheFile(key) {
  return path.join(CACHE_DIR, key.replace(/[^a-zA-Z0-9_-]/g, '_') + '.html');
}

function fetchUrl(url, cacheKey) {
  const cf = cacheFile(cacheKey);
  if (fs.existsSync(cf)) return Promise.resolve(fs.readFileSync(cf, 'utf8'));

  return new Promise((resolve, reject) => {
    const go = (u) => {
      const full = u.startsWith('http') ? u : BASE_URL + u;
      https.get(full, { headers: { 'User-Agent': 'RibbonHelper/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return go(res.headers.location);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
          fs.writeFileSync(cf, data);
          resolve(data);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    go(url);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── HTML helpers ─────────────────────────────────────────────────────────────

function stripHtml(s) { return s.replace(/<[^>]+>/g, '').replace(/&#160;|&nbsp;/g, ' ').trim(); }
function isChecked(cell) { return cell.includes('✓') || cell.includes('✔'); }

// Extract all <th> cells from a row string
function thCells(row) {
  const out = [];
  const re = /<th[^>]*>([\s\S]*?)<\/th>/g;
  let m;
  while ((m = re.exec(row)) !== null) out.push(m[1].trim());
  return out;
}

// Extract all <td> cells from a row string
function tdCells(row) {
  const out = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/g;
  let m;
  while ((m = re.exec(row)) !== null) out.push(m[1].trim());
  return out;
}

// ── Setdex matching ──────────────────────────────────────────────────────────

function matchSetdex(poke) {
  const moves = [...(poke.moves || [])].filter(Boolean).sort().join(',');
  const ab = poke.ability || '';

  const label =
    setdexIndex.get(`${poke.species}|${ab}|${poke.item}|${moves}`)    ||
    setdexIndex.get(`noitem:${poke.species}|${ab}|${moves}`)           ||
    setdexIndex.get(`noab:${poke.species}|${poke.item}|${moves}`)      ||
    setdexIndex.get(`mov:${poke.species}|${moves}`);

  if (label) return label;

  // Try form variants (e.g. Rotom-Heat)
  for (const sp of Object.keys(setdex)) {
    if (sp.startsWith(poke.species + '-')) {
      const fl = setdexIndex.get(`${sp}|${ab}|${poke.item}|${moves}`)
              || setdexIndex.get(`mov:${sp}|${moves}`);
      if (fl) return fl;
    }
  }

  return `${poke.species}-?`;
}

// ── Pokemon row parser ───────────────────────────────────────────────────────

/**
 * Parse pokemon data rows from a table section HTML string.
 * BDSP table rows: <td> for #, sprite, name, ability, item; <th> for moves; <td> for stats.
 * Returns array of { species, ability, item, moves[] }.
 */
function parsePokemonRows(html) {
  const pokemon = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];
    if (!row.includes('<td')) continue;

    const speciesMatch = row.match(/<a href="\/wiki\/[^"]+\(Pok[^"]*\)"[^>]*title="[^"]*">([^<]+)<\/a>/);
    if (!speciesMatch) continue;
    const species = speciesMatch[1].trim();

    let ability = '';
    const abMatch = row.match(/<a href="\/wiki\/[^"]+\(Ability\)"[^>]*>([^<]+)<\/a>/i);
    if (abMatch) ability = abMatch[1].trim();

    let item = '';
    const itemMatch = row.match(/Bag_[^"]+\.png"[^>]*\/>.*?<a href="\/wiki\/([^"(]+)"[^>]*>([^<]+)<\/a>/);
    if (itemMatch) item = itemMatch[2].trim();

    const moves = [];
    const moveRe = /href="\/wiki\/[^"]+\(move\)"[^>]*>(?:<span[^>]*>)?([^<]+)(?:<\/span>)?<\/a>/g;
    let mm;
    while ((mm = moveRe.exec(row)) !== null) {
      const mv = mm[1].trim();
      if (mv && mv !== '-') moves.push(mv);
    }

    if (species && moves.length > 0) pokemon.push({ species, ability, item, moves });
  }
  return pokemon;
}

// ── Main page parser ─────────────────────────────────────────────────────────

/**
 * Parse the main trainer index page.
 * Table columns: Class | Name | Singles Set1..7 | Singles Master | Doubles Set1..7 | Doubles Master
 * Data rows: <tr style="background:#fff">
 * Checkmarks are in <th> cells.
 */
function parseMainPage(html) {
  const trainers = [];
  const rowRe = /<tr style="background:#fff">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];
    const tds = tdCells(row);
    if (tds.length < 2) continue;

    // Trainer class (first td)
    const classMatch = tds[0].match(/<a[^>]*>([^<]+)<\/a>/);
    if (!classMatch) continue;
    const trainerClass = classMatch[1].replace(/[♂♀]/g, '').trim();

    // Trainer name (second td) — link to class sub-page
    const nameLinkMatch = tds[1].match(/href="([^"]+)"[^>]*>([^<\n]+)<\/a>/);
    if (!nameLinkMatch) continue;
    const nameUrl  = nameLinkMatch[1];
    const trainerName = nameLinkMatch[2].trim();

    // Extract page slug and anchor
    const parts = decodeURIComponent(nameUrl).split('/');
    const lastPart = parts[parts.length - 1];
    const [slugRaw, anchorRaw = ''] = lastPart.split('#');
    const pageSlug = slugRaw.replace(/_/g, ' ');
    const anchor   = anchorRaw.replace(/_/g, ' ') || trainerName;
    // Keep slug URL-encoded for the fetch URL
    const pageSlugEncoded = nameUrl.match(/\/([^/#]+)(?:#|$)/)?.[1] || slugRaw;

    // The 16 <th> cells are the set columns
    const ths = thCells(row);
    if (ths.length < 16) continue;

    const sets = {};
    // Singles Sets 1-7 (ths[0..6])
    for (let i = 0; i < 7; i++) {
      if (isChecked(ths[i])) {
        if (!sets['regular-singles']) sets['regular-singles'] = [];
        sets['regular-singles'].push(i + 1);
      }
    }
    // Singles Master (ths[7])
    if (isChecked(ths[7])) sets['master-singles'] = true;
    // Doubles Sets 1-7 (ths[8..14])
    for (let i = 0; i < 7; i++) {
      if (isChecked(ths[8 + i])) {
        if (!sets['regular-doubles']) sets['regular-doubles'] = [];
        sets['regular-doubles'].push(i + 1);
      }
    }
    // Doubles Master (ths[15])
    if (isChecked(ths[15])) sets['master-doubles'] = true;

    if (Object.keys(sets).length === 0) continue;

    trainers.push({ class: trainerClass, name: trainerName, pageSlug, pageSlugEncoded, anchor, sets });
  }
  return trainers;
}

// ── Trainer class sub-page parser ────────────────────────────────────────────

/**
 * Team section header → mode+set key:
 *   "Single Battles Set N: Team X"       → "regular-singles-N"
 *   "Master Class Single Battles: Team X" → "master-singles"
 *   "Double Battles Set N: Team X"        → "regular-doubles-N"
 *   "Master Class Double Battles: Team X" → "master-doubles"
 */
function headerToKey(header) {
  const h = header.trim();
  let mm;
  if ((mm = h.match(/Single Battles Set (\d+)/i)))        return `regular-singles-${mm[1]}`;
  if (/Master Class Single Battles/i.test(h))             return 'master-singles';
  if ((mm = h.match(/Double Battles Set (\d+)/i)))        return `regular-doubles-${mm[1]}`;
  if (/Master Class Double Battles/i.test(h))             return 'master-doubles';
  return null;
}

/**
 * Parse a trainer class sub-page. Returns:
 *   { trainerName: { "regular-singles-1": [setLabel, ...], "master-singles": [...], ... } }
 *
 * Each trainer has one big "roundy" table. Section headers in that table are
 *   <th colspan="18" ...>Single Battles Set N: Team A</th>
 * All Teams (A/B/C) within the same set are merged into one array.
 */
function parseTrainerClassPage(html, expectedTrainers) {
  const result = {};

  // Normalize h3 tags so we can split reliably
  const norm = html.replace(/<h3>\s*\n/g, '<h3>');
  const sections = norm.split('<h3>');

  for (const section of sections) {
    const idMatch = section.match(/id="([^"]+)"/);
    if (!idMatch) continue;
    const anchor = decodeURIComponent(idMatch[1]).replace(/_/g, ' ');

    const trainer = expectedTrainers.find(t =>
      t.anchor === anchor || t.name === anchor ||
      anchor.startsWith(t.anchor) || anchor.startsWith(t.name)
    );
    if (!trainer) continue;

    // Find the roundy table in this section
    const tableMatch = section.match(/<table[^>]*class="roundy"[\s\S]*?<\/table>/i);
    if (!tableMatch) continue;
    const tableHtml = tableMatch[0];

    // Split on <th colspan="18"> team-section dividers
    const parts = tableHtml.split(/<th colspan="18"[^>]*>/);
    const teamData = {};

    for (let i = 1; i < parts.length; i++) {
      const headerEnd = parts[i].indexOf('</th>');
      if (headerEnd < 0) continue;
      const header  = parts[i].substring(0, headerEnd);
      const body    = parts[i].substring(headerEnd);

      const key = headerToKey(header);
      if (!key) continue;

      const pokemon = parsePokemonRows(body).map(matchSetdex);
      if (!teamData[key]) teamData[key] = [];
      // Deduplicate within same set (same pokemon can appear in Team A and B)
      for (const p of pokemon) {
        if (!teamData[key].includes(p)) teamData[key].push(p);
      }
    }

    if (Object.keys(teamData).length > 0) {
      result[trainer.name] = teamData;
    }
  }

  return result;
}

// ── Master doubles index parser ───────────────────────────────────────────────

/**
 * Parse the master doubles index page.
 * Returns: [{ pairName: "Myron and Jane", subPage: "1", anchor: "Myron_and_Jane" }]
 */
function parseMasterDoublesIndex(html) {
  const pairs = [];
  const seen  = new Set();
  const linkRe = new RegExp(
    BASE_WIKI.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '/Master_Class_Double_Battles/(\\d+)#([^"]+)',
    'g'
  );
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const subPage = m[1];
    const anchor  = m[2];
    const key = `${subPage}#${anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const pairName = decodeURIComponent(anchor).replace(/_/g, ' ');
    pairs.push({ pairName, subPage, anchor });
  }
  return pairs;
}

/**
 * Parse a master doubles sub-page (/1, /2, /3, /4).
 * Each section is a trainer pair identified by <h3 id="Name1_and_Name2">.
 * Returns: { "Myron and Jane": { "master-doubles": [...] } }
 */
function parseMasterDoublesSubPage(html) {
  const result = {};
  const norm = html.replace(/<h3>\s*\n/g, '<h3>');
  const sections = norm.split('<h3>');

  for (const section of sections) {
    const idMatch = section.match(/id="([^"]+)"/);
    if (!idMatch) continue;
    const anchor = decodeURIComponent(idMatch[1]).replace(/_/g, ' ');
    // Expect anchor like "Myron and Jane"
    if (!anchor.includes(' and ')) continue;

    const tableMatch = section.match(/<table[^>]*class="roundy"[\s\S]*?<\/table>/i);
    if (!tableMatch) continue;
    const tableHtml = tableMatch[0];

    const parts = tableHtml.split(/<th colspan="18"[^>]*>/);
    const teamData = {};

    for (let i = 1; i < parts.length; i++) {
      const headerEnd = parts[i].indexOf('</th>');
      if (headerEnd < 0) continue;
      const header  = parts[i].substring(0, headerEnd);
      const body    = parts[i].substring(headerEnd);

      // For master doubles sub-pages, section headers may be "Double Battles Set N: Team X"
      // We map all of them to "master-doubles" (players can see all possible pokemon)
      let key = headerToKey(header);
      // Remap to master-doubles regardless of set number
      if (key && key.startsWith('regular-doubles')) key = 'master-doubles';
      if (!key) continue;

      const pokemon = parsePokemonRows(body).map(matchSetdex);
      if (!teamData[key]) teamData[key] = [];
      for (const p of pokemon) {
        if (!teamData[key].includes(p)) teamData[key].push(p);
      }
    }

    if (Object.keys(teamData).length > 0) {
      result[anchor] = teamData;
    }
  }

  return result;
}

// ── Boss table parser ────────────────────────────────────────────────────────

/**
 * Parse the Bosses table from the master doubles page.
 * Returns: [{ rank, singles: "Name", doubles: "Name1 and Name2" }]
 */
function parseBossesTable(html) {
  const idx = html.indexOf('id="Bosses"');
  if (idx < 0) return [];
  const bossSection = html.substring(idx, idx + 6000);
  const rows = [];
  const rowRe = /<tr style="background-color:#fff">([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = rowRe.exec(bossSection)) !== null) {
    const tds = tdCells(m[1]);
    const ths = thCells(m[1]);
    if (ths.length === 0 || tds.length < 2) continue;
    const rank = parseInt(stripHtml(ths[0]));
    if (isNaN(rank)) continue;
    const singles = stripHtml(tds[0]);
    const doubles = stripHtml(tds[1]);
    rows.push({ rank, singles, doubles });
  }
  return rows;
}

/**
 * Parse the /Boss sub-page for boss pokemon teams.
 * Each boss has an <h3 id="BossName"> section with a roundy table.
 * Section headers: "Single Battles: Team A", "Double Battles: Team A", etc.
 * We use the anchor text as the boss name.
 */
function parseBossPage(html) {
  const result = {};
  const norm = html.replace(/<h3>\s*\n/g, '<h3>');
  const sections = norm.split('<h3>');

  for (const section of sections) {
    const idMatch = section.match(/id="([^"]+)"/);
    if (!idMatch) continue;
    const rawAnchor = decodeURIComponent(idMatch[1]).replace(/_/g, ' ');
    // Strip suffixes like " Master Class" or parenthesized notes
    const bossName = rawAnchor.replace(/_Master_Class$/, '').replace(/ Master Class$/, '').trim();

    const tableMatch = section.match(/<table[^>]*class="roundy"[\s\S]*?<\/table>/i);
    if (!tableMatch) continue;
    const tableHtml = tableMatch[0];

    const parts = tableHtml.split(/<th colspan="18"[^>]*>/);
    const allPokemon = [];

    for (let i = 1; i < parts.length; i++) {
      const headerEnd = parts[i].indexOf('</th>');
      if (headerEnd < 0) continue;
      const body    = parts[i].substring(headerEnd);
      const pokemon = parsePokemonRows(body).map(matchSetdex);
      for (const p of pokemon) {
        if (!allPokemon.includes(p)) allPokemon.push(p);
      }
    }

    if (allPokemon.length > 0) {
      result[bossName] = allPokemon;
    }
  }

  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  // Step 1: Main page
  console.log('Fetching main trainer list page...');
  const mainHtml = await fetchUrl(BASE_URL + BASE_WIKI, 'main');
  const trainers = parseMainPage(mainHtml);
  console.log(`Parsed ${trainers.length} trainer entries from main page`);

  if (trainers.length === 0) {
    console.error('ERROR: No trainers found. Dumping first 3000 chars of main page:');
    console.error(mainHtml.substring(0, 3000));
    process.exit(1);
  }

  // Step 2: Master doubles index
  console.log('\nFetching master doubles index...');
  const mdHtml = await fetchUrl(BASE_URL + BASE_WIKI + '/Master_Class_Double_Battles', 'master_doubles');
  const bosses  = parseBossesTable(mdHtml);
  const mdPairs = parseMasterDoublesIndex(mdHtml);
  console.log(`Found ${bosses.length} boss ranks, ${mdPairs.length} master-doubles pairs`);
  await sleep(800);

  // Step 3: Trainer class sub-pages (regular + master singles/doubles individual teams)
  const pageGroups = new Map();
  for (const t of trainers) {
    const slug = t.pageSlugEncoded;
    if (!slug) continue;
    if (!pageGroups.has(slug)) pageGroups.set(slug, { encoded: slug, trainers: [] });
    pageGroups.get(slug).trainers.push(t);
  }
  console.log(`\nFetching ${pageGroups.size} trainer class pages...`);

  const trainerPokemon = {};
  let pageIdx = 0;

  for (const [slug, group] of pageGroups.entries()) {
    pageIdx++;
    const url = BASE_URL + BASE_WIKI + '/' + slug;
    console.log(`[${pageIdx}/${pageGroups.size}] ${decodeURIComponent(slug)} (${group.trainers.length})`);
    try {
      const html   = await fetchUrl(url, 'class_' + slug);
      const parsed = parseTrainerClassPage(html, group.trainers);
      let found = 0;
      for (const [name, data] of Object.entries(parsed)) {
        trainerPokemon[name] = data;
        found++;
        // Warn on unmatched
        const bad = Object.values(data).flat().filter(l => l.endsWith('-?'));
        if (bad.length) console.log(`  ⚠ ${name}: ${bad.length} unmatched`);
      }
      console.log(`  ${found}/${group.trainers.length} trainers parsed`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
    if (pageIdx < pageGroups.size) await sleep(800);
  }

  // Step 4: Master doubles sub-pages
  const mdSubPages = [...new Set(mdPairs.map(p => p.subPage))].sort();
  console.log(`\nFetching ${mdSubPages.length} master doubles sub-pages...`);

  const mdPairPokemon = {};
  for (const subPage of mdSubPages) {
    const url = BASE_URL + BASE_WIKI + '/Master_Class_Double_Battles/' + subPage;
    console.log(`  sub-page /${subPage}`);
    try {
      const html   = await fetchUrl(url, 'md_sub_' + subPage);
      const parsed = parseMasterDoublesSubPage(html);
      Object.assign(mdPairPokemon, parsed);
      console.log(`    ${Object.keys(parsed).length} pairs parsed`);
    } catch (e) {
      console.error(`  Error: ${e.message}`);
    }
    await sleep(800);
  }

  // Step 5: Boss page
  console.log('\nFetching boss page...');
  const bossPokemon = {};
  try {
    const bossUrl  = BASE_URL + BASE_WIKI + '/Boss';
    const bossHtml = await fetchUrl(bossUrl, 'boss');
    const parsed   = parseBossPage(bossHtml);
    Object.assign(bossPokemon, parsed);
    console.log(`  ${Object.keys(parsed).length} bosses parsed`);
  } catch (e) {
    console.error(`  Error fetching boss page: ${e.message}`);
  }

  // ── Build battle_trainers_bdsp.json ────────────────────────────────────────

  const battleTrainers = [];

  // Regular + master individual trainers (exclude master-doubles — those come from pairs)
  for (const t of trainers) {
    const trimmedSets = {};
    for (const [mode, val] of Object.entries(t.sets)) {
      if (mode !== 'master-doubles') trimmedSets[mode] = val;
    }
    if (Object.keys(trimmedSets).length === 0) continue;
    battleTrainers.push({ class: t.class, name: t.name, sets: trimmedSets });
  }

  // Regular class boss: Palmer at battles 21 and 49
  battleTrainers.push(
    { class: 'Tower Tycoon', name: 'Palmer', battleNum: 21, boss: 'regular' },
    { class: 'Tower Tycoon', name: 'Palmer', battleNum: 49, boss: 'regular' }
  );

  // Master class bosses (gym leaders) — one entry per mode per rank
  for (const b of bosses) {
    battleTrainers.push(
      { class: 'Gym Leader', name: b.singles,  rank: b.rank, boss: 'master-singles', battleNum: b.rank * 7 },
      { class: 'Gym Leader', name: b.doubles,  rank: b.rank, boss: 'master-doubles', battleNum: b.rank * 7 }
    );
  }

  // Master doubles pairs
  for (const pair of mdPairs) {
    battleTrainers.push({ class: 'Trainer Pair', name: pair.pairName, sets: { 'master-doubles': true } });
  }

  // ── Build trainer_pokemon_bdsp.json ────────────────────────────────────────

  const allTrainerPokemon = {};

  // Individual trainers
  Object.assign(allTrainerPokemon, trainerPokemon);

  // Master doubles pairs
  for (const [name, data] of Object.entries(mdPairPokemon)) {
    allTrainerPokemon[name] = data;
  }

  // Palmer regular class (battleNum-keyed)
  const palmerRegSingles = bossPokemon['Palmer'] || [];
  const palmerMasterSingles = bossPokemon['Palmer Master Class'] || bossPokemon['Palmer'] || [];
  const palmerMasterDoubles = bossPokemon['Barry and Palmer'] || [];
  if (palmerRegSingles.length || palmerMasterSingles.length || palmerMasterDoubles.length) {
    allTrainerPokemon['Palmer'] = {
      'regular-singles-21': palmerRegSingles,
      'regular-singles-49': palmerRegSingles,
      'regular-doubles-21': palmerRegSingles,
      'regular-doubles-49': palmerRegSingles,
      'master-singles-70':  palmerMasterSingles,
      'master-doubles-70':  palmerMasterDoubles,
    };
  }

  // Other bosses — keyed by "master-singles-{battleNum}" or "master-doubles-{battleNum}"
  for (const b of bosses) {
    const battle = b.rank * 7;

    if (b.singles !== 'Palmer') {
      const pokes = bossPokemon[b.singles] || [];
      if (!allTrainerPokemon[b.singles]) allTrainerPokemon[b.singles] = {};
      allTrainerPokemon[b.singles][`master-singles-${battle}`] = pokes;
    }

    if (b.doubles !== 'Barry and Palmer') {
      const pokes = bossPokemon[b.doubles] || [];
      if (!allTrainerPokemon[b.doubles]) allTrainerPokemon[b.doubles] = {};
      allTrainerPokemon[b.doubles][`master-doubles-${battle}`] = pokes;
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const allLabels = Object.values(allTrainerPokemon).flatMap(d => Object.values(d).flat());
  const unmatched = allLabels.filter(l => l.endsWith('-?'));
  const unmatchedCounts = {};
  for (const u of unmatched) unmatchedCounts[u] = (unmatchedCounts[u] || 0) + 1;

  console.log('\n── Summary ──────────────────────────────────────');
  console.log(`Trainers (battle_trainers):   ${battleTrainers.length}`);
  console.log(`Trainers with pokemon data:   ${Object.keys(allTrainerPokemon).length}`);
  console.log(`Total pokemon entries:        ${allLabels.length}`);
  console.log(`Unmatched:                    ${unmatched.length}`);
  if (Object.keys(unmatchedCounts).length > 0) {
    console.log('Top unmatched:');
    Object.entries(unmatchedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  fs.writeFileSync(
    path.join(OUT_DIR, 'battle_trainers_bdsp.json'),
    JSON.stringify(battleTrainers, null, 2)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'trainer_pokemon_bdsp.json'),
    JSON.stringify(allTrainerPokemon, null, 2)
  );

  console.log('\nWrote battle_trainers_bdsp.json and trainer_pokemon_bdsp.json');
}

main().catch(e => { console.error(e); process.exit(1); });
