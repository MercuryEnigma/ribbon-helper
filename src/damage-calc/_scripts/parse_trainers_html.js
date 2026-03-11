/**
 * Parse the downloaded Battle Tree trainers HTML to extract trainer data
 * and build battle_trainers_sm.json with correct battle ranges.
 *
 * Also parse individual trainer class pages for Pokemon data.
 */

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('/tmp/battle_tree_trainers.html', 'utf8');

const RANGE_COLS = ['1-10', '11-19', '21-29', '31-39', '41-49', '51+'];

// Find the main trainer table
const tableMatch = html.match(/<table class="roundy sortable"[\s\S]*?<\/table>/);
if (!tableMatch) {
  console.error('Could not find trainer table');
  process.exit(1);
}
const tableHtml = tableMatch[0];

// Split into rows
const rows = tableHtml.split(/<tr/g).slice(1); // skip the table tag itself

const trainers = [];

for (const row of rows) {
  // Skip header rows
  if (row.includes('<th')) continue;

  // Extract all td contents
  const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1].trim());
  if (tds.length < 9) continue; // need number + class + name + 6 range cols

  const number = parseInt(tds[0], 10);
  if (!number || number < 1 || number > 300) continue;

  // Extract class name from link
  const classMatch = tds[1].match(/>([^<]+)<\/a>/);
  const trainerClass = classMatch ? classMatch[1].trim() : tds[1].replace(/<[^>]+>/g, '').trim();

  // Extract trainer name from link
  const nameMatch = tds[2].match(/>([^<]+)<\/a>/);
  const name = nameMatch ? nameMatch[1].trim() : tds[2].replace(/<[^>]+>/g, '').trim();

  // Check which range columns have checkmarks (✔ or background color)
  const ranges = [];
  for (let i = 0; i < 6; i++) {
    const cell = tds[3 + i] || '';
    if (cell.includes('✔') || cell.includes('✓') || cell.includes('background:#EBCDAF')) {
      ranges.push(RANGE_COLS[i]);
    }
  }

  if (name && trainerClass) {
    trainers.push({ number, class: trainerClass, name, battleRanges: ranges.length > 0 ? ranges : ['1-10'] });
  }
}

// Also check for the background color in the td attributes (the ✔ is in the content but bg color is in the td tag)
// Let's re-parse more carefully
const trainers2 = [];
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
let match;
while ((match = rowRegex.exec(tableHtml)) !== null) {
  const rowContent = match[1];
  if (rowContent.includes('<th')) continue;

  // Get all tds with their attributes
  const tdRegex = /<td([^>]*)>([\s\S]*?)<\/td>/g;
  const tds = [];
  let tdMatch;
  while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
    tds.push({ attrs: tdMatch[1], content: tdMatch[2].trim() });
  }

  if (tds.length < 9) continue;

  const number = parseInt(tds[0].content.replace(/<[^>]+>/g, ''), 10);
  if (!number || number < 1 || number > 300) continue;

  const classMatch = tds[1].content.match(/>([^<]+)<\/a>/);
  const trainerClass = classMatch ? classMatch[1].trim() : tds[1].content.replace(/<[^>]+>/g, '').trim();

  const nameMatch = tds[2].content.match(/>([^<]+)<\/a>/);
  const name = nameMatch ? nameMatch[1].trim() : tds[2].content.replace(/<[^>]+>/g, '').trim();

  const ranges = [];
  for (let i = 0; i < 6; i++) {
    const td = tds[3 + i];
    if (!td) continue;
    // Check both content and attributes for checkmark indicator
    if (td.content.includes('✔') || td.content.includes('✓') ||
        td.attrs.includes('EBCDAF') || td.attrs.includes('ebcdaf')) {
      ranges.push(RANGE_COLS[i]);
    }
  }

  if (name && trainerClass) {
    trainers2.push({ number, class: trainerClass, name, battleRanges: ranges.length > 0 ? ranges : ['???'] });
  }
}

console.log(`Parsed ${trainers2.length} trainers from HTML`);

// Show some examples to verify
for (const t of trainers2.slice(0, 5)) {
  console.log(`  #${t.number} ${t.class} ${t.name}: ${t.battleRanges.join(', ')}`);
}
console.log('  ...');
// Show Kass
const kass = trainers2.find(t => t.name === 'Kass');
if (kass) console.log(`  #${kass.number} ${kass.class} ${kass.name}: ${kass.battleRanges.join(', ')}`);
// Show Rendor
const rendor = trainers2.find(t => t.name === 'Rendor');
if (rendor) console.log(`  #${rendor.number} ${rendor.class} ${rendor.name}: ${rendor.battleRanges.join(', ')}`);
// Show Napoleon
const napoleon = trainers2.find(t => t.name === 'Napoleon');
if (napoleon) console.log(`  #${napoleon.number} ${napoleon.class} ${napoleon.name}: ${napoleon.battleRanges.join(', ')}`);
// Show last trainer
const last = trainers2[trainers2.length - 1];
if (last) console.log(`  #${last.number} ${last.class} ${last.name}: ${last.battleRanges.join(', ')}`);

// Add special trainers
const specialTrainers = [
  { number: 191, class: "Pokémon Trainer", name: "Red", battleRanges: ["20", "50"] },
  { number: 192, class: "Pokémon Trainer", name: "Blue", battleRanges: ["20", "50"] },
  { number: 193, class: "Pokémon Trainer", name: "Anabel", battleRanges: ["10", "30", "40"] },
  { number: 194, class: "Pokémon Trainer", name: "Colress", battleRanges: ["10", "30", "40"] },
  { number: 195, class: "Pokémon Trainer", name: "Cynthia", battleRanges: ["10", "30", "40"] },
  { number: 196, class: "Pokémon Trainer", name: "Dexio", battleRanges: ["10", "30", "40"] },
  { number: 197, class: "Pokémon Trainer", name: "Grimsley", battleRanges: ["10", "30", "40"] },
  { number: 198, class: "Pokémon Trainer", name: "Guzma", battleRanges: ["10", "30", "40"] },
  { number: 199, class: "Captain", name: "Kiawe", battleRanges: ["10", "30", "40"] },
  { number: 200, class: "Captain", name: "Mallow", battleRanges: ["10", "30", "40"] },
  { number: 201, class: "Pokémon Trainer", name: "Plumeria", battleRanges: ["10", "30", "40"] },
  { number: 202, class: "Pokémon Trainer", name: "Sina", battleRanges: ["10", "30", "40"] },
  { number: 203, class: "Pokémon Trainer", name: "Wally", battleRanges: ["10", "30", "40"] },
];

trainers2.push(...specialTrainers);

const outDir = path.join(__dirname, '../../data/battle-facilities/sunmoon');
fs.writeFileSync(path.join(outDir, 'battle_trainers_sm.json'), JSON.stringify(trainers2, null, 2));
console.log(`\nWrote battle_trainers_sm.json (${trainers2.length} trainers)`);
