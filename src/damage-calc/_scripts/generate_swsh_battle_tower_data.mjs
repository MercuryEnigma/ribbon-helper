/**
 * Generate Sword/Shield Battle Tower data from Altissimo and verify the
 * overlapping Pokemon and trainer data against Bulbapedia.
 *
 * Usage: node src/damage-calc/_scripts/generate_swsh_battle_tower_data.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../../data/battle-facilities/swsh')

const ALTISSIMO_POKEMON = 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-pokemon.html'
const ALTISSIMO_TRAINERS = 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-trainers.html'
const BULBA_POKEMON = 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Sword_and_Shield'
const BULBA_TRAINERS = 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Sword_and_Shield'
const SINGLES_PASTE = 'https://pokepast.es/88b227ec32852609/raw'
const SINGLES_PASTE_2 = 'https://pokepast.es/38879e9b5717be76/raw'
const DOUBLES_PASTE = 'https://pokepast.es/e36a6fa770adac28/raw'

const STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp']
const STAT_ALIASES = {
  HP: 'hp',
  Atk: 'at',
  Attack: 'at',
  Def: 'df',
  Defense: 'df',
  SpA: 'sa',
  'Sp. Atk': 'sa',
  SpD: 'sd',
  'Sp. Def': 'sd',
  Spe: 'sp',
  Speed: 'sp',
}

const GALARIAN_SPECIES = {
  Darmanitan: 'Darmanitan-Galar',
  Rapidash: 'Rapidash-Galar',
  Stunfisk: 'Stunfisk-Galar',
  Weezing: 'Weezing-Galar',
}

const RECOMMENDED_SPECIES_ALIASES = {
  'Kyurem-White': 'Kyurem-W',
  Zacian: 'Zacian-Crowned',
}

const EXTRA_MOVES = {
  'Gear Up': { bp: 0, type: 'Steel', category: 'Status' },
  Howl: { bp: 0, type: 'Normal', category: 'Status' },
  'Life Dew': { bp: 0, type: 'Water', category: 'Status' },
  'Magic Room': { bp: 0, type: 'Psychic', category: 'Status' },
  'Simple Beam': { bp: 0, type: 'Normal', category: 'Status' },
  'Speed Swap': { bp: 0, type: 'Psychic', category: 'Status' },
  Transform: { bp: 0, type: 'Normal', category: 'Status' },
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

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizedKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepClone)
  const clone = {}
  for (const key of Object.keys(obj)) clone[key] = deepClone(obj[key])
  return clone
}

function deepMerge(target, ...sources) {
  for (const src of sources) {
    if (!src) continue
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {}
        deepMerge(target[key], src[key])
      } else if (Array.isArray(src[key])) {
        target[key] = [...src[key]]
      } else {
        target[key] = src[key]
      }
    }
  }
  return target
}

function loadDamageCalcData() {
  const $ = {
    extend(deep, target, ...sources) {
      if (deep === true) return deepMerge(target, ...sources)
      return Object.assign(target, ...sources)
    },
  }

  const pokedexCode = fs.readFileSync(path.join(__dirname, 'game_data/pokedex.js'), 'utf8')
  const moveCode = fs.readFileSync(path.join(__dirname, 'game_data/move_data.js'), 'utf8')
  const pokedex = new Function('$', `${pokedexCode}; return POKEDEX_SS;`)($)
  const moves = new Function('$', `${moveCode}; return MOVES_SS;`)($)
  for (const [move, data] of Object.entries(EXTRA_MOVES)) {
    moves[move] ??= data
  }

  for (const mon of Object.values(pokedex)) {
    if (mon.bs && 'sl' in mon.bs) delete mon.bs.sl
    if ('ab' in mon) delete mon.ab
  }

  return { pokedex, moves }
}

function buildCanonicalIndex(values) {
  return new Map(values.filter(Boolean).map(value => [normalizedKey(value), value]))
}

function canonicalizeMove(value, canonicalMoves) {
  const move = normalizeText(value)
  if (!move || move === 'N/A' || move === '-') return ''
  return canonicalMoves.get(normalizedKey(move)) ?? move
}

function normalizeItem(value) {
  const item = normalizeText(value)
  if (!item || item === 'N/A' || item === 'None' || item === '-') return ''
  return item
}

function parseEv(value) {
  const normalized = normalizeText(value)
  if (!normalized || normalized === '-' || normalized === 'N/A') return 0
  return Number(normalized)
}

function evObject(values) {
  const evs = {}
  values.forEach((value, index) => {
    if (value) evs[STAT_KEYS[index]] = value
  })
  return evs
}

function ivObject(value) {
  return Object.fromEntries(STAT_KEYS.map(stat => [stat, value]))
}

function cleanAltLabel(rawLabel) {
  return normalizeText(rawLabel)
    .replace(/^\((?:Gigantamax|Dynamax)\)\s*/, '')
    .replace(/\s*\(Galarian\)\s*$/, '')
    .replace(/\s*\((?:Amped|Low Key)\)\s*$/, '')
    .replace(/\s*[♂♀]\s*$/, '')
    .replace(/\s*\((?:Gigantamax|Dynamax)\)\s*$/, '')
}

function dexSpeciesForAltLabel(rawLabel, displaySpecies) {
  if (/\(Galarian\)/.test(rawLabel)) return GALARIAN_SPECIES[displaySpecies]
  if (displaySpecies === 'Indeedee' && /♂/.test(rawLabel)) return 'Indeedee-M'
  if (displaySpecies === 'Indeedee' && /♀/.test(rawLabel)) return 'Indeedee-F'
  return displaySpecies
}

function labelSpecies(label) {
  const match = label.match(/^(.+)-(\d+)$/)
  assert(match, `Unable to parse set label: ${label}`)
  return match[1]
}

function parseAltissimoPokemon(html, canonicalMoves) {
  const document = new JSDOM(html).window.document
  const sets = []

  for (const table of document.querySelectorAll('table')) {
    const caption = normalizeText(table.querySelector('caption')?.textContent)
    const ivGroup = Number(caption.match(/(\d+)IV/)?.[1])
    if (!ivGroup) continue

    for (const row of table.querySelectorAll('tr')) {
      const cells = [...row.querySelectorAll('td')].map(cell => normalizeText(cell.textContent))
      if (cells.length < 15 || !/^\d+$/.test(cells[0])) continue

      const rawLabel = cells[2]
      const label = cleanAltLabel(rawLabel)
      const displaySpecies = labelSpecies(label)
      const dexSpecies = dexSpeciesForAltLabel(rawLabel, displaySpecies)
      assert(dexSpecies, `Unable to determine dex species for ${rawLabel}`)

      const ivs = label === 'Ditto-5' ? 12 : ivGroup
      sets.push({
        sourceNumber: Number(cells[0]),
        label,
        displaySpecies,
        species: dexSpecies,
        nature: cells[3],
        item: normalizeItem(cells[4]),
        moves: cells.slice(5, 9).map(move => canonicalizeMove(move, canonicalMoves)),
        evs: cells.slice(9, 15).map(parseEv),
        ivGroup,
        ivs,
        dynamax: /\(Dynamax\)/.test(rawLabel),
        gigantamax: /\(Gigantamax\)/.test(rawLabel),
      })
    }
  }

  return sets
}

function parseBulbapediaPokemon(html, canonicalMoves) {
  const document = new JSDOM(html).window.document
  const sets = []

  for (const row of document.querySelectorAll('table tr')) {
    const cells = [...row.querySelectorAll('td')].map(cell => normalizeText(cell.textContent))
    if (cells.length < 15 || !/^\d+$/.test(cells[0])) continue
    sets.push({
      species: cells[2],
      item: normalizeItem(cells[3]),
      moves: cells.slice(4, 8).map(move => canonicalizeMove(move, canonicalMoves)),
      nature: cells[8],
      evs: cells.slice(9, 15).map(parseEv),
    })
  }

  return sets
}

function pokemonSignature(set) {
  return JSON.stringify([
    normalizedKey(comparisonSpecies(set.displaySpecies ?? set.species)),
    normalizedKey(set.item),
    set.moves.map(normalizedKey),
    normalizedKey(set.nature),
    set.evs,
  ])
}

function comparisonSpecies(species) {
  const normalized = normalizeText(species)
  if (/^Rotom-/.test(normalized)) return 'Rotom'
  return normalized
}

function comparePokemonRows(altissimoSets, bulbapediaSets) {
  assert(altissimoSets.length === 922, `Expected 922 Altissimo Pokemon sets, found ${altissimoSets.length}`)
  assert(bulbapediaSets.length === 922, `Expected 922 Bulbapedia Pokemon sets, found ${bulbapediaSets.length}`)

  const bulbapediaCounts = new Map()
  for (const set of bulbapediaSets) {
    const signature = pokemonSignature(set)
    bulbapediaCounts.set(signature, (bulbapediaCounts.get(signature) ?? 0) + 1)
  }

  for (const alt of altissimoSets) {
    const signature = pokemonSignature(alt)
    const count = bulbapediaCounts.get(signature) ?? 0
    assert(count > 0, `No Bulbapedia match for ${alt.label}: ${signature}`)
    if (count === 1) bulbapediaCounts.delete(signature)
    else bulbapediaCounts.set(signature, count - 1)
  }

  assert(bulbapediaCounts.size === 0, `Bulbapedia had ${bulbapediaCounts.size} unmatched Pokemon signatures`)
}

function buildSetdex(sets, pokedex) {
  const setdex = {}
  const labels = new Set()

  for (const set of sets) {
    assert(pokedex[set.species], `Missing pokedex entry for ${set.species} (${set.label})`)
    assert(!labels.has(set.label), `Duplicate set label ${set.label}`)
    labels.add(set.label)

    const entry = {
      evs: evObject(set.evs),
      ivs: ivObject(set.ivs),
      moves: set.moves,
      nature: set.nature,
      item: set.item,
      ivGroup: set.ivGroup,
    }
    if (set.dynamax) entry.dynamax = true
    if (set.gigantamax) entry.gigantamax = true

    setdex[set.species] ??= {}
    setdex[set.species][set.label] = entry
  }

  return setdex
}

function expandRosterCell(value) {
  const clean = normalizeText(value)
    .replace(/\s*\((?:Dynamax|Gigantamax)\)\s*/g, '')
  if (!clean) return []

  const match = clean.match(/^(.+)-(\d+(?:,\s*\d+)*)$/)
  assert(match, `Unable to parse roster cell: ${value}`)
  const [, base, numbers] = match
  return numbers.split(',').map(number => `${base}-${number.trim()}`)
}

function parseAltissimoRosters(html) {
  const document = new JSDOM(html).window.document
  const rosters = []
  const trainerToRoster = new Map()

  for (const h4 of [...document.querySelectorAll('h4')].filter(heading => /^Roster /.test(normalizeText(heading.textContent)))) {
    const claimedRoster = Number(normalizeText(h4.textContent).replace(/\D/g, ''))
    let table = null
    let next = h4.nextElementSibling
    while (next && next.tagName !== 'H3' && next.tagName !== 'H4') {
      if (next.tagName === 'TABLE') {
        table = next
        break
      }
      next = next.nextElementSibling
    }
    assert(table, `Missing table for Roster ${claimedRoster}`)

    const labels = [...table.querySelectorAll('td')]
      .flatMap(cell => expandRosterCell(cell.textContent))
    assert(labels.length > 0, `Roster ${claimedRoster} has no Pokemon labels`)

    const trainers = []
    next = table.nextElementSibling
    while (next && next.tagName !== 'H3' && next.tagName !== 'H4') {
      for (const li of next.querySelectorAll?.('li') ?? []) {
        trainers.push(normalizeText(li.textContent))
      }
      next = next.nextElementSibling
    }
    assert(trainers.length > 0, `Roster ${claimedRoster} has no trainers`)

    const roster = { sourceRoster: claimedRoster, labels }
    rosters.push(roster)
    for (const trainer of trainers) {
      const trainerKey = normalizeTrainerIdentity(trainer)
      assert(!trainerToRoster.has(trainerKey), `Trainer appears in multiple rosters: ${trainer}`)
      trainerToRoster.set(trainerKey, roster)
    }
  }

  const claimed = new Set(rosters.map(roster => roster.sourceRoster))
  assert(rosters.length === 87, `Expected 87 Altissimo ordinary roster sections, found ${rosters.length}`)
  assert(claimed.size === 86, `Expected 86 unique Altissimo roster headings, found ${claimed.size}`)

  return { rosters, trainerToRoster }
}

function parseAltissimoLeonRosters(html) {
  const document = new JSDOM(html).window.document
  const titleToKey = {
    'Beginner Tier (Rank 3)': 'rank-3',
    'Poké Ball Tier (Rank 6)': 'rank-6',
    'Great Ball Tier (Rank 9)': 'rank-9',
    'Ultra Ball Tier (Rank 10)': 'rank-10',
    'Master Ball Tier (Max Rank)': 'max',
  }
  const rosters = {}

  for (const h4 of document.querySelectorAll('h4')) {
    const title = normalizeText(h4.textContent)
    const key = titleToKey[title]
    if (!key) continue

    let table = null
    let next = h4.nextElementSibling
    while (next && next.tagName !== 'H3' && next.tagName !== 'H4') {
      if (next.tagName === 'TABLE') {
        table = next
        break
      }
      next = next.nextElementSibling
    }
    assert(table, `Missing Leon table for ${title}`)
    rosters[key] = [...table.querySelectorAll('td')]
      .flatMap(cell => expandRosterCell(cell.textContent))
  }

  assert(Object.keys(rosters).length === 5, `Expected 5 Leon rosters, found ${Object.keys(rosters).length}`)
  return rosters
}

function normalizeTrainerIdentity(value) {
  return normalizeText(value)
    .replace(/\s*\(always uses .*?\)\s*$/i, '')
    .replace(/[♂♀]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function parseRank(value) {
  const rank = normalizeText(value).toUpperCase()
  return rank === 'MAX' ? 'MAX' : Number(rank)
}

function parseBulbapediaTrainers(html) {
  const document = new JSDOM(html).window.document
  const trainers = []

  for (const row of document.querySelectorAll('table tr')) {
    const cells = [...row.querySelectorAll('td')].map(cell => normalizeText(cell.textContent))
    if (cells.length < 6 || !/^\d+$/.test(cells[0])) continue
    trainers.push({
      number: Number(cells[0]),
      class: cells[1],
      name: cells[2],
      dynamaxBand: cells[3] === '✔',
      minRank: parseRank(cells[4]),
      maxRank: parseRank(cells[5]),
    })
  }

  assert(trainers.length === 172, `Expected 172 Bulbapedia trainers, found ${trainers.length}`)
  return trainers
}

function buildTrainerData(bulbapediaTrainers, trainerToRoster, leonRosters) {
  const battleTrainers = []
  const trainerPokemon = {}

  for (const trainer of bulbapediaTrainers) {
    const key = normalizeTrainerIdentity(`${trainer.class} ${trainer.name}`)
    const roster = trainerToRoster.get(key)
    assert(roster, `Missing Altissimo roster for ${trainer.class} ${trainer.name}`)

    battleTrainers.push({
      number: trainer.number,
      class: trainer.class,
      name: trainer.name,
      minRank: trainer.minRank,
      maxRank: trainer.maxRank,
      dynamaxBand: trainer.dynamaxBand,
      sourceRoster: roster.sourceRoster,
    })
    trainerPokemon[trainer.name] = roster.labels
  }

  battleTrainers.push({
    number: 999,
    class: 'Champion',
    name: 'Leon',
    minRank: 3,
    maxRank: 'MAX',
    boss: 'leon',
  })
  trainerPokemon.Leon = leonRosters

  return { battleTrainers, trainerPokemon }
}

function parseSpeciesFromNamePart(namePart) {
  const cleaned = normalizeText(namePart)
    .replace(/\s*\(M\)\s*$/, '')
    .replace(/\s*\(F\)\s*$/, '')
  const parenMatch = cleaned.match(/^.+\((.+)\)\s*$/)
  return parenMatch ? normalizeText(parenMatch[1]) : cleaned
}

function parseStatSpread(value) {
  const spread = {}
  for (const part of normalizeText(value).split('/')) {
    const match = part.trim().match(/^(\d+)\s+(.+)$/)
    if (!match) continue
    const stat = STAT_ALIASES[normalizeText(match[2])]
    assert(stat, `Unknown stat in spread: ${part}`)
    spread[stat] = Number(match[1])
  }
  return spread
}

function parseRecommendedTeam(raw, labelSuffix, canonicalMoves, pokedex) {
  const team = {}
  let current = null

  function finishCurrent() {
    if (!current) return
    if (current.placeholder && (!current.nature || current.moves.length === 0)) {
      current = null
      return
    }
    assert(current.species, `Recommended set missing species for ${labelSuffix}`)
    assert(current.nature, `Recommended set missing nature for ${current.label}`)
    assert(current.moves.length > 0, `Recommended set missing moves for ${current.label}`)
    assert(pokedex[current.species], `Missing pokedex entry for recommended ${current.species}`)

    const entry = {
      evs: current.evs,
      moves: current.moves,
      nature: current.nature,
      item: current.item,
      ability: current.ability,
    }
    if (Object.keys(current.ivs).length > 0) entry.ivs = current.ivs
    if (current.level) entry.level = current.level

    team[current.species] ??= {}
    team[current.species][current.label] = entry
    current = null
  }

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = normalizeText(rawLine)
    if (!line) continue

    const firstLine = line.match(/^(.+?)\s*@\s*(.+)$/)
    if (firstLine && !line.includes(':')) {
      finishCurrent()
      const displaySpecies = parseSpeciesFromNamePart(firstLine[1])
      const species = RECOMMENDED_SPECIES_ALIASES[displaySpecies] ?? displaySpecies
      current = {
        species,
        label: `${displaySpecies} (SwSh ${labelSuffix})`,
        placeholder: /^Your Ribbon Master Here/i.test(firstLine[1]),
        item: normalizeItem(firstLine[2]),
        ability: '',
        evs: {},
        ivs: {},
        moves: [],
        nature: '',
        level: undefined,
      }
      continue
    }

    if (!current) continue
    if (line.startsWith('Ability:')) {
      current.ability = normalizeText(line.slice('Ability:'.length))
    } else if (line.startsWith('EVs:')) {
      current.evs = parseStatSpread(line.slice('EVs:'.length))
    } else if (line.startsWith('IVs:')) {
      const ivText = normalizeText(line.slice('IVs:'.length))
      if (/^\d/.test(ivText)) current.ivs = parseStatSpread(ivText)
    } else if (line.startsWith('Nature:')) {
      current.nature = normalizeText(line.slice('Nature:'.length))
    } else if (line.endsWith(' Nature')) {
      current.nature = normalizeText(line.replace(/ Nature$/, ''))
    } else if (line.startsWith('Level:')) {
      current.level = Number(normalizeText(line.slice('Level:'.length)))
    } else if (line.startsWith('- ')) {
      current.moves.push(canonicalizeMove(line.slice(2), canonicalMoves))
    }
  }
  finishCurrent()

  return team
}

function mergeTeamData(...teams) {
  const merged = {}
  for (const team of teams) {
    for (const [species, sets] of Object.entries(team)) {
      merged[species] = { ...merged[species], ...sets }
    }
  }
  return merged
}

function validateLabelsAndMoves({ setdex, trainerPokemon, teamData, moves }) {
  const labels = new Set(Object.values(setdex).flatMap(sets => Object.keys(sets)))
  for (const [trainer, roster] of Object.entries(trainerPokemon)) {
    const rosters = Array.isArray(roster) ? [roster] : Object.values(roster)
    for (const labelsForRoster of rosters) {
      for (const label of labelsForRoster) assert(labels.has(label), `Roster label ${label} for ${trainer} does not resolve`)
    }
  }

  const missingMoves = new Set()
  for (const [species, sets] of Object.entries(setdex)) {
    for (const [label, set] of Object.entries(sets)) {
      for (const move of set.moves.filter(Boolean)) {
        if (!moves[move]) missingMoves.add(`${move} (${species} ${label})`)
      }
    }
  }

  for (const [species, sets] of Object.entries(teamData)) {
    for (const [label, set] of Object.entries(sets)) {
      for (const move of set.moves.filter(Boolean)) {
        if (!moves[move]) missingMoves.add(`${move} (${species} ${label})`)
      }
    }
  }
  assert(missingMoves.size === 0, `Unresolved moves:\n${[...missingMoves].sort().join('\n')}`)
}

function writeJson(fileName, data) {
  fs.writeFileSync(path.join(OUT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`)
}

function writeSources() {
  fs.writeFileSync(path.join(OUT_DIR, 'SOURCES.md'), `# Sword/Shield Battle Tower Sources

- Altissimo Battle Tower Pokemon: ${ALTISSIMO_POKEMON}
- Altissimo Battle Tower Trainers: ${ALTISSIMO_TRAINERS}
- Bulbapedia Battle Tower Pokemon: ${BULBA_POKEMON}
- Bulbapedia Battle Tower Trainers: ${BULBA_TRAINERS}
- Singles rain team: https://pokepast.es/88b227ec32852609
- Singles Dracovish/Zacian team: https://pokepast.es/38879e9b5717be76
- Doubles team: https://pokepast.es/e36a6fa770adac28

- Altissimo supplies source set labels, IV groups, trainer rosters, Leon rosters, and Dynamax/Gigantamax flags.
- Bulbapedia supplies the independent Pokemon set table and canonical trainer classes, names, rank ranges, and Dynamax Band flags.
- The 922 Pokemon rows are compared as a normalized multiset of species, items, moves, natures, and EVs. Bulbapedia does not include Altissimo's set labels or IV groups, so Altissimo remains canonical for labels and IV grouping.
- Opponent IVs are tied to Pokemon sets: 16/19/23/27/31 by Altissimo group, with Ditto-5 explicitly stored as 12 IVs.
- Altissimo currently has 87 ordinary roster sections but only 86 unique roster headings because two sections are labeled Roster 64. The generator preserves both sections and records the duplicated source heading.
- Dynamax and Gigantamax flags are preserved as metadata but ignored by the v1 calculator.
\n`)
}

async function main() {
  const { pokedex, moves } = loadDamageCalcData()
  const canonicalMoves = buildCanonicalIndex(Object.keys(moves))

  const [
    altPokemonHtml,
    altTrainersHtml,
    bulbaPokemonHtml,
    bulbaTrainersHtml,
    singlesPaste,
    singlesPaste2,
    doublesPaste,
  ] = await Promise.all([
    fetchText(ALTISSIMO_POKEMON),
    fetchText(ALTISSIMO_TRAINERS),
    fetchText(BULBA_POKEMON),
    fetchText(BULBA_TRAINERS),
    fetchText(SINGLES_PASTE),
    fetchText(SINGLES_PASTE_2),
    fetchText(DOUBLES_PASTE),
  ])

  const altPokemon = parseAltissimoPokemon(altPokemonHtml, canonicalMoves)
  const bulbaPokemon = parseBulbapediaPokemon(bulbaPokemonHtml, canonicalMoves)
  comparePokemonRows(altPokemon, bulbaPokemon)

  const setdex = buildSetdex(altPokemon, pokedex)
  const { trainerToRoster } = parseAltissimoRosters(altTrainersHtml)
  const leonRosters = parseAltissimoLeonRosters(altTrainersHtml)
  const bulbaTrainers = parseBulbapediaTrainers(bulbaTrainersHtml)
  const { battleTrainers, trainerPokemon } = buildTrainerData(bulbaTrainers, trainerToRoster, leonRosters)

  const singlesTeam = parseRecommendedTeam(singlesPaste, 'Singles', canonicalMoves, pokedex)
  const singlesTeam2 = parseRecommendedTeam(singlesPaste2, 'Singles 2', canonicalMoves, pokedex)
  const doublesTeam = parseRecommendedTeam(doublesPaste, 'Doubles', canonicalMoves, pokedex)
  const teamData = mergeTeamData(singlesTeam, singlesTeam2, doublesTeam)

  validateLabelsAndMoves({ setdex, trainerPokemon, teamData, moves })

  fs.mkdirSync(OUT_DIR, { recursive: true })
  writeJson('pokedex_swsh.json', pokedex)
  writeJson('moves_swsh.json', moves)
  writeJson('setdex_swsh.json', setdex)
  writeJson('battle_trainers_swsh.json', battleTrainers)
  writeJson('trainer_pokemon_swsh.json', trainerPokemon)
  writeJson('setteam_swsh.json', teamData)
  writeSources()

  console.log(`Matched ${altPokemon.length} Pokemon rows between Altissimo and Bulbapedia`)
  console.log(`Matched ${bulbaTrainers.length} trainers against Altissimo rosters`)
  console.log(`Wrote ${Object.keys(setdex).length} species with ${altPokemon.length} opponent sets`)
  console.log(`Wrote ${battleTrainers.length} trainer records and ${Object.keys(trainerPokemon).length} trainer roster entries`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
