#!/usr/bin/env node
// Scrapes Bulbapedia for Gen VI Battle Maison (ORAS) trainer data.
//
// Outputs:
//   battle_trainers_normal_oras.json  — Normal course trainers (1-110) with battle ranges
//   battle_trainers_super_oras.json   — Super course trainers (111-300+) with battle ranges
//   trainer_pokemon_normal_oras.json  — trainer name → [set label, ...]
//   trainer_pokemon_super_oras.json   — trainer name → [set label, ...]
//   setdex_oras.json                  — species → label → { evs, moves, nature, item }
//
// Usage: node scripts/scrape-battle-maison.cjs

const fs = require('fs')
const path = require('path')

const BASE_URL = 'https://bulbapedia.bulbagarden.net/w/index.php?action=raw&title='
const MAIN_PAGE = 'List_of_Battle_Maison_Trainers'

const NORMAL_RANGES = ['1-5', '6-10', '11-15', '16-19']
const SUPER_RANGES  = ['1-10', '11-20', '21-30', '31-40', '41+']

async function fetchPage(title) {
  const url = `${BASE_URL}${encodeURIComponent(title)}`
  console.log(`Fetching: ${title}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ──────────────────────────────────────────────
// Parse main trainer list page
// ──────────────────────────────────────────────

function parseTrainerList(wikitext) {
  const normalTrainers = []
  const superTrainers  = []

  const lines = wikitext.split('\n')
  let section  = null   // 'normal' | 'super'
  let ranges   = []     // current section's range labels
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Section headers
    if (line.includes('Normal Course Trainers')) { section = 'normal'; ranges = NORMAL_RANGES; i++; continue }
    if (line.includes('Super Course Trainers'))  { section = 'super';  ranges = SUPER_RANGES;  i++; continue }
    if (!section) { i++; continue }

    // Trainer number row: "| 001" or "| 111"
    const numMatch = line.match(/^\|\s*0*(\d+)\s*$/)
    if (!numMatch) { i++; continue }
    const number = parseInt(numMatch[1], 10)
    if (number <= 0) { i++; continue }

    // Class line
    i++
    const classLine = lines[i]?.trim() || ''
    const classMatch = classLine.match(/\{\{tc\|([^|}]+)/)
    const trainerClass = classMatch ? classMatch[1] : ''
    if (!trainerClass) { i++; continue }

    // XY name line
    i++
    const xyLine = lines[i]?.trim() || ''
    const xyMatch = xyLine.match(/\[\[[^\]]+\|([^\]]+)\]\]/)
    const xyName = xyMatch ? xyMatch[1] : ''

    // ORAS name line
    i++
    const orasLine = lines[i]?.trim() || ''
    const orasMatch = orasLine.match(/\[\[[^\]]+\|([^\]]+)\]\]/)
    const orasName = orasMatch ? orasMatch[1] : xyName

    // Extract subpage from the first link
    const subpageMatch = (xyLine || orasLine).match(/\[\[([^#\]]+)#/)
    const subpage = subpageMatch ? subpageMatch[1] : ''

    const trainerName = orasName || xyName
    if (!trainerName) { i++; continue }

    // Read battle range cells (next N lines correspond to the range columns)
    const battleRanges = []
    let rangeIdx = 0
    let j = i + 1

    while (j < lines.length && rangeIdx < ranges.length) {
      const cell = lines[j].trim()
      // Stop at next row delimiter or table end
      if (cell === '|-' || cell === '|}') break
      // A data/header cell
      if (cell.startsWith('|') || cell.startsWith('!')) {
        const hasCheck = /✔|✓|\{\{yes\}\}|\{\{tick\}\}/.test(cell)
        if (hasCheck) {
          battleRanges.push(ranges[rangeIdx])
        }
        rangeIdx++
      }
      j++
    }

    const trainer = { number, class: trainerClass, name: trainerName, subpage, battleRanges }
    if (section === 'normal') normalTrainers.push(trainer)
    else                      superTrainers.push(trainer)

    i = j
  }

  return { normalTrainers, superTrainers }
}

// ──────────────────────────────────────────────
// Normalisation helpers
// ──────────────────────────────────────────────

const SPECIES_MAP = {
  'Nidoran♀': 'Nidoran-F', 'Nidoran♂': 'Nidoran-M',
  'Farfetch\u2019d': "Farfetch'd", 'Farfetchd': "Farfetch'd",
  'Mr. Mime': 'Mr. Mime', 'Mime Jr.': 'Mime Jr.',
  'Porygon2': 'Porygon2', 'Porygon-Z': 'Porygon-Z',
  'Ho-Oh': 'Ho-Oh', 'Flabébé': 'Flabébé',
}

const MOVE_MAP = {
  'AncientPower': 'Ancient Power', 'BubbleBeam': 'Bubble Beam',
  'DoubleSlap': 'Double Slap', 'DragonBreath': 'Dragon Breath',
  'DynamicPunch': 'Dynamic Punch', 'ExtremeSpeed': 'Extreme Speed',
  'FeatherDance': 'Feather Dance', 'GrassWhistle': 'Grass Whistle',
  'Hi Jump Kick': 'High Jump Kick', 'Sand-Attack': 'Sand Attack',
  'Selfdestruct': 'Self-Destruct', 'SmellingSalt': 'Smelling Salts',
  'Softboiled': 'Soft-Boiled', 'SolarBeam': 'Solar Beam',
  'SonicBoom': 'Sonic Boom', 'ThunderPunch': 'Thunder Punch',
  'ViceGrip': 'Vise Grip', 'NightShade': 'Night Shade',
  'SmokeScreen': 'Smokescreen', 'PoisonPowder': 'Poison Powder',
  'TailWhip': 'Tail Whip', 'ThunderWave': 'Thunder Wave',
  'DragonRage': 'Dragon Rage', 'Thunderbolt': 'Thunderbolt',
  'Bubble Beam': 'Bubble Beam',
}

const ITEM_MAP = {
  'NeverMeltIce': 'Never-Melt Ice', 'TwistedSpoon': 'Twisted Spoon',
  'SilverPowder': 'Silver Powder', 'BrightPowder': 'Bright Powder',
  'BlackGlasses': 'Black Glasses', 'DeepSeaTooth': 'Deep Sea Tooth',
  'DeepSeaScale': 'Deep Sea Scale', "King's Rock": "King's Rock",
  'Babiri Berry': 'Babiri Berry',
}

const norm = (map, s) => map[s.trim()] ?? s.trim()

// ──────────────────────────────────────────────
// Parse trainer-class subpages for Pokemon set data
// ──────────────────────────────────────────────

const labelCounters = {}

function buildSetLabel(species, nature, item, moves, existingSetdex) {
  if (existingSetdex[species]) {
    for (const [lbl, s] of Object.entries(existingSetdex[species])) {
      if (s.nature === nature && s.item === item &&
          JSON.stringify(s.moves) === JSON.stringify(moves)) return lbl
    }
  }
  const base = `${species}-${nature}`
  labelCounters[base] = (labelCounters[base] ?? 0) + 1
  const n = labelCounters[base]
  return n === 1 ? `${species}-1` : `${species}-${n}`
}

function parseSetdexAndTrainerPokemon(wikitext) {
  const setdex = {}
  const trainerPokemon = {}

  let currentTrainers = []
  const lines = wikitext.split('\n')

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]

    // Section header: ===Name=== — anchors may be on THIS line or the NEXT line
    const headerMatch = line.match(/^===(.+?)===\s*$/)
    if (headerMatch) {
      // Try to find anchors in the header text itself
      let anchors = [...headerMatch[1].matchAll(/\{\{anchor\|([^}|]+)/g)].map(m => m[1].trim())

      // If not found in header, check the next line
      if (anchors.length === 0 && li + 1 < lines.length) {
        anchors = [...lines[li + 1].matchAll(/\{\{anchor\|([^}|]+)/g)].map(m => m[1].trim())
      }

      if (anchors.length > 0) {
        currentTrainers = anchors
      } else {
        // Plain header: strip wiki markup and split on commas
        const plain = headerMatch[1]
          .replace(/\[\[[^\]]*\|([^\]]*)\]\]/g, '$1')
          .replace(/\[\[([^\]]*)\]\]/g, '$1')
          .replace(/\{\{[^}]*\}\}/g, '')
          .trim()
        currentTrainers = plain ? plain.split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(Boolean) : []
      }
      continue
    }

    // {{lop/facility|game=6|dexNo|species|item|m1|t1|m2|t2|m3|t3|m4|t4|nature|hp|at|df|sa|sd|sp}}
    const fm = line.match(/\{\{lop\/facility\|game=6\|(.+?)\}\}/)
    if (!fm || currentTrainers.length === 0) continue

    const p = fm[1].split('|')
    if (p.length < 12) continue

    // Indices: 0=dex, 1=species, 2=item, 3=m1, 4=t1, 5=m2, 6=t2, 7=m3, 8=t3, 9=m4, 10=t4, 11=nature, 12-17=evs
    const species = norm(SPECIES_MAP, p[1])
    const item    = norm(ITEM_MAP, p[2])
    const moves   = [p[3], p[5], p[7], p[9]].map(m => norm(MOVE_MAP, m)).filter(Boolean)
    const nature  = p[11].trim()
    const evHp = +p[12] || 0, evAt = +p[13] || 0, evDf = +p[14] || 0
    const evSa = +p[15] || 0, evSd = +p[16] || 0, evSp = +p[17] || 0

    if (!species || !nature || moves.length === 0) continue

    const evs = {}
    if (evHp) evs.hp = evHp; if (evAt) evs.at = evAt; if (evDf) evs.df = evDf
    if (evSa) evs.sa = evSa; if (evSd) evs.sd = evSd; if (evSp) evs.sp = evSp

    if (!setdex[species]) setdex[species] = {}
    const label = buildSetLabel(species, nature, item, moves, setdex)
    if (!setdex[species][label]) setdex[species][label] = { evs, moves, nature, item }

    for (const trainer of currentTrainers) {
      if (!trainerPokemon[trainer]) trainerPokemon[trainer] = []
      if (!trainerPokemon[trainer].includes(label)) trainerPokemon[trainer].push(label)
    }
  }

  return { setdex, trainerPokemon }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  const outDir = path.join(__dirname, '..', 'src', 'data', 'battle-facilities', 'oras')
  fs.mkdirSync(outDir, { recursive: true })

  // 1. Parse main trainer list
  console.log('Fetching main trainer list...')
  const mainText = await fetchPage(MAIN_PAGE)
  const { normalTrainers, superTrainers } = parseTrainerList(mainText)
  console.log(`Normal: ${normalTrainers.length} trainers, Super: ${superTrainers.length} trainers`)

  // 2. Collect unique subpages from both trainer lists
  const subpageSet = new Set()
  for (const t of [...normalTrainers, ...superTrainers]) {
    if (t.subpage) subpageSet.add(t.subpage)
  }

  const allSetdex = {}
  const allTrainerPokemon = {}

  for (const subpage of subpageSet) {
    await sleep(400)
    try {
      const text = await fetchPage(subpage)
      const { setdex, trainerPokemon } = parseSetdexAndTrainerPokemon(text)

      for (const [sp, sets] of Object.entries(setdex)) {
        if (!allSetdex[sp]) allSetdex[sp] = {}
        Object.assign(allSetdex[sp], sets)
      }
      for (const [trainer, pokes] of Object.entries(trainerPokemon)) {
        if (!allTrainerPokemon[trainer]) allTrainerPokemon[trainer] = []
        for (const p of pokes) {
          if (!allTrainerPokemon[trainer].includes(p)) allTrainerPokemon[trainer].push(p)
        }
      }

      console.log(`  ${subpage}: ${Object.keys(setdex).length} species, ${Object.keys(trainerPokemon).length} trainers`)
    } catch (err) {
      console.warn(`  SKIP ${subpage}: ${err.message}`)
    }
  }

  // 3. Cross-reference coverage
  const checkCoverage = (trainers, label) => {
    let matched = 0
    for (const t of trainers) {
      if (allTrainerPokemon[t.name]) matched++
      else console.warn(`  [${label}] No data: ${t.class} ${t.name} (#${t.number})`)
    }
    console.log(`[${label}] Matched ${matched}/${trainers.length}`)
  }
  checkCoverage(normalTrainers, 'Normal')
  checkCoverage(superTrainers, 'Super')

  // 4. Build separate trainer_pokemon maps for Normal and Super
  const normalTrainerPokemon = {}
  const superTrainerPokemon  = {}
  for (const t of normalTrainers) {
    normalTrainerPokemon[t.name] = allTrainerPokemon[t.name] || []
  }
  for (const t of superTrainers) {
    superTrainerPokemon[t.name] = allTrainerPokemon[t.name] || []
  }

  // 5. Write output
  const write = (filename, data) => {
    const fp = path.join(outDir, filename)
    fs.writeFileSync(fp, JSON.stringify(data, null, 2))
    console.log(`Wrote ${fp}`)
  }

  const toTrainerJson = trainers => trainers.map(({ number, class: cls, name, battleRanges }) =>
    ({ number, class: cls, name, battleRanges })
  )

  write('battle_trainers_normal_oras.json', toTrainerJson(normalTrainers))
  write('battle_trainers_super_oras.json',  toTrainerJson(superTrainers))
  write('trainer_pokemon_normal_oras.json', normalTrainerPokemon)
  write('trainer_pokemon_super_oras.json',  superTrainerPokemon)
  write('setdex_oras.json',                 allSetdex)

  console.log(`\nSetdex: ${Object.keys(allSetdex).length} species`)
  console.log('Done! Remember to add setteam_oras.json with player team presets.')
}

main().catch(err => { console.error(err); process.exit(1) })
