/**
 * Verify local battle-facility data against Altissimo's resource pages.
 *
 * Usage:
 *   node src/damage-calc/_scripts/verify_altissimo_battle_facility_data.mjs
 *   node src/damage-calc/_scripts/verify_altissimo_battle_facility_data.mjs rs swsh
 *   node src/damage-calc/_scripts/verify_altissimo_battle_facility_data.mjs --offline --cache-dir /tmp/ribbon-helper-altissimo-pages
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')
const DATA_ROOT = path.join(__dirname, '../../data/battle-facilities')
const DEFAULT_CACHE_DIR = path.join(REPO_ROOT, '.cache/altissimo-battle-facilities')
const JSON_CACHE = new Map()

const STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp']

const NATURE_MODS = {
  Hardy: [], Lonely: ['at', 'df'], Brave: ['at', 'sp'], Adamant: ['at', 'sa'], Naughty: ['at', 'sd'],
  Bold: ['df', 'at'], Docile: [], Relaxed: ['df', 'sp'], Impish: ['df', 'sa'], Lax: ['df', 'sd'],
  Timid: ['sp', 'at'], Hasty: ['sp', 'df'], Serious: [], Jolly: ['sp', 'sa'], Naive: ['sp', 'sd'],
  Modest: ['sa', 'at'], Mild: ['sa', 'df'], Quiet: ['sa', 'sp'], Bashful: [], Rash: ['sa', 'sd'],
  Calm: ['sd', 'at'], Gentle: ['sd', 'df'], Sassy: ['sd', 'sp'], Careful: ['sd', 'sa'], Quirky: [],
}

const MOVE_NAME_MAP = {
  AncientPower: 'Ancient Power',
  Ancientpower: 'Ancient Power',
  BubbleBeam: 'Bubble Beam',
  Bubblebeam: 'Bubble Beam',
  DoubleSlap: 'Double Slap',
  Doubleslap: 'Double Slap',
  DragonBreath: 'Dragon Breath',
  Dragonbreath: 'Dragon Breath',
  DynamicPunch: 'Dynamic Punch',
  Dynamicpunch: 'Dynamic Punch',
  ExtremeSpeed: 'Extreme Speed',
  'Faint Attack': 'Feint Attack',
  FeatherDance: 'Feather Dance',
  Featherdance: 'Feather Dance',
  GrassWhistle: 'Grass Whistle',
  Grasswhistle: 'Grass Whistle',
  'Hi Jump Kick': 'High Jump Kick',
  PoisonPowder: 'Poison Powder',
  Poisonpowder: 'Poison Powder',
  'Sand-Attack': 'Sand Attack',
  Selfdestruct: 'Self-Destruct',
  Smellingsalt: 'Smelling Salts',
  SmokeScreen: 'Smokescreen',
  Softboiled: 'Soft-Boiled',
  Solarbeam: 'Solar Beam',
  SolarBeam: 'Solar Beam',
  SonicBoom: 'Sonic Boom',
  Sonicboom: 'Sonic Boom',
  ThunderPunch: 'Thunder Punch',
  Thunderpunch: 'Thunder Punch',
  ThunderShock: 'Thunder Shock',
  Thundershock: 'Thunder Shock',
  ViceGrip: 'Vise Grip',
  Vicegrip: 'Vise Grip',
}

const ITEM_NAME_MAP = {
  BlackGlasses: 'Black Glasses',
  BrightPowder: 'Bright Powder',
  Brightpowder: 'Bright Powder',
  NeverMeltIce: 'Never-Melt Ice',
  SilverPowder: 'Silver Powder',
  TwistedSpoon: 'Twisted Spoon',
}

const ABILITY_NAME_MAP = {
  Compoundeyes: 'Compound Eyes',
  Lightningrod: 'Lightning Rod',
}

const GALARIAN_SPECIES = {
  Darmanitan: 'Darmanitan-Galar',
  Rapidash: 'Rapidash-Galar',
  Stunfisk: 'Stunfisk-Galar',
  Weezing: 'Weezing-Galar',
}

const BDSP_BOSS_SUFFIX = {
  Roark: 'Roark',
  Gardenia: 'Gardenia',
  Maylene: 'Maylene',
  'Crasher Wake': 'Crasher Wake',
  Fantina: 'Fantina',
  Byron: 'Byron',
  Candice: 'Candice',
  Volkner: 'Volkner',
  Cynthia: 'Cynthia',
  Palmer: 'Palmer Master',
  'Roark & Byron': 'Roark/Byron',
  'Mira & Cheryl': 'Mira/Cheryl',
  'Gardenia & Fantina': 'Gardenia/Fantina',
  'Jupiter & Saturn': 'Saturn/Jupiter',
  'Maylene & Candice': 'Candice/Maylene',
  'Riley & Marley': 'Riley/Marley',
  'Buck & Bertha': 'Buck/Bertha',
  'Flint & Volkner': 'Flint/Volkner',
  'Mars & Cyrus': 'Mars/Cyrus',
  'Rival & Palmer': 'Barry/Palmer',
}

const SUNMOON_LABEL_ALIASES = {
  'Aerodactyl-1 (Sun/Moon)': 'Aerodactyl-SM',
  'Electivire-4 (Sun/Moon)': 'Electivire-SM',
  'Golem-1 (Alolan) (Sun/Moon)': 'Golem-Alola-SM',
  'Incineroar-3 (Sun/Moon)': 'Incineroar-SM',
  'Magnezone-3 (Sun/Moon)': 'Magnezone-SM',
  'Porygon-Z-2 (Sun/Moon)': 'Porygon-Z-SM',
  'Rhyperior-2 (Sun/Moon)': 'Rhyperior-SM',
  'Togedemaru-3 (Sun/Moon)': 'Togedemaru-SM',
  'Vikavolt-3 (Sun/Moon)': 'Vikavolt-SM',
}

const SUNMOON_FORM_SUFFIX = {
  Alolan: 'Alola',
  Baile: 'Baile',
  Midnight: 'Midnight',
  "Pa'u": "Pa'u",
  'Pom-Pom': 'Pom-Pom',
  Sensu: 'Sensu',
}

const BDSP_PALMER_CLASSIC_LABELS = new Set([
  'Cresselia-1',
  'Dragonite-1',
  'Heatran-1',
  'Milotic-1',
  'Regigigas-1',
  'Rhyperior-1',
])

const SOURCES = {
  index: {
    cacheName: 'battle-challenges',
    url: 'https://altissimo1.github.io/General/battle-challenges.html',
  },
  'rs-tower-pokemon': {
    cacheName: 'rs-tower-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-pokemon.html',
  },
  'rs-tower-trainers': {
    cacheName: 'rs-tower-trainers',
    url: 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-trainers.html',
  },
  'rse-frontier-pokemon': {
    cacheName: 'rse-frontier-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/RSE/battle-frontier-pokemon.html',
  },
  'rse-frontier-trainers': {
    cacheName: 'rse-frontier-trainers',
    url: 'https://altissimo1.github.io/Main-Series/RSE/battle-frontier-trainers.html',
  },
  'dp-tower-pokemon': {
    cacheName: 'dp-tower-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-pokemon.html',
  },
  'dp-tower-trainers': {
    cacheName: 'dp-tower-trainers',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-trainers.html',
  },
  'dp-tower-main': {
    cacheName: 'dp-tower-main',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower.html',
  },
  'dppt-frontier-pokemon': {
    cacheName: 'dppt-frontier-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-frontier-pokemon.html',
  },
  'dppt-frontier-trainers': {
    cacheName: 'dppt-frontier-trainers',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-frontier-trainers.html',
  },
  'pthgss-tower-main': {
    cacheName: 'pthgss-tower-main',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/frontier-battle-tower.html',
  },
  'pthgss-hall-pokemon': {
    cacheName: 'pthgss-hall-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-hall-pokemon.html',
  },
  'xy-maison-pokemon': {
    cacheName: 'xy-maison-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/XY/battle-maison-pokemon.html',
  },
  'xy-maison-trainers': {
    cacheName: 'xy-maison-trainers',
    url: 'https://altissimo1.github.io/Main-Series/XY/battle-maison-trainers.html',
  },
  'sm-tree-pokemon': {
    cacheName: 'sm-tree-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/SM/battle-tree-pokemon.html',
  },
  'sm-tree-trainers': {
    cacheName: 'sm-tree-trainers',
    url: 'https://altissimo1.github.io/Main-Series/SM/battle-tree-trainers.html',
  },
  'swsh-tower-pokemon': {
    cacheName: 'swsh-tower-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-pokemon.html',
  },
  'swsh-tower-trainers': {
    cacheName: 'swsh-tower-trainers',
    url: 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-trainers.html',
  },
  'bdsp-tower-pokemon': {
    cacheName: 'bdsp-tower-pokemon',
    url: 'https://altissimo1.github.io/Main-Series/BDSP/battle-tower-pokemon.html',
  },
  'bdsp-tower-trainers': {
    cacheName: 'bdsp-tower-trainers',
    url: 'https://altissimo1.github.io/Main-Series/BDSP/battle-tower-trainers.html',
  },
  'bdsp-tower-main': {
    cacheName: 'bdsp-tower-main',
    url: 'https://altissimo1.github.io/Main-Series/BDSP/battle-tower.html',
  },
  'bdsp-tower-bosses': {
    cacheName: 'bdsp-tower-bosses',
    url: 'https://altissimo1.github.io/Main-Series/BDSP/battle-tower-bosses.html',
  },
  'orre-colosseum-story-mt-battle': {
    cacheName: 'orre-colosseum-story-mt-battle',
    url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Story-Mode/mt-battle.html',
  },
  'orre-colosseum-mt-battle-singles': {
    cacheName: 'orre-colosseum-mt-battle-singles',
    url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-singles.html',
  },
  'orre-colosseum-mt-battle-doubles': {
    cacheName: 'orre-colosseum-mt-battle-doubles',
    url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-doubles.html',
  },
  'orre-xd-mt-battle': {
    cacheName: 'orre-xd-mt-battle',
    url: 'https://altissimo1.github.io/Supplementary-Series/Orre/XD/mt-battle.html',
  },
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\0/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function comparisonKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeSpeciesName(value) {
  const text = normalizeText(value)
  if (text === 'Nidoran♀') return 'Nidoran-F'
  if (text === 'Nidoran♂') return 'Nidoran-M'
  return text
    .replace(/\s*\((?:M|F|Male|Female)\)\s*$/i, '')
    .replace(/\s*[♀♂]\s*$/, '')
    .replace(/^Mr\. Mime$/, 'Mr. Mime')
}

function normalizeItemName(value) {
  const item = normalizeText(value)
  if (!item || item === 'N/A' || item === 'None' || item === '-') return ''
  return ITEM_NAME_MAP[item] ?? item
}

function normalizeAbilityName(value) {
  const ability = normalizeText(value)
  if (!ability || ability === 'N/A' || ability === '-') return ''
  return ABILITY_NAME_MAP[ability] ?? ability
}

function normalizeMoveName(value) {
  const move = normalizeText(value)
  if (!move || move === 'N/A' || move === '-') return ''

  const variablePower = move.match(/^(Hidden Power|Return|Frustration)\s*\((\d+) power\)$/)
  if (variablePower) {
    const [, baseName, power] = variablePower
    if (baseName === 'Hidden Power') return 'Hidden Power'
    if (power === '102') return baseName
    return `${baseName} (${power} BP)`
  }

  return MOVE_NAME_MAP[move] ?? move
}

function normalizeMoveCell(cell) {
  const raw = normalizeText(cell.textContent)
  if (!raw || raw === 'N/A' || raw === '-') return ''

  const hiddenPower = raw.match(/^Hidden Power\s*\((\d+) power\)$/)
  if (hiddenPower) {
    const ignoredClasses = new Set(['type-false', 'type-true', 'status-move', 'light-false', 'light-true'])
    const type = [...cell.classList].find(className => !ignoredClasses.has(className))
    if (type) return `Hidden Power ${type[0].toUpperCase()}${type.slice(1)} (${hiddenPower[1]} BP)`
  }

  return normalizeMoveName(raw)
}

function comparisonMove(value) {
  return comparisonKey(normalizeMoveName(value).replace(/\s+\(Doubled\)$/, ''))
}

function comparisonMoveBag(moves = []) {
  return moves.map(comparisonMove).filter(Boolean).sort()
}

function parseNumber(value) {
  const text = normalizeText(value)
  if (!text || text === 'N/A' || text === '-') return 0
  const parsed = Number(text)
  assert(Number.isFinite(parsed), `Unable to parse number: ${value}`)
  return parsed
}

function evObjectToVector(evs = {}) {
  return STAT_KEYS.map(stat => Number(evs[stat] ?? 0))
}

function vectorToEvObject(vector) {
  return Object.fromEntries(STAT_KEYS.flatMap((stat, index) => vector[index] ? [[stat, vector[index]]] : []))
}

function compareEvVectors(left, right) {
  const normalize = vector => vector.map(value => Math.floor(value / 4))
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

function naturesEquivalent(left, right) {
  if (comparisonKey(left) === comparisonKey(right)) return true
  return JSON.stringify(NATURE_MODS[left] ?? []) === JSON.stringify(NATURE_MODS[right] ?? [])
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function canonicalNature(value) {
  const modifiers = NATURE_MODS[value]
  return modifiers ? modifiers.join(':') : comparisonKey(value)
}

function canonicalLocalSetToken(localEntry, options = {}) {
  const set = localEntry.set
  const defaultIvs = Number(options.defaultIvs ?? 31)
  const defaultLevel = Number(options.defaultLevel ?? 50)

  return JSON.stringify({
    species: comparisonKey(localEntry.species),
    item: comparisonKey(normalizeItemName(set.item)),
    ability: comparisonKey(normalizeAbilityName(set.ability)),
    nature: canonicalNature(set.nature),
    moves: comparisonMoveBag(set.moves),
    evs: evObjectToVector(set.evs).map(value => Math.floor(value / 4)),
    ivs: STAT_KEYS.map(stat => Number(set.ivs?.[stat] ?? defaultIvs)),
    level: Number(set.level ?? defaultLevel),
    dynamax: Boolean(set.dynamax),
    gigantamax: Boolean(set.gigantamax),
  })
}

function cleanLabelGender(value) {
  const text = normalizeText(value)
  if (text === 'Nidoran♀') return 'Nidoran-F'
  if (text === 'Nidoran♂') return 'Nidoran-M'
  return text
    .replace(/\s*[♀♂]\s*$/, '')
    .replace(/\s*\((?:M|F|Male|Female)\)\s*$/i, '')
}

function normalizeSourceLabelText(value) {
  return normalizeText(value)
    .replace(/\)\s*\(/g, ') (')
    .replace(/(\d)\s*\(/g, '$1 (')
}

function ensureSetNumber(label) {
  const clean = cleanLabelGender(label).replace(/\s+\(Plant\)$/, '')
  return /-\d+(?:\s*\(|$)/.test(clean) ? clean : `${clean}-1`
}

function speciesFromSetLabel(label) {
  return normalizeSpeciesName(
    cleanLabelGender(label)
      .replace(/\s+\(.+\)$/, '')
      .replace(/\s+\(Plant\)$/, '')
      .replace(/-\d+(?:,\s*\d+)*$/, '')
      .replace(/-H$/, ''),
  )
}

function expandCompressedLabel(label) {
  const clean = normalizeText(label)
  const match = clean.match(/^(.+?)-(\d+(?:,\s*\d+)+)(\s+\(.+\))?$/)
  if (!match) return [clean]
  const [, base, numbers, suffix = ''] = match
  return numbers.split(',').map(number => `${base}-${number.trim()}${suffix}`)
}

function expandMixedRosterLabel(label) {
  const clean = normalizeText(label)
  const match = clean.match(/^(.+)-(\d+(?:\s+\([^()]+\))?(?:,\s*\d+(?:\s+\([^()]+\))?)+)$/)
  if (!match) return [clean]
  const [, base, variants] = match
  return variants.split(',').map(variant => `${base}-${variant.trim()}`)
}

function stripNumericSourceSuffix(label) {
  return normalizeText(label).replace(/\s+\(\d+\)$/, '')
}

function readJson(relativePath) {
  if (!JSON_CACHE.has(relativePath)) {
    JSON_CACHE.set(relativePath, JSON.parse(fs.readFileSync(path.join(DATA_ROOT, relativePath), 'utf8')))
  }
  return JSON_CACHE.get(relativePath)
}

function flattenSetdex(relativePath, options = {}) {
  const source = readJson(relativePath)
  const setdex = options.modeKey ? source[options.modeKey] : source
  assert(setdex, `Missing setdex data ${relativePath}${options.modeKey ? `:${options.modeKey}` : ''}`)

  const labels = new Map()
  const originals = new Map()

  for (const [species, sets] of Object.entries(setdex)) {
    for (const [label, set] of Object.entries(sets)) {
      const entry = { species, label, set }
      originals.set(label, entry)
      labels.set(label, entry)
      const numericBase = stripNumericSourceSuffix(label)
      if (numericBase !== label && !labels.has(numericBase)) labels.set(numericBase, entry)
      for (const expanded of expandCompressedLabel(label)) labels.set(expanded, entry)
    }
  }

  return { labels, originals }
}

function cacheFileName(source) {
  if (source.cacheName) return `${source.cacheName}.html`
  const hash = crypto.createHash('sha1').update(source.url).digest('hex').slice(0, 12)
  return `${hash}.html`
}

async function loadSource(sourceId, options) {
  const source = SOURCES[sourceId]
  assert(source, `Unknown source ${sourceId}`)

  const cachePath = path.join(options.cacheDir, cacheFileName(source))
  if (!options.refresh && fs.existsSync(cachePath)) {
    return fs.readFileSync(cachePath, 'utf8')
  }
  if (options.offline) {
    throw new Error(`Offline cache miss for ${sourceId}: ${cachePath}`)
  }

  const response = await fetch(source.url, {
    headers: { 'User-Agent': 'RibbonHelper/1.0 (Altissimo verifier)' },
  })
  if (!response.ok) throw new Error(`Failed to fetch ${source.url}: ${response.status}`)
  const html = await response.text()
  fs.mkdirSync(options.cacheDir, { recursive: true })
  fs.writeFileSync(cachePath, html)
  return html
}

function documentFor(html) {
  return new JSDOM(html).window.document
}

function previousHeading(element, tagName = 'H4') {
  let node = element.previousElementSibling
  while (node) {
    if (node.tagName === tagName) return normalizeText(node.textContent)
    node = node.previousElementSibling
  }
  return ''
}

function nearestPreviousHeading(element, tags = new Set(['H3', 'H4'])) {
  let node = element.previousElementSibling
  while (node) {
    if (tags.has(node.tagName)) return normalizeText(node.textContent)
    node = node.previousElementSibling
  }
  return ''
}

function hasPokemonSetHeader(table) {
  const header = normalizeText(table.querySelector('thead')?.textContent)
  return header.includes('Pokémon') && header.includes('Moves')
}

function parseStandardPokemonSets(html, layout) {
  const document = documentFor(html)
  const sets = []
  let sequence = 0

  for (const table of document.querySelectorAll('table')) {
    const caption = normalizeText(table.querySelector('caption')?.textContent)
    if (!hasPokemonSetHeader(table)) continue
    if (layout.tableFilter && !layout.tableFilter(table, caption)) continue

    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children]
      if (!cells.some(cell => cell.getAttribute('rowspan') === '2')) continue
      const maxIndex = Math.max(
        layout.labelIndex,
        layout.itemIndex ?? 0,
        layout.natureIndex ?? 0,
        layout.abilityIndex ?? 0,
        layout.movesStart + layout.moveCount - 1,
        layout.evsStart != null ? layout.evsStart + 5 : 0,
        layout.statsStart != null ? layout.statsStart + 5 : 0,
        layout.ivEvStart != null ? layout.ivEvStart + 11 : 0,
      )
      if (cells.length <= maxIndex) continue

      const text = cells.map(cell => normalizeText(cell.textContent))
      const sourceNumber = layout.sourceNumberIndex != null
        ? text[layout.sourceNumberIndex]
        : String(++sequence)
      const rawLabel = text[layout.labelIndex]
      if (!rawLabel) continue

      const context = { table, row, cells, text, caption, sourceNumber }
      const label = layout.labelBuilder
        ? layout.labelBuilder(rawLabel, context)
        : cleanLabelGender(rawLabel)
      const species = layout.speciesBuilder
        ? layout.speciesBuilder(rawLabel, context)
        : speciesFromSetLabel(label)

      const set = {
        sourceNumber,
        rawLabel,
        label,
        species,
        moves: cells
          .slice(layout.movesStart, layout.movesStart + layout.moveCount)
          .map(normalizeMoveCell),
      }

      if (layout.abilityIndex != null) set.ability = normalizeAbilityName(text[layout.abilityIndex])
      if (layout.natureIndex != null) set.nature = normalizeText(text[layout.natureIndex])
      if (layout.itemIndex != null) set.item = normalizeItemName(text[layout.itemIndex])
      if (layout.evsStart != null) set.evs = text.slice(layout.evsStart, layout.evsStart + 6).map(parseNumber)
      if (layout.statsStart != null) set.stats = text.slice(layout.statsStart, layout.statsStart + 6).map(parseNumber)
      if (layout.ivEvStart != null) {
        const pairs = text.slice(layout.ivEvStart, layout.ivEvStart + 12).map(parseNumber)
        set.ivs = pairs.filter((_, index) => index % 2 === 0)
        set.evs = pairs.filter((_, index) => index % 2 === 1)
      }
      if (layout.extra) Object.assign(set, layout.extra(rawLabel, context))

      sets.push(set)
    }
  }

  return sets
}

function parseRsTowerPokemon(html, level) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    itemIndex: 2,
    movesStart: 3,
    moveCount: 4,
    evsStart: 7,
    tableFilter: table => Number(table.dataset.level) === level,
  }).map(set => ({ ...set, level }))
}

function parseEmeraldFrontierPokemon(html) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    natureIndex: 2,
    itemIndex: 3,
    movesStart: 4,
    moveCount: 4,
    evsStart: 8,
    labelBuilder: (label, { sourceNumber }) => `${ensureSetNumber(label)} (${sourceNumber})`,
  })
}

function parseDpTowerPokemon(html) {
  return parseStandardPokemonSets(html, {
    sourceNumberIndex: 0,
    labelIndex: 2,
    itemIndex: 3,
    movesStart: 4,
    moveCount: 4,
    evsStart: 8,
  })
}

function parseDpPalmerPokemon(html) {
  const suffixByCaption = {
    'Palmer Battle (1st)': 'Palmer Silver',
    'Palmer Battle (2nd)': 'Palmer Gold',
  }
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    itemIndex: 2,
    movesStart: 3,
    moveCount: 4,
    evsStart: 7,
    tableFilter: (_table, caption) => caption in suffixByCaption,
    labelBuilder: (label, { caption }) => `${speciesFromSetLabel(label)} (${suffixByCaption[caption]})`,
  })
}

function parsePthgssFrontierPokemon(html) {
  return parseStandardPokemonSets(html, {
    sourceNumberIndex: 0,
    labelIndex: 2,
    natureIndex: 3,
    itemIndex: 4,
    movesStart: 5,
    moveCount: 4,
    evsStart: 9,
    labelBuilder: (label, { sourceNumber }) => `${ensureSetNumber(label)} (${sourceNumber})`,
  })
}

function parsePthgssHallPokemon(html) {
  const wormadamHallLabels = {
    'Wormadam (Plant)': 'Wormadam-H',
    'Wormadam (Sandy)': 'Wormadam-G-H',
    'Wormadam (Trash)': 'Wormadam-S-H',
  }
  const wormadamHallSpecies = {
    'Wormadam (Plant)': 'Wormadam',
    'Wormadam (Sandy)': 'Wormadam-G',
    'Wormadam (Trash)': 'Wormadam-S',
  }
  return parseStandardPokemonSets(html, {
    sourceNumberIndex: 0,
    labelIndex: 2,
    natureIndex: 3,
    itemIndex: 4,
    movesStart: 5,
    moveCount: 4,
    evsStart: 9,
    labelBuilder: label => wormadamHallLabels[normalizeText(label)] ?? `${speciesFromSetLabel(label)}-H`,
    speciesBuilder: label => wormadamHallSpecies[normalizeText(label)] ?? speciesFromSetLabel(label),
  })
}

function parseModernNoAbilityPokemon(html) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    natureIndex: 2,
    itemIndex: 3,
    movesStart: 4,
    moveCount: 4,
    evsStart: 8,
  })
}

function normalizeSunMoonLabel(rawLabel) {
  const text = normalizeSourceLabelText(rawLabel)
  if (SUNMOON_LABEL_ALIASES[text]) return SUNMOON_LABEL_ALIASES[text]

  const mega = text.match(/^\(Mega(?:\s+[XY])?\)\s*(.+)-(\d+)$/)
  if (mega) return `${cleanLabelGender(mega[1])}-${mega[2]}-Mega`
  const megaSuffix = text.match(/^(.+)-(\d+)\s+\(Mega(?:\s+[XY])?\)$/)
  if (megaSuffix) return `${cleanLabelGender(megaSuffix[1])}-${megaSuffix[2]}-Mega`

  const isSunMoonOnly = /\(Sun\/Moon\)\s*$/.test(text)
  const versionless = text
    .replace(/\s*\(Ultra Sun\/Ultra Moon\)\s*$/, '')
    .replace(/\s*\(Sun\/Moon\)\s*$/, '')
  if (isSunMoonOnly) return `${versionless} (Sun/Moon)`

  const formMatch = versionless.match(/^(.+)-(\d+)\s+\((.+)\)$/)
  if (!formMatch) return cleanLabelGender(versionless)

  const [, species, setNumber, form] = formMatch
  const numericSet = Number(setNumber)
  const pairedFormSet = Number.isFinite(numericSet) ? Math.ceil(numericSet / 2) : setNumber
  if (species === 'Oricorio') return `Oricorio-${SUNMOON_FORM_SUFFIX[form] ?? form}-1`
  if (species === 'Lycanroc') {
    if (form === 'Midday') return `${cleanLabelGender(species)}-${pairedFormSet}`
    if (form === 'Midnight') return `${cleanLabelGender(species)}-Midnight-${pairedFormSet}`
  }
  if (form === 'Kantonian') return `${cleanLabelGender(species)}-${pairedFormSet}`
  const suffix = SUNMOON_FORM_SUFFIX[form]
  if (suffix) return `${cleanLabelGender(species)}-${suffix}-${pairedFormSet}`
  return cleanLabelGender(versionless)
}

function sunMoonSpecies(rawLabel, context) {
  const label = normalizeSunMoonLabel(rawLabel)
  if (label.endsWith('-Mega')) {
    const base = speciesFromSetLabel(label.replace(/-Mega$/, ''))
    const item = normalizeItemName(context.text[3])
    if (base === 'Charizard' && item === 'Charizardite X') return 'Mega Charizard X'
    if (base === 'Charizard' && item === 'Charizardite Y') return 'Mega Charizard Y'
    return `Mega ${base}`
  }
  if (label.endsWith('-SM')) return speciesFromSetLabel(label.replace(/-SM$/, ''))
  return speciesFromSetLabel(label)
}

function parseSunMoonPokemon(html) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    natureIndex: 2,
    itemIndex: 3,
    movesStart: 4,
    moveCount: 4,
    evsStart: 8,
    labelBuilder: normalizeSunMoonLabel,
    speciesBuilder: sunMoonSpecies,
  })
}

function cleanSwShLabel(rawLabel) {
  return normalizeText(rawLabel)
    .replace(/^\((?:Gigantamax|Dynamax)\)\s*/, '')
    .replace(/\s*\(Galarian\)\s*$/, '')
    .replace(/\s*\((?:Amped|Low Key)\)\s*$/, '')
    .replace(/\s*[♂♀]\s*$/, '')
    .replace(/\s*\((?:Gigantamax|Dynamax)\)\s*$/, '')
}

function swshSpecies(rawLabel, cleanLabel) {
  const displaySpecies = speciesFromSetLabel(cleanLabel)
  if (/\(Galarian\)/.test(rawLabel)) return GALARIAN_SPECIES[displaySpecies]
  if (displaySpecies === 'Indeedee' && /♂/.test(rawLabel)) return 'Indeedee-M'
  if (displaySpecies === 'Indeedee' && /♀/.test(rawLabel)) return 'Indeedee-F'
  return displaySpecies
}

function parseSwShPokemon(html) {
  return parseStandardPokemonSets(html, {
    sourceNumberIndex: 0,
    labelIndex: 2,
    natureIndex: 3,
    itemIndex: 4,
    movesStart: 5,
    moveCount: 4,
    evsStart: 9,
    labelBuilder: cleanSwShLabel,
    speciesBuilder: rawLabel => swshSpecies(rawLabel, cleanSwShLabel(rawLabel)),
    extra: (rawLabel, { table, caption }) => {
      const ivGroup = Number(caption.match(/(\d+)IV/)?.[1])
      const label = cleanSwShLabel(rawLabel)
      return {
        ivGroup,
        ivs: STAT_KEYS.map(() => label === 'Ditto-5' ? 12 : ivGroup),
        dynamax: /\(Dynamax\)/.test(rawLabel),
        gigantamax: /\(Gigantamax\)/.test(rawLabel),
        tableCaption: normalizeText(table.querySelector('caption')?.textContent),
      }
    },
  })
}

function normalizeBdspLabel(rawLabel) {
  const text = normalizeSourceLabelText(rawLabel)
  if (text.startsWith('Wormadam-Plant-')) return text.replace(/^Wormadam-Plant-/, 'Wormadam-')
  if (BDSP_PALMER_CLASSIC_LABELS.has(text)) return `${text} (Palmer Classic)`
  return text
}

function bdspSpecies(rawLabel) {
  return speciesFromSetLabel(normalizeBdspLabel(rawLabel))
}

function parseBdspPokemon(html) {
  return parseStandardPokemonSets(html, {
    sourceNumberIndex: 0,
    labelIndex: 2,
    abilityIndex: 3,
    natureIndex: 4,
    itemIndex: 5,
    movesStart: 6,
    moveCount: 4,
    statsStart: 10,
    labelBuilder: normalizeBdspLabel,
    speciesBuilder: bdspSpecies,
  })
}

function parseBdspPalmerClassicPokemon(html) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    abilityIndex: 2,
    natureIndex: 3,
    itemIndex: 4,
    movesStart: 5,
    moveCount: 4,
    statsStart: 9,
    tableFilter: (_table, caption) => /^Palmer Battle/.test(caption),
    labelBuilder: label => `${speciesFromSetLabel(label)}-1 (Palmer Classic)`,
  })
}

function parseBdspBossPokemon(html) {
  return parseStandardPokemonSets(html, {
    labelIndex: 1,
    abilityIndex: 2,
    natureIndex: 3,
    itemIndex: 4,
    movesStart: 5,
    moveCount: 4,
    statsStart: 9,
    labelBuilder: (label, { table }) => {
      const heading = previousHeading(table)
      const match = heading.match(/\((.+)\)/)
      assert(match, `Unable to derive BDSP boss suffix from heading: ${heading}`)
      const suffix = BDSP_BOSS_SUFFIX[match[1]]
      assert(suffix, `Missing BDSP boss suffix mapping for ${match[1]}`)
      return `${cleanLabelGender(label)} (${suffix})`
    },
  })
}

function parseMtBattlePokemon(html, modeId) {
  const fixedStats = modeId === 'colosseum-story' || modeId === 'xd'
  const document = documentFor(html)
  const sets = []
  const trainerPokemon = {}
  const trainers = []

  for (const [tableIndex, table] of [...document.querySelectorAll('table')].entries()) {
    if (!hasPokemonSetHeader(table)) continue
    const battle = tableIndex + 1
    const caption = normalizeText(table.querySelector('caption')?.textContent)
    const identity = splitTrainerIdentity(caption)
    trainers.push({ number: battle, ...identity })

    const roster = []
    let slot = 0
    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children]
      if (!cells.some(cell => cell.getAttribute('rowspan') === '2')) continue
      const text = cells.map(cell => normalizeText(cell.textContent))
      if (cells.length < (fixedStats ? 15 : 21)) continue

      slot += 1
      const species = normalizeSpeciesName(text[1])
      const label = `${species} (Battle ${battle}-${slot})`
      const set = {
        label,
        species,
        ability: normalizeAbilityName(text[2]),
        nature: text[3],
        moves: cells.slice(5, 9).map(normalizeMoveCell),
      }

      if (fixedStats) {
        set.level = parseNumber(text[4])
        set.stats = text.slice(9, 15).map(parseNumber)
        if (species === 'Shedinja') set.stats[0] = 1
      } else {
        set.item = normalizeItemName(text[4])
        const pairs = text.slice(9, 21).map(parseNumber)
        set.ivs = pairs.filter((_, index) => index % 2 === 0)
        set.evs = pairs.filter((_, index) => index % 2 === 1)
      }

      sets.push(set)
      roster.push(label)
    }
    trainerPokemon[identity.name] = roster
  }

  return { sets, trainers, trainerPokemon }
}

function splitTrainerIdentity(identity) {
  const text = normalizeText(identity)
  const lastSpace = text.lastIndexOf(' ')
  assert(lastSpace > 0, `Unable to split trainer identity: ${identity}`)
  return { class: text.slice(0, lastSpace), name: text.slice(lastSpace + 1) }
}

function calcHp(base, iv, ev, level) {
  if (base === 1) return 1
  return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + level + 10
}

function calcStat(base, iv, ev, level, nature, stat) {
  const [increased, decreased] = NATURE_MODS[nature] ?? []
  const multiplier = increased === stat ? 1.1 : decreased === stat ? 0.9 : 1
  return Math.floor((Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5) * multiplier)
}

function calculatedStats(localEntry, pokedex, level, defaultIvs) {
  const dex = pokedex[localEntry.species]
  assert(dex, `Missing pokedex entry for ${localEntry.species}`)
  const base = dex.bs
  const set = localEntry.set
  const evs = Object.fromEntries(STAT_KEYS.map(stat => [stat, Number(set.evs?.[stat] ?? 0)]))
  const ivs = Object.fromEntries(STAT_KEYS.map(stat => [stat, Number(set.ivs?.[stat] ?? defaultIvs)]))
  return [
    calcHp(base.hp, ivs.hp, evs.hp, level),
    calcStat(base.at, ivs.at, evs.at, level, set.nature, 'at'),
    calcStat(base.df, ivs.df, evs.df, level, set.nature, 'df'),
    calcStat(base.sa, ivs.sa, evs.sa, level, set.nature, 'sa'),
    calcStat(base.sd, ivs.sd, evs.sd, level, set.nature, 'sd'),
    calcStat(base.sp, ivs.sp, evs.sp, level, set.nature, 'sp'),
  ]
}

function applyVisibleItemStatModifiers(stats, localEntry) {
  const adjusted = [...stats]
  const species = localEntry.species
  const item = normalizeItemName(localEntry.set.item)

  if (item === 'Choice Band') adjusted[1] = Math.floor(adjusted[1] * 1.5)
  else if (item === 'Choice Specs') adjusted[3] = Math.floor(adjusted[3] * 1.5)
  else if (item === 'Choice Scarf') adjusted[5] = Math.floor(adjusted[5] * 1.5)
  else if (item === 'Iron Ball' || item === 'Macho Brace') adjusted[5] = Math.floor(adjusted[5] / 2)
  else if (item === 'Thick Club' && (species === 'Cubone' || species === 'Marowak')) {
    adjusted[1] *= 2
  }

  return adjusted
}

function setFieldFailures(label, source, localEntry, fields, statOptions) {
  const failures = []
  const set = localEntry.set
  const pokedex = statOptions?.pokedexPath ? readJson(statOptions.pokedexPath) : null

  for (const field of fields) {
    if (field === 'species' && comparisonKey(localEntry.species) !== comparisonKey(source.species)) {
      failures.push(`${label}: species ${localEntry.species} !== ${source.species}`)
    } else if (field === 'item' && comparisonKey(normalizeItemName(set.item)) !== comparisonKey(source.item)) {
      failures.push(`${label}: item ${set.item ?? ''} !== ${source.item ?? ''}`)
    } else if (field === 'ability' && comparisonKey(normalizeAbilityName(set.ability)) !== comparisonKey(source.ability)) {
      failures.push(`${label}: ability ${set.ability ?? ''} !== ${source.ability ?? ''}`)
    } else if (field === 'nature' && !naturesEquivalent(set.nature, source.nature)) {
      failures.push(`${label}: nature ${set.nature ?? ''} !== ${source.nature ?? ''}`)
    } else if (field === 'moves') {
      const localMoves = comparisonMoveBag(set.moves)
      const sourceMoves = comparisonMoveBag(source.moves)
      if (!arraysEqual(localMoves, sourceMoves)) {
        failures.push(`${label}: moves ${set.moves?.join(', ') ?? ''} !== ${source.moves?.join(', ') ?? ''}`)
      }
    } else if (field === 'evs') {
      const localEvs = evObjectToVector(set.evs)
      if (!compareEvVectors(localEvs, source.evs ?? [])) {
        failures.push(`${label}: EVs ${JSON.stringify(localEvs)} !== ${JSON.stringify(source.evs)}`)
      }
    } else if (field === 'ivs') {
      const localIvs = evObjectToVector(set.ivs)
      if (!arraysEqual(localIvs, source.ivs ?? [])) {
        failures.push(`${label}: IVs ${JSON.stringify(localIvs)} !== ${JSON.stringify(source.ivs)}`)
      }
    } else if (field === 'ivGroup' && Number(set.ivGroup ?? set.ivs?.hp) !== Number(source.ivGroup)) {
      failures.push(`${label}: IV group ${set.ivGroup ?? set.ivs?.hp} !== ${source.ivGroup}`)
    } else if (field === 'level' && Number(set.level ?? statOptions?.defaultLevel ?? 50) !== Number(source.level)) {
      failures.push(`${label}: level ${set.level ?? statOptions?.defaultLevel ?? 50} !== ${source.level}`)
    } else if (field === 'dynamax' && Boolean(set.dynamax) !== Boolean(source.dynamax)) {
      failures.push(`${label}: Dynamax flag ${Boolean(set.dynamax)} !== ${Boolean(source.dynamax)}`)
    } else if (field === 'gigantamax' && Boolean(set.gigantamax) !== Boolean(source.gigantamax)) {
      failures.push(`${label}: Gigantamax flag ${Boolean(set.gigantamax)} !== ${Boolean(source.gigantamax)}`)
    } else if (field === 'stats') {
      const level = Number(source.level ?? set.level ?? statOptions?.defaultLevel ?? 50)
      const defaultIvs = Number(statOptions?.defaultIvs ?? 31)
      const calculated = calculatedStats(localEntry, pokedex, level, defaultIvs)
      const localStats = statOptions?.applyItemModifiers
        ? applyVisibleItemStatModifiers(calculated, localEntry)
        : calculated
      if (!arraysEqual(localStats, source.stats ?? [])) {
        failures.push(`${label}: stats ${JSON.stringify(localStats)} !== ${JSON.stringify(source.stats)}`)
      }
    }
  }

  return failures
}

function addSourceLabelAliases(target, label, token) {
  const aliases = new Set([
    normalizeText(label),
    stripNumericSourceSuffix(label),
    ...expandCompressedLabel(label),
    ...expandCompressedLabel(stripNumericSourceSuffix(label)),
  ])
  for (const alias of aliases) target.set(alias, token)
}

function addRawSourceLabelAliases(target, source, token) {
  if (!source.rawLabel || source.rawLabel === source.label) return

  addSourceLabelAliases(target, source.rawLabel, token)
  const formless = normalizeSourceLabelText(source.rawLabel).replace(
    /\s+\((?:Alolan|Kantonian|Baile|Midday|Midnight|Pa'u|Pom-Pom|Sensu)\)$/,
    '',
  )
  if (formless !== source.rawLabel) addSourceLabelAliases(target, formless, token)
}

function compareSets({
  facilityId,
  checkId,
  sourceSets,
  localPath,
  modeKey,
  fields,
  statOptions,
  rawLabelAliases = false,
}) {
  const local = flattenSetdex(localPath, { modeKey })
  const sourceByLabel = new Map()
  const sourceLabelTokens = new Map()
  const sourceTokenMatches = []
  const failures = []

  for (const set of sourceSets) {
    if (sourceByLabel.has(set.label)) {
      failures.push(`Duplicate source label ${set.label}`)
    }
    sourceByLabel.set(set.label, set)
  }

  const localBySpecies = new Map()
  for (const localEntry of local.originals.values()) {
    const key = comparisonKey(localEntry.species)
    const entries = localBySpecies.get(key) ?? []
    entries.push(localEntry)
    localBySpecies.set(key, entries)
  }

  let matched = 0

  for (const [label, source] of sourceByLabel) {
    const exactEntry = local.labels.get(label) ?? local.labels.get(stripNumericSourceSuffix(label))
    const exactFailures = exactEntry
      ? setFieldFailures(label, source, exactEntry, fields, statOptions)
      : null

    let localEntry = exactFailures?.length === 0 ? exactEntry : null
    if (!localEntry) {
      const candidates = localBySpecies.get(comparisonKey(source.species)) ?? []
      const matching = candidates.filter(candidate =>
        setFieldFailures(label, source, candidate, fields, statOptions).length === 0,
      )
      if (matching.length > 0) {
        const tokens = new Set(matching.map(candidate => canonicalLocalSetToken(candidate, statOptions)))
        if (tokens.size > 1) {
          failures.push(`${label}: ambiguous content match across ${matching.map(candidate => candidate.label).join(', ')}`)
          sourceTokenMatches.push([source, `unmatched-source-set:${label}`])
          continue
        }
        localEntry = matching[0]
      }
    }

    if (!localEntry) {
      if (exactFailures) failures.push(...exactFailures)
      else failures.push(`Missing local set ${label}`)
      sourceTokenMatches.push([source, `unmatched-source-set:${label}`])
      continue
    }

    matched += 1
    sourceTokenMatches.push([source, canonicalLocalSetToken(localEntry, statOptions)])
  }

  for (const [source, token] of sourceTokenMatches) {
    addSourceLabelAliases(sourceLabelTokens, source.label, token)
  }
  if (rawLabelAliases) {
    for (const [source, token] of sourceTokenMatches) {
      addRawSourceLabelAliases(sourceLabelTokens, source, token)
    }
  }

  const result = {
    matched,
    sourceLabels: new Set(sourceByLabel.keys()),
    sourceLabelTokens,
    local,
  }

  if (failures.length > 0) {
    const shown = failures.slice(0, 25).join('\n  - ')
    const error = new Error(`${facilityId}:${checkId} failed ${failures.length} comparison(s):\n  - ${shown}`)
    error.result = result
    throw error
  }

  return result
}

function expandRosterCell(text, knownLabels, labelNormalizer = value => value) {
  const clean = normalizeText(text).replace(/\s*\((?:Dynamax|Gigantamax)\)\s*/g, '')
  if (!clean) return []

  const directCandidates = [
    clean,
    labelNormalizer(clean),
    ensureSetNumber(clean),
    labelNormalizer(ensureSetNumber(clean)),
  ]
  for (const candidate of directCandidates) {
    if (knownLabels?.has(candidate)) return [candidate]
  }

  const normalized = labelNormalizer(clean)
  const expanded = expandCompressedLabel(normalized)
  if (expanded.length > 1 && expanded.every(label => !knownLabels || knownLabels.has(label))) return expanded

  const mixedExpanded = expandMixedRosterLabel(clean).map(labelNormalizer)
  if (mixedExpanded.length > 1 && mixedExpanded.every(label => !knownLabels || knownLabels.has(label))) {
    return mixedExpanded
  }

  const expandedWithSetNumbers = expandCompressedLabel(labelNormalizer(ensureSetNumber(clean)))
  if (expandedWithSetNumbers.length > 1 && expandedWithSetNumbers.every(label => !knownLabels || knownLabels.has(label))) {
    return expandedWithSetNumbers
  }

  return []
}

function labelsFromRosterTable(table, knownLabels, labelNormalizer) {
  return [...table.querySelectorAll('td')]
    .flatMap(cell => expandRosterCell(cell.textContent, knownLabels, labelNormalizer))
}

function nextElementOfType(element, tagName) {
  let next = element?.nextElementSibling
  while (next && next.tagName !== tagName && !/^H[34]$/.test(next.tagName)) {
    next = next.nextElementSibling
  }
  return next?.tagName === tagName ? next : null
}

function trainerIdentityMap(localTrainerPaths) {
  const map = new Map()
  for (const trainerPath of localTrainerPaths) {
    const trainers = readJson(trainerPath)
    const list = Array.isArray(trainers) ? trainers : Object.values(trainers).flat()
    for (const trainer of list) {
      if (!trainer?.name || !trainer?.class) continue
      map.set(comparisonKey(`${trainer.class} ${trainer.name}`), trainer.name)
    }
  }
  return map
}

function parseRosterSections(html, knownLabels, identityMap, options = {}) {
  const document = documentFor(html)
  const rosters = {}

  for (const heading of document.querySelectorAll('h4')) {
    if (!/^Roster \d+/.test(normalizeText(heading.textContent))) continue

    const table = nextElementOfType(heading, 'TABLE')
    const list = nextElementOfType(table, 'UL')
    if (!table || !list) continue

    const labels = labelsFromRosterTable(table, knownLabels, options.labelNormalizer)
    for (const item of list.querySelectorAll(':scope > li')) {
      const rawIdentity = normalizeText(item.textContent)
      const identities = options.identityParser
        ? options.identityParser(rawIdentity)
        : [rawIdentity.replace(/\s+\(.+\)$/, '')]
      for (const identity of identities) {
        const aliased = options.identityAliases?.[identity] ?? identity
        const knownTrainerName = identityMap.get(comparisonKey(aliased))
        if (options.requireKnownIdentity && !knownTrainerName) continue
        const trainerName = knownTrainerName ?? aliased.split(' ').at(-1)
        rosters[trainerName] = labels
      }
    }
  }

  return rosters
}

function parseOrasTrainerIdentities(value) {
  const parts = normalizeText(value).split(/\s+\/\s+/)
  const first = parts[0].replace(/\s+\(XY\)$/, '')
  const { class: trainerClass } = splitTrainerIdentity(first)

  return parts.map((part, index) => {
    const clean = part.replace(/\s+\((?:XY|ORAS)\)$/, '')
    return index === 0 ? clean : `${trainerClass} ${clean}`
  })
}

function parseRsTowerRosters(html, level) {
  const document = documentFor(html)
  const root = document.querySelector(`#lv${level}`)
  assert(root, `Missing R/S Level ${level} trainer section`)

  const rosters = {}
  for (const heading of root.querySelectorAll('h4')) {
    if (!/^Roster \d+/.test(normalizeText(heading.textContent))) continue
    const table = nextElementOfType(heading, 'TABLE')
    const list = nextElementOfType(table, 'UL')
    if (table && list) {
      const labels = [...table.querySelectorAll('td')]
        .flatMap(cell => {
          const text = normalizeText(cell.textContent)
          const match = text.match(/^([A-Za-z.' -]+)-(\d+(?:,\s*\d+)*)$/)
          if (!match) return []
          return match[2].split(',').map(number => `${match[1]}-${number.trim()}`)
        })
      for (const item of list.querySelectorAll(':scope > li')) {
        const fullName = normalizeText(item.textContent)
        rosters[fullName.split(' ').at(-1)] = [...labels].sort()
      }
    }
  }

  return rosters
}

function parseSpecialTablesAsRosters(html, knownLabels, nameMapper = value => value, options = {}) {
  const document = documentFor(html)
  const rosters = {}
  for (const table of document.querySelectorAll('table')) {
    if (options.requirePokemonHeader !== false && !hasPokemonSetHeader(table)) continue
    const caption = normalizeText(table.querySelector('caption')?.textContent)
    const heading = nearestPreviousHeading(table)
    const key = nameMapper({ caption, heading, table })
    if (!key) continue
    const labels = labelsFromRosterTable(table, knownLabels, options.labelNormalizer)
    if (labels.length > 0) rosters[key] = labels
  }
  return rosters
}

function parsePthgssPalmerRosters(html, knownLabels) {
  const document = documentFor(html)
  const goldLabels = {
    Cresselia: 'Cresselia-4 (949)',
    Heatran: 'Heatran-4 (948)',
    Regigigas: 'Regigigas-4 (950)',
  }
  const rosters = {}

  for (const table of document.querySelectorAll('table')) {
    const caption = normalizeText(table.querySelector('caption')?.textContent)
    if (caption !== 'Palmer Battle (1st)' && caption !== 'Palmer Battle (2nd)') continue

    const rosterKey = caption === 'Palmer Battle (1st)' ? 'Palmer (Silver)' : 'Palmer (Gold)'
    const labels = []
    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children]
      if (!cells.some(cell => cell.getAttribute('rowspan') === '2')) continue
      const species = normalizeSpeciesName(normalizeText(cells[1]?.textContent))
      const label = caption === 'Palmer Battle (2nd)' ? goldLabels[species] : ensureSetNumber(species)
      if (label && knownLabels.has(label)) labels.push(label)
    }
    rosters[rosterKey] = labels
  }

  return rosters
}

function parseBdspTrainerRosters(html, knownLabels, options = {}) {
  const document = documentFor(html)
  const rosters = {}
  let activeSection = ''

  for (const node of document.querySelectorAll('h4, table')) {
    if (node.tagName === 'H4') {
      const id = node.id || ''
      if (/^(regular|master)-/.test(id)) activeSection = id
      continue
    }
    if (!activeSection || node.tagName !== 'TABLE') continue
    const caption = normalizeText(node.querySelector('caption')?.textContent)
    if (!caption) continue
    const trainer = splitTrainerIdentity(caption).name
    rosters[trainer] ??= {}
    rosters[trainer][activeSection] = labelsFromRosterTable(node, knownLabels, options.labelNormalizer)
  }

  return rosters
}

function parseMtRosters(parsedMt) {
  return parsedMt.trainerPokemon
}

function canonicalRosterEntries(labels, resolveToken, unresolvedPrefix) {
  const labelsByToken = new Map()
  for (const label of labels ?? []) {
    const clean = normalizeText(label)
    const expanded = expandCompressedLabel(clean)
    for (const item of expanded) {
      const token = resolveToken(item) ?? `${unresolvedPrefix}:${item}`
      const displayLabels = labelsByToken.get(token) ?? new Set()
      displayLabels.add(item)
      labelsByToken.set(token, displayLabels)
    }
  }
  return {
    labelsByToken,
    tokens: [...labelsByToken.keys()].sort(),
  }
}

function rosterDifference(localEntries, sourceEntries, allowLocalExtras) {
  const localTokens = new Set(localEntries.tokens)
  const sourceTokens = new Set(sourceEntries.tokens)
  const missingTokens = sourceEntries.tokens.filter(token => !localTokens.has(token))
  const extraTokens = allowLocalExtras
    ? []
    : localEntries.tokens.filter(token => !sourceTokens.has(token))

  const display = (entries, tokens) => tokens.flatMap(token => [...entries.labelsByToken.get(token)])
  return {
    extra: display(localEntries, extraTokens),
    missing: display(sourceEntries, missingTokens),
  }
}

function isNestedRoster(roster) {
  return roster && typeof roster === 'object' && !Array.isArray(roster)
}

function compareRosterMaps({
  facilityId,
  checkId,
  localPath,
  sourceRosters,
  localSetLabels,
  sourceLabelTokens,
  tokenOptions,
  nested = false,
  allowMissingSource = [],
  allowLocalExtras = false,
  onlyLocalKeys = null,
}) {
  const local = readJson(localPath)
  const failures = []
  let matched = 0
  let total = 0
  const allowedMissing = new Set(allowMissingSource)
  const allowedLocalKeys = onlyLocalKeys ? new Set(onlyLocalKeys) : null

  for (const [trainer, localRoster] of Object.entries(local)) {
    if (allowedLocalKeys && !allowedLocalKeys.has(trainer)) continue
    const localRosterIsNested = nested || isNestedRoster(localRoster)
    total += localRosterIsNested && isNestedRoster(localRoster)
      ? Object.keys(localRoster).length
      : 1
    const sourceRoster = sourceRosters[trainer]
    if (!sourceRoster) {
      if (!allowedMissing.has(trainer)) failures.push(`${trainer}: missing source roster`)
      continue
    }

    if (localRosterIsNested) {
      if (!isNestedRoster(localRoster) || !isNestedRoster(sourceRoster)) {
        failures.push(`${trainer}: roster shape mismatch`)
        continue
      }
      for (const [rosterKey, labels] of Object.entries(localRoster)) {
        const sourceLabels = sourceRoster[rosterKey]
        if (!sourceLabels) {
          failures.push(`${trainer}/${rosterKey}: missing source roster`)
          continue
        }
        const localCanonical = canonicalRosterEntries(
          labels,
          label => {
            const entry = localSetLabels.get(label)
            return entry ? canonicalLocalSetToken(entry, tokenOptions) : null
          },
          'unresolved-local',
        )
        const sourceCanonical = canonicalRosterEntries(
          sourceLabels,
          label => sourceLabelTokens.get(label),
          'unresolved-source',
        )
        const difference = rosterDifference(localCanonical, sourceCanonical, allowLocalExtras)
        if (difference.missing.length > 0 || difference.extra.length > 0) {
          failures.push(
            `${trainer}/${rosterKey}: missing locally ${JSON.stringify(difference.missing)}; local-only ${JSON.stringify(difference.extra)}`,
          )
        } else {
          matched += 1
        }
      }
    } else {
      const localCanonical = canonicalRosterEntries(
        localRoster,
        label => {
          const entry = localSetLabels.get(label)
          return entry ? canonicalLocalSetToken(entry, tokenOptions) : null
        },
        'unresolved-local',
      )
      const sourceCanonical = canonicalRosterEntries(
        sourceRoster,
        label => sourceLabelTokens.get(label),
        'unresolved-source',
      )
      const difference = rosterDifference(localCanonical, sourceCanonical, allowLocalExtras)
      if (difference.missing.length > 0 || difference.extra.length > 0) {
        failures.push(
          `${trainer}: missing locally ${JSON.stringify(difference.missing)}; local-only ${JSON.stringify(difference.extra)}`,
        )
      } else {
        matched += 1
      }
    }
  }

  if (failures.length > 0) {
    const shown = failures.slice(0, 20).join('\n  - ')
    const error = new Error(`${facilityId}:${checkId} roster check failed ${failures.length} comparison(s):\n  - ${shown}`)
    error.result = { matched, total }
    throw error
  }

  return { matched, total }
}

const FACILITIES = [
  {
    id: 'rs',
    label: 'Ruby/Sapphire Battle Tower',
    setdexFiles: ['rs/setdex_lvl50_rs.json', 'rs/setdex_lvl100_rs.json'],
    setChecks: [
      {
        id: 'lvl50-sets',
        localPath: 'rs/setdex_lvl50_rs.json',
        source: 'rs-tower-pokemon',
        parse: html => parseRsTowerPokemon(html, 50),
        fields: ['species', 'item', 'moves', 'evs'],
      },
      {
        id: 'lvl100-sets',
        localPath: 'rs/setdex_lvl100_rs.json',
        source: 'rs-tower-pokemon',
        parse: html => parseRsTowerPokemon(html, 100),
        fields: ['species', 'item', 'moves', 'evs'],
      },
    ],
    rosterChecks: [
      {
        id: 'lvl50-rosters',
        localPath: 'rs/trainer_pokemon_lvl50_rs.json',
        source: 'rs-tower-trainers',
        setdexPath: 'rs/setdex_lvl50_rs.json',
        parse: html => parseRsTowerRosters(html, 50),
      },
      {
        id: 'lvl100-rosters',
        localPath: 'rs/trainer_pokemon_lvl100_rs.json',
        source: 'rs-tower-trainers',
        setdexPath: 'rs/setdex_lvl100_rs.json',
        parse: html => parseRsTowerRosters(html, 100),
      },
    ],
  },
  {
    id: 'emerald',
    label: 'Emerald Battle Frontier',
    setdexFiles: ['emerald/setdex_em.json'],
    setChecks: [
      {
        id: 'frontier-sets',
        localPath: 'emerald/setdex_em.json',
        source: 'rse-frontier-pokemon',
        parse: parseEmeraldFrontierPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs'],
      },
    ],
    rosterChecks: [
      {
        id: 'frontier-rosters',
        localPath: 'emerald/trainer_pokemon_em.json',
        setdexPath: 'emerald/setdex_em.json',
        source: 'rse-frontier-trainers',
        trainerPaths: ['emerald/battle_trainers_em.json'],
        parse: (html, knownLabels, identityMap) => parseRosterSections(html, knownLabels, identityMap),
        allowMissingSource: ['Anabel (Silver)', 'Anabel (Gold)'],
      },
    ],
  },
  {
    id: 'dp',
    label: 'Diamond/Pearl Battle Tower',
    setdexFiles: ['dp/setdex_dp.json'],
    setChecks: [
      {
        id: 'ordinary-sets',
        localPath: 'dp/setdex_dp.json',
        source: 'dp-tower-pokemon',
        parse: parseDpTowerPokemon,
        fields: ['species', 'item', 'moves', 'evs'],
      },
      {
        id: 'palmer-sets',
        localPath: 'dp/setdex_dp.json',
        source: 'dp-tower-main',
        parse: parseDpPalmerPokemon,
        fields: ['species', 'item', 'moves', 'evs'],
      },
    ],
    rosterChecks: [
      {
        id: 'tower-rosters',
        localPath: 'dp/trainer_pokemon_dp.json',
        setdexPath: 'dp/setdex_dp.json',
        source: 'dp-tower-trainers',
        trainerPaths: ['dp/battle_trainers_dp.json'],
        parse: (html, knownLabels, identityMap) => parseRosterSections(html, knownLabels, identityMap, {
          identityAliases: {
            'Psychic Jaspter': 'Psychic Jasper',
            'Parasol Lady Angie': 'Aroma Lady Haylee',
            'Beauty Nadia': 'Aroma Lady Nadia',
          },
        }),
        extraSources: [
          {
            source: 'dp-tower-main',
            parse: html => {
              const rosters = { 'Palmer (Silver)': [], 'Palmer (Gold)': [] }
              for (const set of parseDpPalmerPokemon(html)) {
                if (set.label.includes('Palmer Silver')) rosters['Palmer (Silver)'].push(set.label)
                if (set.label.includes('Palmer Gold')) rosters['Palmer (Gold)'].push(set.label)
              }
              return rosters
            },
          },
        ],
      },
    ],
  },
  {
    id: 'pthgss',
    label: 'Platinum/HGSS Battle Frontier',
    setdexFiles: ['pthgss/setdex_pthgss.json'],
    setChecks: [
      {
        id: 'frontier-sets',
        localPath: 'pthgss/setdex_pthgss.json',
        source: 'dppt-frontier-pokemon',
        parse: parsePthgssFrontierPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs'],
      },
      {
        id: 'hall-sets',
        localPath: 'pthgss/setdex_pthgss.json',
        source: 'pthgss-hall-pokemon',
        parse: parsePthgssHallPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs'],
      },
    ],
    rosterChecks: [
      {
        id: 'frontier-rosters',
        localPath: 'pthgss/trainer_pokemon_pthgss.json',
        setdexPath: 'pthgss/setdex_pthgss.json',
        source: 'dppt-frontier-trainers',
        trainerPaths: ['pthgss/battle_trainers_pthgss.json'],
        parse: (html, knownLabels, identityMap) => parseRosterSections(html, knownLabels, identityMap),
        extraSources: [
          {
            source: 'pthgss-tower-main',
            parse: parsePthgssPalmerRosters,
          },
        ],
      },
    ],
  },
  {
    id: 'oras',
    label: 'XY/ORAS Battle Maison',
    setdexFiles: ['oras/setdex_oras.json'],
    setChecks: [
      {
        id: 'maison-sets',
        localPath: 'oras/setdex_oras.json',
        source: 'xy-maison-pokemon',
        parse: parseModernNoAbilityPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs'],
      },
    ],
    rosterChecks: [
      {
        id: 'normal-rosters',
        localPath: 'oras/trainer_pokemon_normal_oras.json',
        setdexPath: 'oras/setdex_oras.json',
        source: 'xy-maison-trainers',
        trainerPaths: ['oras/battle_trainers_normal_oras.json', 'oras/battle_trainers_super_oras.json'],
        parse: (html, knownLabels, identityMap) => parseRosterSections(html, knownLabels, identityMap, {
          identityParser: parseOrasTrainerIdentities,
          requireKnownIdentity: true,
        }),
        allowMissingSource: ['Nita (Normal)', 'Evelyn (Normal)'],
      },
      {
        id: 'super-rosters',
        localPath: 'oras/trainer_pokemon_super_oras.json',
        setdexPath: 'oras/setdex_oras.json',
        source: 'xy-maison-trainers',
        trainerPaths: ['oras/battle_trainers_normal_oras.json', 'oras/battle_trainers_super_oras.json'],
        parse: (html, knownLabels, identityMap) => parseRosterSections(html, knownLabels, identityMap, {
          identityParser: parseOrasTrainerIdentities,
          requireKnownIdentity: true,
        }),
        allowMissingSource: ['Nita (Super)', 'Evelyn (Super)'],
      },
    ],
  },
  {
    id: 'sunmoon',
    label: 'Sun/Moon Battle Tree',
    setdexFiles: ['sunmoon/setdex_sm.json'],
    setChecks: [
      {
        id: 'tree-sets',
        localPath: 'sunmoon/setdex_sm.json',
        source: 'sm-tree-pokemon',
        parse: parseSunMoonPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs'],
        rawLabelAliases: true,
      },
    ],
    rosterChecks: [
      {
        id: 'tree-rosters',
        localPath: 'sunmoon/trainer_pokemon_sm.json',
        setdexPath: 'sunmoon/setdex_sm.json',
        source: 'sm-tree-trainers',
        trainerPaths: ['sunmoon/battle_trainers_sm.json'],
        parse: (html, knownLabels, identityMap) => ({
          ...parseRosterSections(html, knownLabels, identityMap, {
            labelNormalizer: normalizeSunMoonLabel,
            identityAliases: { 'Golfer Zen': 'Golfer Zeno' },
          }),
          ...parseSpecialTablesAsRosters(html, knownLabels, ({ heading }) => {
            if (heading === 'Red (Normal Course)') return 'Red (Regular)'
            if (heading === 'Blue (Normal Course)') return 'Blue (Regular)'
            if (heading === 'Red (Super Course)') return 'Red (Super)'
            if (heading === 'Blue (Super Course)') return 'Blue (Super)'
            const special = heading.replace(/^(?:Pokémon Trainer|Captain) /, '')
            return [
              'Grimsley', 'Anabel', 'Wally', 'Colress', 'Cynthia', 'Plumeria',
              'Guzma', 'Kiawe', 'Mallow', 'Sina', 'Dexio', 'Kukui',
            ].includes(special) ? special : ''
          }, { labelNormalizer: normalizeSunMoonLabel, requirePokemonHeader: false }),
        }),
        allowLocalExtras: true,
      },
    ],
  },
  {
    id: 'swsh',
    label: 'Sword/Shield Battle Tower',
    setdexFiles: ['swsh/setdex_swsh.json'],
    setChecks: [
      {
        id: 'tower-sets',
        localPath: 'swsh/setdex_swsh.json',
        source: 'swsh-tower-pokemon',
        parse: parseSwShPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'evs', 'ivGroup', 'dynamax', 'gigantamax'],
      },
    ],
    rosterChecks: [
      {
        id: 'tower-rosters',
        localPath: 'swsh/trainer_pokemon_swsh.json',
        setdexPath: 'swsh/setdex_swsh.json',
        source: 'swsh-tower-trainers',
        trainerPaths: ['swsh/battle_trainers_swsh.json'],
        parse: (html, knownLabels, identityMap) => {
          const rosters = parseRosterSections(html, knownLabels, identityMap)
          const leon = parseSpecialTablesAsRosters(html, knownLabels, ({ heading }) => {
            const titleToKey = {
              'Beginner Tier (Rank 3)': 'rank-3',
              'Poké Ball Tier (Rank 6)': 'rank-6',
              'Great Ball Tier (Rank 9)': 'rank-9',
              'Ultra Ball Tier (Rank 10)': 'rank-10',
              'Master Ball Tier (Max Rank)': 'max',
            }
            return titleToKey[heading] ? `Leon:${titleToKey[heading]}` : ''
          }, { requirePokemonHeader: false })
          rosters.Leon = Object.fromEntries(
            Object.entries(leon).map(([key, value]) => [key.split(':')[1], value]),
          )
          return rosters
        },
      },
    ],
  },
  {
    id: 'bdsp',
    label: 'BDSP Battle Tower',
    setdexFiles: ['bdsp/setdex_bdsp.json'],
    setChecks: [
      {
        id: 'ordinary-sets',
        localPath: 'bdsp/setdex_bdsp.json',
        source: 'bdsp-tower-pokemon',
        parse: parseBdspPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'ability', 'stats'],
        statOptions: { pokedexPath: 'bdsp/pokedex_bdsp.json', defaultLevel: 50, defaultIvs: 31, applyItemModifiers: true },
      },
      {
        id: 'palmer-classic-sets',
        localPath: 'bdsp/setdex_bdsp.json',
        source: 'bdsp-tower-main',
        parse: parseBdspPalmerClassicPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'ability', 'stats'],
        statOptions: { pokedexPath: 'bdsp/pokedex_bdsp.json', defaultLevel: 50, defaultIvs: 31, applyItemModifiers: true },
      },
      {
        id: 'boss-sets',
        localPath: 'bdsp/setdex_bdsp.json',
        source: 'bdsp-tower-bosses',
        parse: parseBdspBossPokemon,
        fields: ['species', 'item', 'moves', 'nature', 'ability', 'stats'],
        statOptions: { pokedexPath: 'bdsp/pokedex_bdsp.json', defaultLevel: 50, defaultIvs: 31, applyItemModifiers: true },
      },
    ],
    rosterChecks: [
      {
        id: 'tower-rosters',
        localPath: 'bdsp/trainer_pokemon_bdsp.json',
        setdexPath: 'bdsp/setdex_bdsp.json',
        source: 'bdsp-tower-trainers',
        nested: true,
        parse: (html, knownLabels) => parseBdspTrainerRosters(html, knownLabels, { labelNormalizer: normalizeBdspLabel }),
        extraSources: [
          {
            source: 'bdsp-tower-main',
            parse: (html, knownLabels) => parseSpecialTablesAsRosters(html, knownLabels, ({ caption }) => {
              if (caption === 'Palmer Battle (1st)') return 'Palmer'
              if (caption === 'Palmer Battle (2nd)') return 'Palmer'
              return ''
            }, { labelNormalizer: normalizeBdspLabel }),
          },
          {
            source: 'bdsp-tower-bosses',
            parse: (html, knownLabels) => parseSpecialTablesAsRosters(html, knownLabels, ({ heading, caption }) => {
              const match = heading.match(/\((.+)\)/)
              if (!match) return ''
              const suffix = BDSP_BOSS_SUFFIX[match[1]]
              return suffix ? `${suffix}:${caption}` : ''
            }),
          },
        ],
      },
    ],
  },
  {
    id: 'mt-battle',
    label: 'Colosseum/XD Mt. Battle',
    setdexFiles: ['mt-battle/setdex_mt_battle.json'],
    mtModes: [
      ['colosseum-story', 'orre-colosseum-story-mt-battle'],
      ['colosseum-battle-singles', 'orre-colosseum-mt-battle-singles'],
      ['colosseum-battle-doubles', 'orre-colosseum-mt-battle-doubles'],
      ['xd', 'orre-xd-mt-battle'],
    ],
  },
]

function mergeRosters(target, source, nested = false) {
  for (const [key, value] of Object.entries(source)) {
    if (nested && key.includes(':')) {
      const [trainer, rosterKey] = key.split(':')
      target[trainer] ??= {}
      target[trainer][rosterKey] = value
    } else if (nested && value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = { ...(target[key] ?? {}), ...value }
    } else {
      target[key] = value
    }
  }
}

async function runRosterCheck(facility, check, options, sourceLabelTokens) {
  const localSetdex = flattenSetdex(check.setdexPath)
  const knownLabels = new Set(sourceLabelTokens.keys())
  const identityMap = check.trainerPaths ? trainerIdentityMap(check.trainerPaths) : new Map()
  const html = await loadSource(check.source, options)
  const sourceRosters = check.parse(html, knownLabels, identityMap)

  for (const extra of check.extraSources ?? []) {
    const extraHtml = await loadSource(extra.source, options)
    mergeRosters(sourceRosters, extra.parse(extraHtml, knownLabels, identityMap), check.nested)
  }

  return compareRosterMaps({
    facilityId: facility.id,
    checkId: check.id,
    localPath: check.localPath,
    sourceRosters,
    localSetLabels: localSetdex.labels,
    sourceLabelTokens,
    tokenOptions: check.tokenOptions,
    nested: check.nested,
    allowMissingSource: check.allowMissingSource,
    allowLocalExtras: check.allowLocalExtras,
  })
}

async function runStandardFacility(facility, options) {
  const summaries = []
  const coveredByLocalPath = new Map()
  const sourceTokensByLocalPath = new Map()
  const failures = []

  for (const check of facility.setChecks ?? []) {
    let result
    let passed = false
    try {
      const html = await loadSource(check.source, options)
      const sourceSets = check.parse(html)
      result = compareSets({
        facilityId: facility.id,
        checkId: check.id,
        sourceSets,
        localPath: check.localPath,
        modeKey: check.modeKey,
        fields: check.fields,
        statOptions: check.statOptions,
        rawLabelAliases: check.rawLabelAliases,
      })
      const coverageKey = `${check.localPath}${check.modeKey ? `:${check.modeKey}` : ''}`
      const covered = coveredByLocalPath.get(coverageKey) ?? new Set()
      for (const label of result.sourceLabels) covered.add(label)
      coveredByLocalPath.set(coverageKey, covered)
      passed = true
    } catch (error) {
      failures.push(error)
      result = error.result
    }

    if (result) {
      const sourceLabelTokens = sourceTokensByLocalPath.get(check.localPath) ?? new Map()
      for (const [label, token] of result.sourceLabelTokens) {
        sourceLabelTokens.set(label, token)
      }
      sourceTokensByLocalPath.set(check.localPath, sourceLabelTokens)
      summaries.push(
        passed
          ? `${check.id}: ${result.matched} sets`
          : `${check.id}: ${result.matched}/${result.sourceLabels.size} sets matched`,
      )
    }
  }

  for (const check of facility.rosterChecks ?? []) {
    try {
      const sourceLabelTokens = sourceTokensByLocalPath.get(check.setdexPath) ?? new Map()
      const result = await runRosterCheck(facility, check, options, sourceLabelTokens)
      summaries.push(`${check.id}: ${result.matched} rosters`)
    } catch (error) {
      failures.push(error)
      if (error.result) {
        summaries.push(`${check.id}: ${error.result.matched}/${error.result.total} rosters matched`)
      }
    }
  }

  return { summaries, failures }
}

async function runMtBattleFacility(facility, options) {
  const summaries = []
  const failures = []
  for (const [modeId, sourceId] of facility.mtModes) {
    try {
      const html = await loadSource(sourceId, options)
      const parsed = parseMtBattlePokemon(html, modeId)
      const fields = modeId === 'colosseum-story' || modeId === 'xd'
        ? ['species', 'ability', 'nature', 'level', 'moves', 'stats']
        : ['species', 'ability', 'nature', 'item', 'moves', 'ivs', 'evs']

      const result = compareSets({
        facilityId: facility.id,
        checkId: `${modeId}-sets`,
        sourceSets: parsed.sets,
        localPath: 'mt-battle/setdex_mt_battle.json',
        modeKey: modeId,
        fields,
        statOptions: { pokedexPath: 'emerald/pokedex_em.json', defaultLevel: 50, defaultIvs: 0 },
      })
      summaries.push(`${modeId}: ${result.matched} sets`)

      const localSetdex = flattenSetdex('mt-battle/setdex_mt_battle.json', { modeKey: modeId })
      const rosterResult = compareRosterMaps({
        facilityId: facility.id,
        checkId: `${modeId}-rosters`,
        localPath: 'mt-battle/trainer_pokemon_mt_battle.json',
        sourceRosters: { [modeId]: parseMtRosters(parsed) },
        localSetLabels: localSetdex.labels,
        sourceLabelTokens: result.sourceLabelTokens,
        tokenOptions: { defaultIvs: 0, defaultLevel: 50 },
        nested: true,
        onlyLocalKeys: [modeId],
      })
      summaries.push(`${modeId}: ${rosterResult.matched} rosters`)
    } catch (error) {
      failures.push(error)
    }
  }
  return { summaries, failures }
}

function parseArgs(argv) {
  const options = {
    cacheDir: DEFAULT_CACHE_DIR,
    offline: false,
    refresh: false,
    list: false,
    facilities: [],
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--offline') options.offline = true
    else if (arg === '--refresh') options.refresh = true
    else if (arg === '--list') options.list = true
    else if (arg === '--cache-dir') options.cacheDir = path.resolve(argv[++index])
    else if (arg.startsWith('--cache-dir=')) options.cacheDir = path.resolve(arg.slice('--cache-dir='.length))
    else if (arg === '--facility') options.facilities.push(...argv[++index].split(',').filter(Boolean))
    else if (arg.startsWith('--facility=')) options.facilities.push(...arg.slice('--facility='.length).split(',').filter(Boolean))
    else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}`)
    else options.facilities.push(arg)
  }

  return options
}

async function verifyIndex(options, selectedFacilities) {
  const html = await loadSource('index', options)
  const document = documentFor(html)
  const links = new Set([...document.querySelectorAll('a[href]')].map(link =>
    new URL(link.getAttribute('href'), SOURCES.index.url).href,
  ))

  const missing = []
  for (const facility of selectedFacilities) {
    const sourceIds = new Set([
      ...(facility.setChecks ?? []).map(check => check.source),
      ...(facility.rosterChecks ?? []).map(check => check.source),
      ...(facility.mtModes ?? []).map(([, source]) => source),
    ])
    for (const sourceId of sourceIds) {
      const url = SOURCES[sourceId]?.url
      if (url && !links.has(url) && !sourceId.includes('main') && !sourceId.includes('bosses') && !sourceId.includes('hall')) {
        missing.push(`${facility.id}: ${url}`)
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Configured source URLs are not linked from the Altissimo index:\n  - ${missing.join('\n  - ')}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.list) {
    for (const facility of FACILITIES) console.log(`${facility.id}\t${facility.label}`)
    return
  }

  const requested = options.facilities.length > 0 && !options.facilities.includes('all')
    ? new Set(options.facilities)
    : null
  const selected = requested ? FACILITIES.filter(facility => requested.has(facility.id)) : FACILITIES
  if (requested && selected.length !== requested.size) {
    const known = new Set(FACILITIES.map(facility => facility.id))
    const unknown = [...requested].filter(id => !known.has(id))
    throw new Error(`Unknown facility id(s): ${unknown.join(', ')}`)
  }

  const failures = []
  try {
    await verifyIndex(options, selected)
  } catch (error) {
    failures.push(error)
    console.error(`\n${error.message}`)
  }

  for (const facility of selected) {
    const result = facility.mtModes
      ? await runMtBattleFacility(facility, options)
      : await runStandardFacility(facility, options)
    failures.push(...result.failures)

    const summaryText = result.summaries.length > 0 ? result.summaries.join('; ') : 'no passing checks'
    const mark = result.failures.length > 0 ? '✗' : '✓'
    console.log(`${mark} ${facility.id}: ${summaryText}`)
    for (const error of result.failures) {
      console.error(`\n${error.message}`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} verification failure(s).`)
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error.stack || error.message)
  process.exitCode = 1
})
