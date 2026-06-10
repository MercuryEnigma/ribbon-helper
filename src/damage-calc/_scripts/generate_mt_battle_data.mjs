/**
 * Generate Pokemon Colosseum/XD Mt. Battle data from Altissimo and verify the
 * overlapping trainer, roster, level, ability, item, and move data against
 * Bulbapedia's ten Mt. Battle area pages.
 *
 * Usage: node src/damage-calc/_scripts/generate_mt_battle_data.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../../data/battle-facilities/mt-battle')
const POKEDEX_PATH = path.join(__dirname, '../../data/battle-facilities/emerald/pokedex_em.json')
const BASE_MOVES_PATH = path.join(__dirname, '../../data/battle-facilities/rs/moves_rs.json')

const ALTISSIMO_SOURCES = {
  'colosseum-story': 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Story-Mode/mt-battle.html',
  'colosseum-battle-singles': 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-singles.html',
  'colosseum-battle-doubles': 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-doubles.html',
  xd: 'https://altissimo1.github.io/Supplementary-Series/Orre/XD/mt-battle.html',
}

const BULBAPEDIA_AREA_SOURCES = Array.from(
  { length: 10 },
  (_, index) => `https://bulbapedia.bulbagarden.net/w/index.php?title=Mt._Battle_Area_${index + 1}&action=raw`,
)

const MODE_DEFS = {
  'colosseum-story': { fixedLevels: true, expectedSets: 336 },
  'colosseum-battle-singles': { fixedLevels: false, expectedSets: 600 },
  'colosseum-battle-doubles': { fixedLevels: false, expectedSets: 600 },
  xd: { fixedLevels: true, expectedSets: 321 },
}

const SOURCE_DISCREPANCIES = {
  'colosseum-story:30:Surskit': {
    altissimoOnlyMoves: ['Sweet Scent'],
  },
  'colosseum-story:64:Ninjask': {
    altissimoLevel: 46,
    bulbapediaLevel: '48',
  },
  'colosseum-story:80:Hariyama': {
    altissimoAbility: 'Guts',
    bulbapediaAbility: 'Thick Fat',
  },
  'colosseum-story:82:Camerupt': {
    altissimoLevel: 56,
    bulbapediaLevel: '55',
  },
  'colosseum-battle-singles:50:Murkrow': {
    altissimoOnlyMoves: ['Mirror Move'],
    bulbapediaOnlyMoves: ['Mirror Coat'],
  },
  'xd:9:Baltoy': {
    altissimoLevel: 11,
    bulbapediaLevel: '12',
  },
  'xd:34:Corsola': {
    altissimoLevel: 30,
    bulbapediaLevel: '29',
  },
  'xd:53:Vibrava': {
    altissimoLevel: 44,
    bulbapediaLevel: '43',
  },
  'xd:80:Machamp': {
    altissimoOnlyMoves: ['Rock Tomb'],
    bulbapediaOnlyMoves: ['Rock Slide'],
  },
}

const TRAINER_IDENTITY_DISCREPANCIES = {
  'xd:70': {
    altissimoClass: 'Area Leader',
    altissimoName: 'Nocon',
    bulbapediaClass: 'Area Leader',
    bulbapediaName: 'Nocom',
  },
}

const STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp']

const NATURE_MODS = {
  Hardy: [], Lonely: ['at', 'df'], Brave: ['at', 'sp'], Adamant: ['at', 'sa'], Naughty: ['at', 'sd'],
  Bold: ['df', 'at'], Docile: [], Relaxed: ['df', 'sp'], Impish: ['df', 'sa'], Lax: ['df', 'sd'],
  Timid: ['sp', 'at'], Hasty: ['sp', 'df'], Serious: [], Jolly: ['sp', 'sa'], Naive: ['sp', 'sd'],
  Modest: ['sa', 'at'], Mild: ['sa', 'df'], Quiet: ['sa', 'sp'], Bashful: [], Rash: ['sa', 'sd'],
  Calm: ['sd', 'at'], Gentle: ['sd', 'df'], Sassy: ['sd', 'sp'], Careful: ['sd', 'sa'], Quirky: [],
}

const MOVE_NAME_MAP = {
  Ancientpower: 'Ancient Power',
  Bubblebeam: 'Bubble Beam',
  Doubleslap: 'Double Slap',
  Dragonbreath: 'Dragon Breath',
  Dynamicpunch: 'Dynamic Punch',
  Featherdance: 'Feather Dance',
  'Faint Attack': 'Feint Attack',
  Grasswhistle: 'Grass Whistle',
  'Hi Jump Kick': 'High Jump Kick',
  Poisonpowder: 'Poison Powder',
  'Sand-Attack': 'Sand Attack',
  Selfdestruct: 'Self-Destruct',
  Smellingsalt: 'Smelling Salts',
  Solarbeam: 'Solar Beam',
  Sonicboom: 'Sonic Boom',
  Thunderpunch: 'Thunder Punch',
  Thundershock: 'Thunder Shock',
  ViceGrip: 'Vise Grip',
  Vicegrip: 'Vise Grip',
}

const ITEM_NAME_MAP = {
  BlackGlasses: 'Black Glasses',
  BrightPowder: 'Bright Powder',
  NeverMeltIce: 'Never-Melt Ice',
  SilverPowder: 'Silver Powder',
  TwistedSpoon: 'Twisted Spoon',
}

const ABILITY_NAME_MAP = {
  Compoundeyes: 'Compound Eyes',
  Lightningrod: 'Lightning Rod',
}

const EXTRA_MOVES = {
  'Beat Up': { bp: 10, type: 'Dark', category: 'Special', acc: 100 },
  Bide: { bp: 0, type: 'Normal' },
  Camouflage: { bp: 0, type: 'Normal' },
  'Comet Punch': { bp: 18, type: 'Normal', category: 'Physical', makesContact: true, hits: 2, acc: 85 },
  'False Swipe': { bp: 40, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Frustration (2 BP)': { bp: 2, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Frustration (44 BP)': { bp: 44, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Hidden Power': { bp: 70, type: 'Normal', category: 'Special', acc: 100 },
  Kinesis: { bp: 0, type: 'Psychic' },
  'Nature Power': { bp: 0, type: 'Normal' },
  'Powder Snow': { bp: 40, type: 'Ice', category: 'Special', hasSecondaryEffect: true, acc: 100 },
  Present: { bp: 40, type: 'Normal', category: 'Physical', acc: 90 },
  'Return (45 BP)': { bp: 45, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Return (64 BP)': { bp: 64, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Return (72 BP)': { bp: 72, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  'Return (80 BP)': { bp: 80, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Sketch: { bp: 0, type: 'Normal' },
  'Spider Web': { bp: 0, type: 'Bug' },
  'Spike Cannon': { bp: 20, type: 'Normal', category: 'Physical', hits: 2, acc: 100 },
  Splash: { bp: 0, type: 'Normal' },
  Teleport: { bp: 0, type: 'Psychic' },
  'Vine Whip': { bp: 35, type: 'Grass', category: 'Special', acc: 100 },
  Withdraw: { bp: 0, type: 'Water' },
}

for (const type of [
  'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel',
  'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark',
]) {
  for (const power of [30, 70]) {
    EXTRA_MOVES[`Hidden Power ${type} (${power} BP)`] = {
      bp: power,
      type,
      category: 'Special',
      acc: 100,
    }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'RibbonHelper/1.0 (battle facility data generator)' },
  })
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  return response.text()
}

function normalizeWhitespace(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeMoveName(value) {
  const name = normalizeWhitespace(value)
  const variablePower = name.match(/^(Hidden Power|Return|Frustration)\s*\((\d+) power\)$/)
  if (variablePower) {
    const [, baseName, power] = variablePower
    if (baseName === 'Hidden Power') return 'Hidden Power'
    if (power === '102') return baseName
    return `${baseName} (${power} BP)`
  }
  return MOVE_NAME_MAP[name] ?? name
}

function normalizeMoveCell(cell) {
  const name = normalizeWhitespace(cell.textContent)
  const hiddenPower = name.match(/^Hidden Power\s*\((\d+) power\)$/)
  if (!hiddenPower) return normalizeMoveName(name)

  const ignoredClasses = new Set(['type-false', 'type-true', 'status-move'])
  const type = [...cell.classList]
    .find(className => !ignoredClasses.has(className))
  assert(type, `Unable to determine Hidden Power type from ${cell.outerHTML}`)
  return `Hidden Power ${type[0].toUpperCase()}${type.slice(1)} (${hiddenPower[1]} BP)`
}

function normalizeItemName(value) {
  const item = normalizeWhitespace(value)
  if (!item || item === 'N/A' || item === 'None') return ''
  return ITEM_NAME_MAP[item] ?? item
}

function normalizeAbilityName(value) {
  const ability = normalizeWhitespace(value)
  return ABILITY_NAME_MAP[ability] ?? ability
}

function normalizeSpeciesName(value) {
  return normalizeWhitespace(value)
    .replace(/\s+[♀♂]$/, '')
    .replace(/^Nidoran♀$/, 'Nidoran-F')
    .replace(/^Nidoran♂$/, 'Nidoran-M')
}

function comparisonText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function comparisonMove(value) {
  return comparisonText(
    normalizeMoveName(value)
      .replace(/^Hidden Power [A-Za-z]+ \(\d+ BP\)$/, 'Hidden Power')
      .replace(/ \(\d+ BP\)$/, ''),
  )
}

function parseTrainerCaption(caption) {
  const identity = normalizeWhitespace(caption)
  const lastSpace = identity.lastIndexOf(' ')
  assert(lastSpace > 0, `Unable to split trainer identity: ${identity}`)
  return { class: identity.slice(0, lastSpace), name: identity.slice(lastSpace + 1) }
}

function calcStat(base, iv, ev, level, nature, stat) {
  const [increased, decreased] = NATURE_MODS[nature] ?? []
  const multiplier = increased === stat ? 1.1 : decreased === stat ? 0.9 : 1
  return Math.floor((Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5) * multiplier)
}

function expectedStats(species, set, pokedex) {
  const base = pokedex[species].bs
  const level = set.level
  const ivs = set.ivs
  const evs = set.evs
  return [
    base.hp === 1 ? 1 : Math.floor((base.hp * 2 + ivs.hp + Math.floor(evs.hp / 4)) * level / 100) + level + 10,
    calcStat(base.at, ivs.at, evs.at, level, set.nature, 'at'),
    calcStat(base.df, ivs.df, evs.df, level, set.nature, 'df'),
    calcStat(base.sa, ivs.sa, evs.sa, level, set.nature, 'sa'),
    calcStat(base.sd, ivs.sd, evs.sd, level, set.nature, 'sd'),
    calcStat(base.sp, ivs.sp, evs.sp, level, set.nature, 'sp'),
  ]
}

function deriveFixedSpread(species, nature, level, listedStats, pokedex) {
  const base = pokedex[species].bs
  const evs = {}
  const ivs = {}

  STAT_KEYS.forEach((stat, index) => {
    const target = listedStats[index]
    if (species === 'Shedinja' && stat === 'hp') {
      ivs.hp = 0
      evs.hp = 0
      return
    }
    let match = null

    for (let iv = 0; iv <= 31 && !match; iv += 1) {
      for (let evQuarter = 0; evQuarter <= 63; evQuarter += 1) {
        const ev = evQuarter * 4
        const calculated = stat === 'hp'
          ? (base.hp === 1 ? 1 : Math.floor((base.hp * 2 + iv + evQuarter) * level / 100) + level + 10)
          : calcStat(base[stat], iv, ev, level, nature, stat)
        if (calculated === target) {
          match = { iv, ev }
          break
        }
      }
    }

    assert(match, `Unable to reproduce ${species} ${stat} stat ${target} at level ${level}`)
    ivs[stat] = match.iv
    evs[stat] = match.ev
  })

  return { ivs, evs }
}

function parseAltissimoMode(modeId, html, pokedex) {
  const definition = MODE_DEFS[modeId]
  const document = new JSDOM(html).window.document
  const tables = [...document.querySelectorAll('table')]
  assert(tables.length === 100, `${modeId}: expected 100 trainer tables, found ${tables.length}`)

  const trainers = []
  const trainerPokemon = {}
  const setdex = {}
  let setCount = 0

  tables.forEach((table, tableIndex) => {
    const battle = tableIndex + 1
    const caption = table.caption?.textContent ?? ''
    const trainer = {
      number: battle,
      ...parseTrainerCaption(caption),
      ivs: 0,
      battleRanges: [String(battle)],
    }
    const pokemonRows = [...table.querySelectorAll('tbody tr')]
      .filter(row => row.cells[1]?.rowSpan === 2)
    assert(pokemonRows.length > 0, `${modeId} battle ${battle}: no Pokemon rows`)

    const labels = pokemonRows.map((row, slotIndex) => {
      const cells = [...row.cells]
      const species = normalizeSpeciesName(cells[1].textContent)
      const ability = normalizeAbilityName(cells[2].textContent)
      const nature = normalizeWhitespace(cells[3].textContent)
      const itemOrLevel = normalizeWhitespace(cells[4].textContent)
      const trailingStatCount = definition.fixedLevels ? 6 : 12
      const moves = cells
        .slice(5, -trailingStatCount)
        .map(normalizeMoveCell)
        .filter(move => move && move !== 'N/A')

      assert(pokedex[species], `${modeId} battle ${battle}: missing Pokedex species ${species}`)
      assert(pokedex[species].abilities.includes(ability), `${modeId} battle ${battle}: invalid ${species} ability ${ability}`)
      assert(NATURE_MODS[nature], `${modeId} battle ${battle}: unknown nature ${nature}`)

      const set = {
        evs: {},
        ivs: {},
        moves,
        nature,
        ability,
        item: definition.fixedLevels ? '' : normalizeItemName(itemOrLevel),
      }

      if (definition.fixedLevels) {
        set.level = Number(itemOrLevel)
        const listedStats = cells.slice(-6).map(cell => Number(normalizeWhitespace(cell.textContent)))
        assert(listedStats.every(Number.isFinite), `${modeId} battle ${battle}: invalid listed stats for ${species}`)
        const spread = deriveFixedSpread(species, nature, set.level, listedStats, pokedex)
        set.evs = spread.evs
        set.ivs = spread.ivs
        const calculatedStats = expectedStats(species, set, pokedex)
        const comparableListedStats = species === 'Shedinja' ? listedStats.slice(1) : listedStats
        const comparableCalculatedStats = species === 'Shedinja' ? calculatedStats.slice(1) : calculatedStats
        assert(
          JSON.stringify(comparableListedStats) === JSON.stringify(comparableCalculatedStats),
          `${modeId} battle ${battle}: ${species} listed stats were not reproduced`,
        )
      } else {
        const values = cells.slice(-12).map(cell => Number(normalizeWhitespace(cell.textContent)))
        assert(values.every(Number.isFinite), `${modeId} battle ${battle}: invalid IV/EV data for ${species}`)
        for (let index = 0; index < STAT_KEYS.length; index += 1) {
          set.ivs[STAT_KEYS[index]] = values[index * 2]
          set.evs[STAT_KEYS[index]] = values[index * 2 + 1]
        }
      }

      set.ivs = Object.fromEntries(Object.entries(set.ivs).filter(([, value]) => value !== 0))
      set.evs = Object.fromEntries(Object.entries(set.evs).filter(([, value]) => value !== 0))

      const label = `${species} (Battle ${battle}-${slotIndex + 1})`
      setdex[species] ??= {}
      assert(!setdex[species][label], `${modeId}: duplicate set label ${label}`)
      setdex[species][label] = set
      setCount += 1
      return label
    })

    assert(!trainerPokemon[trainer.name], `${modeId}: duplicate trainer name ${trainer.name}`)
    trainers.push(trainer)
    trainerPokemon[trainer.name] = labels
  })

  assert(setCount === definition.expectedSets, `${modeId}: expected ${definition.expectedSets} sets, found ${setCount}`)
  assert(trainers.every((trainer, index) => trainer.number === index + 1), `${modeId}: trainer progression is not 1-100`)

  return { trainers, trainerPokemon, setdex }
}

function splitTopLevel(value) {
  const fields = []
  let current = ''
  let templateDepth = 0
  let linkDepth = 0

  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2)
    if (pair === '{{') {
      templateDepth += 1
      current += pair
      index += 1
      continue
    }
    if (pair === '}}') {
      templateDepth -= 1
      current += pair
      index += 1
      continue
    }
    if (pair === '[[') {
      linkDepth += 1
      current += pair
      index += 1
      continue
    }
    if (pair === ']]') {
      linkDepth -= 1
      current += pair
      index += 1
      continue
    }
    if (value[index] === '|' && templateDepth === 0 && linkDepth === 0) {
      fields.push(current)
      current = ''
      continue
    }
    current += value[index]
  }
  fields.push(current)
  return fields
}

function cleanWikiText(value) {
  let result = value.trim()
  let previous = ''
  while (result !== previous) {
    previous = result
    result = result.replace(/\{\{([^{}]+)\}\}/g, (_, body) => {
      const fields = splitTopLevel(body)
      return fields.at(-1)?.replace(/^[^=]+=/, '') ?? ''
    })
  }
  return normalizeWhitespace(
    result
      .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/'{2,}/g, '')
      .replace(/<[^>]+>/g, ''),
  )
}

function extractSection(raw, startPattern, endPattern, label) {
  const start = raw.match(startPattern)
  assert(start?.index !== undefined, `Bulbapedia: missing ${label} section start`)
  const contentStart = start.index + start[0].length
  const remainder = raw.slice(contentStart)
  const end = remainder.match(endPattern)
  assert(end?.index !== undefined, `Bulbapedia: missing ${label} section end`)
  return remainder.slice(0, end.index)
}

function parseTrainerEntry(line) {
  const body = line.trim().replace(/^\{\{trainerentry\|/, '').replace(/\}\}$/, '')
  const fields = splitTopLevel(body)
  const count = Number(fields[4])
  assert(Number.isInteger(count), `Bulbapedia: invalid trainer Pokemon count in ${line}`)

  const pokemon = []
  for (let index = 0; index < count; index += 1) {
    const offset = 5 + index * 5
    pokemon.push({
      species: normalizeSpeciesName(cleanWikiText(fields[offset + 1])),
      level: cleanWikiText(fields[offset + 3]),
    })
  }

  return {
    class: cleanWikiText(fields[1]),
    name: cleanWikiText(fields[2]),
    pokemon,
  }
}

function readNamedField(block, key) {
  const match = block.match(new RegExp(`^\\|\\s*${key}\\s*=\\s*(.*)$`, 'm'))
  return match ? cleanWikiText(splitTopLevel(match[1])[0]) : ''
}

function parsePartyBlock(block) {
  const firstPokemon = block.indexOf('{{Pokémon')
  assert(firstPokemon >= 0, 'Bulbapedia: Party block has no Pokemon')
  const header = block.slice(0, firstPokemon)
  const pokemon = [...block.matchAll(/\{\{Pokémon\s*\n([\s\S]*?)\n\}\}/g)].map(match => {
    const pokemonBlock = match[1]
    return {
      species: normalizeSpeciesName(readNamedField(pokemonBlock, 'pokemon')),
      level: readNamedField(pokemonBlock, 'level'),
      ability: normalizeAbilityName(readNamedField(pokemonBlock, 'ability')),
      item: normalizeItemName(readNamedField(pokemonBlock, 'held')),
      moves: [1, 2, 3, 4]
        .map(index => readNamedField(pokemonBlock, `move${index}`))
        .filter(Boolean)
        .map(normalizeMoveName),
    }
  })

  return {
    class: readNamedField(header, 'class'),
    name: readNamedField(header, 'name'),
    pokemon,
    hasDetailedSets: true,
  }
}

function parseBulbapediaSection(section, modeId, area) {
  const regular = [...section.matchAll(/^\{\{trainerentry\|.*\}\}\s*$/gm)]
    .map(match => parseTrainerEntry(match[0]))
  assert(regular.length === 9, `Bulbapedia ${modeId} area ${area}: expected 9 regular trainers, found ${regular.length}`)

  const parties = [...section.matchAll(/\{\{Party\s*\n([\s\S]*?)\{\{Party\/end\}\}/g)]
  assert(parties.length === 1, `Bulbapedia ${modeId} area ${area}: expected one area leader, found ${parties.length}`)

  return [...regular, parsePartyBlock(parties[0][1])]
}

function parseBulbapediaAreas(rawAreas) {
  const result = Object.fromEntries(Object.keys(MODE_DEFS).map(modeId => [modeId, []]))

  rawAreas.forEach((raw, areaIndex) => {
    const area = areaIndex + 1
    const storyStart = area === 1
      ? /^====After Cipher's invasion====$/m
      : /^===Story Mode===$/m
    const xdHeading = /^==(?:\[\[)?Pokémon XD: Gale of Darkness(?:\]\])?==$/m

    const sections = {
      'colosseum-story': extractSection(raw, storyStart, /^===Battle Mode===$/m, `area ${area} Story Mode`),
      'colosseum-battle-singles': extractSection(raw, /^====Single Battles====$/m, /^====Double Battles====$/m, `area ${area} Single Battles`),
      'colosseum-battle-doubles': extractSection(raw, /^====Double Battles====$/m, xdHeading, `area ${area} Double Battles`),
      xd: extractSection(raw, xdHeading, /^==(?:Trivia|Related articles)==$/m, `area ${area} XD`),
    }

    for (const [modeId, section] of Object.entries(sections)) {
      result[modeId].push(...parseBulbapediaSection(section, modeId, area))
    }
  })

  for (const [modeId, trainers] of Object.entries(result)) {
    assert(trainers.length === 100, `Bulbapedia ${modeId}: expected 100 trainers, found ${trainers.length}`)
  }
  return result
}

function getSetByLabel(setdex, label) {
  for (const [species, sets] of Object.entries(setdex)) {
    if (sets[label]) return { species, set: sets[label] }
  }
  return null
}

function validateAgainstBulbapedia(generated, bulbapedia) {
  for (const [modeId, data] of Object.entries(generated)) {
    const bulbapediaTrainers = bulbapedia[modeId]
    data.trainers.forEach((trainer, index) => {
      const battle = index + 1
      const bulbaTrainer = bulbapediaTrainers[index]
      const identityDiscrepancy = TRAINER_IDENTITY_DISCREPANCIES[`${modeId}:${battle}`]
      const identitiesMatch =
        comparisonText(trainer.class) === comparisonText(bulbaTrainer.class) &&
        comparisonText(trainer.name) === comparisonText(bulbaTrainer.name)
      const knownIdentityMismatch =
        identityDiscrepancy?.altissimoClass === trainer.class &&
        identityDiscrepancy?.altissimoName === trainer.name &&
        identityDiscrepancy?.bulbapediaClass === bulbaTrainer.class &&
        identityDiscrepancy?.bulbapediaName === bulbaTrainer.name
      assert(
        identitiesMatch || knownIdentityMismatch,
        `${modeId} battle ${battle}: trainer mismatch, Altissimo "${trainer.class} ${trainer.name}" vs Bulbapedia "${bulbaTrainer.class} ${bulbaTrainer.name}"`,
      )

      const labels = data.trainerPokemon[trainer.name]
      assert(labels.length === bulbaTrainer.pokemon.length, `${modeId} battle ${battle}: roster length mismatch`)
      const unmatchedBulbaPokemon = [...bulbaTrainer.pokemon]
      labels.forEach(label => {
        const generatedPokemon = getSetByLabel(data.setdex, label)
        assert(generatedPokemon, `${modeId} battle ${battle}: missing generated set ${label}`)
        const discrepancy = SOURCE_DISCREPANCIES[`${modeId}:${battle}:${generatedPokemon.species}`]
        const bulbaIndex = unmatchedBulbaPokemon.findIndex(pokemon =>
          comparisonText(generatedPokemon.species) === comparisonText(pokemon.species)
        )
        assert(bulbaIndex >= 0, `${modeId} battle ${battle}: Bulbapedia roster does not contain Altissimo ${generatedPokemon.species}`)
        const [bulbaPokemon] = unmatchedBulbaPokemon.splice(bulbaIndex, 1)

        if (MODE_DEFS[modeId].fixedLevels) {
          const levelsMatch = String(generatedPokemon.set.level) === bulbaPokemon.level
          const knownMismatch =
            discrepancy?.altissimoLevel === generatedPokemon.set.level &&
            discrepancy?.bulbapediaLevel === bulbaPokemon.level
          assert(levelsMatch || knownMismatch, `${modeId} battle ${battle}: level mismatch for ${generatedPokemon.species}`)
        } else {
          assert(bulbaPokemon.level === '50-100', `${modeId} battle ${battle}: unexpected Bulbapedia open level ${bulbaPokemon.level}`)
        }

        if (bulbaTrainer.hasDetailedSets) {
          const abilitiesMatch =
            comparisonText(generatedPokemon.set.ability) === comparisonText(bulbaPokemon.ability)
          const knownAbilityMismatch =
            discrepancy?.altissimoAbility === generatedPokemon.set.ability &&
            discrepancy?.bulbapediaAbility === bulbaPokemon.ability
          assert(
            abilitiesMatch || knownAbilityMismatch,
            `${modeId} battle ${battle}: ability mismatch for ${generatedPokemon.species}`,
          )
          assert(
            comparisonText(generatedPokemon.set.item) === comparisonText(bulbaPokemon.item),
            `${modeId} battle ${battle}: item mismatch for ${generatedPokemon.species}`,
          )
          const altissimoMoves = generatedPokemon.set.moves
            .filter(move => !discrepancy?.altissimoOnlyMoves?.includes(move))
            .map(comparisonMove)
            .sort()
          const bulbapediaMoves = bulbaPokemon.moves
            .filter(move => !discrepancy?.bulbapediaOnlyMoves?.includes(move))
            .map(comparisonMove)
            .sort()
          assert(
            JSON.stringify(altissimoMoves) === JSON.stringify(bulbapediaMoves),
            `${modeId} battle ${battle}: move mismatch for ${generatedPokemon.species}`,
          )
        }
      })
      assert(unmatchedBulbaPokemon.length === 0, `${modeId} battle ${battle}: unmatched Bulbapedia Pokemon remain`)
    })
  }
}

function validateMoves(generated, moves) {
  for (const [modeId, data] of Object.entries(generated)) {
    for (const sets of Object.values(data.setdex)) {
      for (const set of Object.values(sets)) {
        for (const move of set.moves) {
          assert(moves[move], `${modeId}: missing Gen 3 move data for ${move}`)
        }
      }
    }
  }
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(OUT_DIR, filename), `${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const [altissimoPages, bulbapediaAreas] = await Promise.all([
    Promise.all(Object.values(ALTISSIMO_SOURCES).map(fetchText)),
    Promise.all(BULBAPEDIA_AREA_SOURCES.map(fetchText)),
  ])

  const pokedex = JSON.parse(fs.readFileSync(POKEDEX_PATH, 'utf8'))
  const generated = {}
  Object.keys(ALTISSIMO_SOURCES).forEach((modeId, index) => {
    generated[modeId] = parseAltissimoMode(modeId, altissimoPages[index], pokedex)
  })

  const bulbapedia = parseBulbapediaAreas(bulbapediaAreas)
  validateAgainstBulbapedia(generated, bulbapedia)

  const moves = {
    ...JSON.parse(fs.readFileSync(BASE_MOVES_PATH, 'utf8')),
    ...EXTRA_MOVES,
  }
  validateMoves(generated, moves)

  fs.mkdirSync(OUT_DIR, { recursive: true })
  writeJson('battle_trainers_mt_battle.json', Object.fromEntries(
    Object.entries(generated).map(([modeId, data]) => [modeId, data.trainers]),
  ))
  writeJson('trainer_pokemon_mt_battle.json', Object.fromEntries(
    Object.entries(generated).map(([modeId, data]) => [modeId, data.trainerPokemon]),
  ))
  writeJson('setdex_mt_battle.json', Object.fromEntries(
    Object.entries(generated).map(([modeId, data]) => [modeId, data.setdex]),
  ))
  writeJson('moves_mt_battle.json', moves)

  const totalSets = Object.values(generated)
    .reduce((total, data) => total + Object.values(data.setdex).reduce(
      (modeTotal, sets) => modeTotal + Object.keys(sets).length,
      0,
    ), 0)
  console.log(`Validated 400 one-trainer battles and ${totalSets} Pokemon sets against Bulbapedia.`)
  console.log(`Wrote Mt. Battle data to ${OUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
