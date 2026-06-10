/**
 * Generate Diamond/Pearl Battle Tower data and cross-check Bulbapedia against
 * Altissimo's code-backed tables.
 *
 * Bulbapedia's trainer page currently lists different IV tiers. This generator
 * intentionally uses Altissimo's code-backed 3/6/9/12/15/18/21/31 tiers while
 * using Bulbapedia for canonical trainer identities and listed set natures.
 *
 * Usage: node src/damage-calc/_scripts/generate_dp_battle_tower_data.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../../data/battle-facilities/dp')
const PTHGSS_DIR = path.join(__dirname, '../../data/battle-facilities/pthgss')

const BULBA_TRAINERS_RAW = 'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Diamond_and_Pearl&action=raw'
const BULBA_GROUP_1_RAW = 'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Diamond_and_Pearl/Group_1&action=raw'
const BULBA_GROUP_2_RAW = 'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Diamond_and_Pearl/Group_2&action=raw'
const ALTISSIMO_POKEMON = 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-pokemon.html'
const ALTISSIMO_TRAINERS = 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-trainers.html'
const ALTISSIMO_TOWER = 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower.html'

const STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp']

const MOVE_NAME_OVERRIDES = {
  DoubleSlap: 'Double Slap',
  'Faint Attack': 'Feint Attack',
  'Hi Jump Kick': 'High Jump Kick',
  SmokeScreen: 'Smokescreen',
  ViceGrip: 'Vise Grip',
}

const TRAINER_IDENTITY_ALIASES = {
  'Psychic Jaspter': 'Psychic Jasper',
  'Parasol Lady Angie': 'Aroma Lady Haylee',
  'Beauty Nadia': 'Aroma Lady Nadia',
}

const EXTRA_MOVES = {
  Absorb: { bp: 20, type: 'Grass', category: 'Special', acc: 100 },
  Bide: { bp: 0, type: 'Normal', category: 'Physical' },
  Camouflage: { bp: 0, type: 'Normal' },
  'Comet Punch': { bp: 18, type: 'Normal', category: 'Physical', makesContact: true, maxMultiHits: 5, acc: 85 },
  Constrict: { bp: 10, type: 'Normal', category: 'Physical', makesContact: true, hasSecondaryEffect: true, acc: 100 },
  Cut: { bp: 50, type: 'Normal', category: 'Physical', makesContact: true, acc: 95 },
  'Double Slap': { bp: 15, type: 'Normal', category: 'Physical', makesContact: true, maxMultiHits: 5, acc: 85 },
  'Fury Attack': { bp: 15, type: 'Normal', category: 'Physical', maxMultiHits: 5, acc: 85 },
  Harden: { bp: 0, type: 'Normal' },
  Howl: { bp: 0, type: 'Normal' },
  'Lucky Chant': { bp: 0, type: 'Normal' },
  Meditate: { bp: 0, type: 'Psychic' },
  'Mud Sport': { bp: 0, type: 'Ground' },
  'Poison Gas': { bp: 0, type: 'Poison' },
  'Poison Sting': { bp: 15, type: 'Poison', category: 'Physical', hasSecondaryEffect: true, acc: 100 },
  Pound: { bp: 40, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Present: { bp: 40, type: 'Normal', category: 'Physical', acc: 90 },
  Smog: { bp: 20, type: 'Poison', category: 'Special', hasSecondaryEffect: true, acc: 70 },
  Smokescreen: { bp: 0, type: 'Normal' },
  'Spider Web': { bp: 0, type: 'Bug' },
  'Spike Cannon': { bp: 20, type: 'Normal', category: 'Physical', maxMultiHits: 5, acc: 100 },
  Splash: { bp: 0, type: 'Normal' },
  Supersonic: { bp: 0, type: 'Normal', isSound: true, acc: 55 },
  'Sweet Scent': { bp: 0, type: 'Normal' },
  'Vine Whip': { bp: 35, type: 'Grass', category: 'Physical', makesContact: true, acc: 100 },
  'Water Sport': { bp: 0, type: 'Water' },
  Withdraw: { bp: 0, type: 'Water' },
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

function normalizedKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function buildCanonicalIndex(values) {
  return new Map(values.filter(Boolean).map(value => [normalizedKey(value), value]))
}

const pthgssSetdex = JSON.parse(fs.readFileSync(path.join(PTHGSS_DIR, 'setdex_pthgss.json'), 'utf8'))
const pthgssMoves = JSON.parse(fs.readFileSync(path.join(PTHGSS_DIR, 'moves_pthgss.json'), 'utf8'))
const canonicalItems = buildCanonicalIndex(
  Object.values(pthgssSetdex).flatMap(sets => Object.values(sets).map(set => set.item)),
)
const canonicalMoves = buildCanonicalIndex(Object.keys(pthgssMoves))

function canonicalizeItem(value) {
  if (!value || value === 'None' || value === 'N/A') return ''
  return canonicalItems.get(normalizedKey(value)) ?? value
}

function canonicalizeMove(value) {
  if (!value || value === 'N/A') return ''
  const overridden = MOVE_NAME_OVERRIDES[value] ?? value
  return canonicalMoves.get(normalizedKey(overridden)) ?? overridden
}

function normalizedEvs(evs) {
  return evs.map(value => value === 255 ? 252 : value)
}

function comparisonSpecies(value) {
  return normalizedKey(value.replace(/\s+\(Plant\)$/, ''))
}

function setSignature(set) {
  return JSON.stringify([
    comparisonSpecies(set.species),
    normalizedKey(set.item),
    set.moves.filter(Boolean).map(canonicalizeMove).map(normalizedKey).sort(),
    normalizedEvs(set.evs),
  ])
}

function setCoreSignature(set) {
  return JSON.stringify([
    comparisonSpecies(set.species),
    normalizedKey(set.item),
    set.moves.filter(Boolean).map(canonicalizeMove).map(normalizedKey).sort(),
  ])
}

function parseBulbapediaSets(raw) {
  const sets = []

  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('{{lop/facility|')) continue
    const fields = line
      .slice(2, -2)
      .split('|')
      .filter((field, index) => index === 0 || !/^[a-z][a-z0-9]*=/i.test(field))

    assert(fields.length === 19, `Unexpected Bulbapedia set field count: ${fields.length}`)
    sets.push({
      number: Number(fields[1]),
      species: fields[2],
      item: canonicalizeItem(fields[3]),
      moves: [fields[4], fields[6], fields[8], fields[10]].map(canonicalizeMove),
      nature: fields[12],
      evs: fields.slice(13, 19).map(value => Number(value) || 0),
    })
  }

  return sets
}

function speciesFromAltLabel(label) {
  return label
    .replace(/-\d+(?=\s*\(|$)/, '')
    .replace(/\s+\(Plant\)$/, '')
}

function parseAltissimoSets(html) {
  const document = new JSDOM(html).window.document
  const sets = []

  for (const table of document.querySelectorAll('table')) {
    const caption = table.querySelector('caption')?.textContent.trim() ?? ''
    if (!/^(Low|Mid|High|Legendary) Tier/.test(caption)) continue

    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children]
      if (cells.length !== 14 || cells[0].getAttribute('rowspan') !== '2') continue
      const text = cells.map(cell => cell.textContent.trim().replace(/\s+/g, ' '))
      const label = text[2]

      sets.push({
        label,
        species: speciesFromAltLabel(label),
        item: canonicalizeItem(text[3]),
        moves: text.slice(4, 8).map(canonicalizeMove),
        evs: text.slice(8, 14).map(Number),
      })
    }
  }

  return sets
}

function joinSetSources(bulbapediaSets, altissimoSets) {
  assert(bulbapediaSets.length === 950, `Expected 950 Bulbapedia sets, found ${bulbapediaSets.length}`)
  assert(altissimoSets.length === 950, `Expected 950 Altissimo sets, found ${altissimoSets.length}`)

  const bulbapediaBySignature = new Map()
  for (const set of bulbapediaSets) {
    const signature = setSignature(set)
    const matches = bulbapediaBySignature.get(signature) ?? []
    matches.push(set)
    bulbapediaBySignature.set(signature, matches)
  }

  const labels = new Set()
  return altissimoSets.map(altissimoSet => {
    const matches = bulbapediaBySignature.get(setSignature(altissimoSet)) ?? []
    assert(matches.length === 1, `Expected one Bulbapedia match for ${altissimoSet.label}, found ${matches.length}`)
    assert(!labels.has(altissimoSet.label), `Duplicate Altissimo label: ${altissimoSet.label}`)
    labels.add(altissimoSet.label)

    const bulbapediaSet = matches[0]
    return {
      species: bulbapediaSet.species,
      label: altissimoSet.label,
      item: bulbapediaSet.item,
      moves: bulbapediaSet.moves,
      nature: bulbapediaSet.nature,
      evs: altissimoSet.evs,
    }
  })
}

function expectedTrainerData(number) {
  if (number <= 100) return { ivs: 3, ranges: ['1-6', '8-13'], coarse: [0, 1] }
  if (number <= 120) return { ivs: 6, ranges: ['7', '8-13', '15-20'], coarse: [0, 1, 2] }
  if (number <= 140) return { ivs: 9, ranges: ['14', '15-20', '22-27'], coarse: [1, 2, 3] }
  if (number <= 160) return { ivs: 12, ranges: ['21', '22-27', '29-34'], coarse: [2, 3, 4] }
  if (number <= 180) return { ivs: 15, ranges: ['28', '29-34', '36-41'], coarse: [3, 4, 5] }
  if (number <= 200) return { ivs: 18, ranges: ['35', '36-41', '43-48'], coarse: [4, 5, 6] }
  if (number <= 220) return { ivs: 21, ranges: ['42', '43-48', '50+'], coarse: [5, 6, 7] }
  return { ivs: 31, ranges: ['49', '50+'], coarse: [6, 7] }
}

function parseBulbapediaTrainers(raw) {
  const rows = raw
    .split(/(?=\|-style='background:#fff')/)
    .filter(block => block.startsWith("|-style='background:#fff'"))
  const trainers = []

  for (const row of rows) {
    const lines = row.split(/\r?\n/).map(line => line.trim())
    const number = Number(lines.find(line => /^\|\d{3}$/.test(line))?.slice(1))
    const trainerClass = lines
      .find(line => line.startsWith('|{{tc|'))
      ?.match(/\{\{tc\|([^}]+)\}\}/)?.[1]
    const name = lines
      .find(line => line.startsWith('|[['))
      ?.match(/\|([^|\]]+)\]\]$/)?.[1]
    const marks = lines.filter(line => line.startsWith('!')).slice(0, 8).map(line => line.includes('✔'))

    assert(number && trainerClass && name && marks.length === 8, `Unable to parse Bulbapedia trainer row ${number}`)
    const expected = expectedTrainerData(number)
    const markedIndexes = marks.flatMap((marked, index) => marked ? [index] : [])
    assert(
      JSON.stringify(markedIndexes) === JSON.stringify(expected.coarse),
      `Bulbapedia appearance mismatch for trainer ${number} ${name}`,
    )

    trainers.push({
      number,
      class: trainerClass,
      name,
      ivs: expected.ivs,
      battleRanges: expected.ranges,
    })
  }

  assert(trainers.length === 300, `Expected 300 Bulbapedia trainers, found ${trainers.length}`)
  assert(new Set(trainers.map(trainer => trainer.name)).size === 300, 'Trainer names must be unique')
  return trainers
}

function nextElementOfType(element, tagName) {
  let next = element.nextElementSibling
  while (next && next.tagName !== tagName) next = next.nextElementSibling
  return next
}

function expandRosterLabel(text, knownLabels) {
  if (knownLabels.has(text)) return [text]
  const match = text.match(/^(.+?)-(\d+(?:,\s*\d+)*)$/)
  if (!match) return []

  return match[2].split(',').map(number => {
    const label = `${match[1]}-${number.trim()}`
    assert(knownLabels.has(label), `Unknown roster label: ${label}`)
    return label
  })
}

function labelsFromRosterTable(table, knownLabels) {
  const labels = []
  for (const cell of table.querySelectorAll('td')) {
    const text = cell.textContent.trim().replace(/\s+/g, ' ')
    if (!text) continue
    labels.push(...expandRosterLabel(text, knownLabels))
  }
  assert(labels.length > 0, 'Roster table did not contain any known set labels')
  return labels
}

function canonicalAltIdentity(identity) {
  const expandedClass = identity
    .replace(/^PKMN Ranger /, 'Pokémon Ranger ')
    .replace(/^PKMN Breeder /, 'Pokémon Breeder ')
  return TRAINER_IDENTITY_ALIASES[expandedClass] ?? expandedClass
}

function validateAltissimoProgression(document) {
  const table = [...document.querySelectorAll('table')].find(candidate =>
    candidate.textContent.includes('Trainer Group(s)') && candidate.textContent.includes('Pokémon Set(s)'),
  )
  assert(table, 'Missing Altissimo trainer progression table')

  const actual = [...table.querySelectorAll('tbody tr')].map(row =>
    [...row.children].slice(0, 2).map(cell => cell.textContent.trim().replace(/\s+/g, ' ')),
  )
  const expected = [
    ['1-6', '1-100'],
    ['7', '101-120'],
    ['8-13', '1-100 or 101-120'],
    ['14', '121-140'],
    ['15-20', '101-120 or 121-140'],
    ['21', '141-160'],
    ['22-27', '121-140 or 141-160'],
    ['28', '161-180'],
    ['29-34', '141-160 or 161-180'],
    ['35', '181-200'],
    ['36-41', '161-180 or 181-200'],
    ['42', '201-220'],
    ['43-48', '181-200 or 201-220'],
    ['49', '221-300'],
    ['50+', '201-220 or 221-300'],
  ]
  assert(JSON.stringify(actual) === JSON.stringify(expected), 'Altissimo trainer progression changed')
}

function parseAltissimoTrainerRosters(html, trainers, sets) {
  const document = new JSDOM(html).window.document
  validateAltissimoProgression(document)

  const knownLabels = new Set(sets.map(set => set.label))
  const trainerByIdentity = new Map(trainers.map(trainer => [`${trainer.class} ${trainer.name}`, trainer]))
  const trainerPokemon = {}
  let rosterCount = 0
  let assignmentCount = 0

  for (const heading of document.querySelectorAll('h4')) {
    if (!/^Roster \d+$/.test(heading.textContent.trim())) continue
    const table = nextElementOfType(heading, 'TABLE')
    const list = nextElementOfType(table, 'UL')
    assert(table && list, `Missing table or trainer list for ${heading.textContent.trim()}`)

    const labels = labelsFromRosterTable(table, knownLabels)
    rosterCount += 1
    for (const item of list.querySelectorAll(':scope > li')) {
      const altIdentity = item.textContent.trim().replace(/\s+/g, ' ')
      const identity = canonicalAltIdentity(altIdentity)
      const trainer = trainerByIdentity.get(identity)
      assert(trainer, `Altissimo trainer does not match Bulbapedia: ${altIdentity}`)
      assert(!trainerPokemon[trainer.name], `Trainer assigned to multiple rosters: ${identity}`)
      trainerPokemon[trainer.name] = labels
      assignmentCount += 1
    }
  }

  assert(rosterCount === 77, `Expected 77 Altissimo rosters, found ${rosterCount}`)
  assert(assignmentCount === 300, `Expected 300 trainer roster assignments, found ${assignmentCount}`)
  assert(Object.keys(trainerPokemon).length === 300, 'Every standard trainer must have one roster')

  const miraHeading = [...document.querySelectorAll('h4')].find(heading => heading.textContent.trim() === 'Mira')
  const miraTable = nextElementOfType(miraHeading, 'TABLE')
  const miraLabels = labelsFromRosterTable(miraTable, knownLabels)
  assert(miraLabels.length === 56, `Expected 56 Mira sets, found ${miraLabels.length}`)

  return { trainerPokemon, miraLabels }
}

function parsePalmerSets(html, ordinarySets) {
  const document = new JSDOM(html).window.document
  const ordinaryBySignature = new Map(ordinarySets.map(set => [setSignature(set), set]))
  const ordinaryByCoreSignature = new Map()
  for (const set of ordinarySets) {
    const signature = setCoreSignature(set)
    const matches = ordinaryByCoreSignature.get(signature) ?? []
    matches.push(set)
    ordinaryByCoreSignature.set(signature, matches)
  }
  const sets = []
  const rosters = {}

  for (const [captionText, suffix] of [['Palmer Battle (1st)', 'Silver'], ['Palmer Battle (2nd)', 'Gold']]) {
    const table = [...document.querySelectorAll('table')].find(candidate =>
      candidate.querySelector('caption')?.textContent.trim() === captionText,
    )
    assert(table, `Missing ${captionText}`)
    const labels = []

    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children]
      if (cells.length !== 13 || cells[0].getAttribute('rowspan') !== '2') continue
      const text = cells.map(cell => cell.textContent.trim().replace(/\s+/g, ' '))
      const palmerSet = {
        species: text[1],
        item: canonicalizeItem(text[2]),
        moves: text.slice(3, 7).map(canonicalizeMove),
        evs: text.slice(7, 13).map(Number),
      }
      const exactMatch = ordinaryBySignature.get(setSignature(palmerSet))
      const coreMatches = ordinaryByCoreSignature.get(setCoreSignature(palmerSet)) ?? []
      const natureSource = exactMatch ?? (coreMatches.length === 1 ? coreMatches[0] : null)
      assert(natureSource, `Palmer set does not match the ordinary table: ${palmerSet.species}`)

      const label = `${palmerSet.species} (Palmer ${suffix})`
      sets.push({ ...palmerSet, nature: natureSource.nature, label })
      labels.push(label)
    }

    assert(labels.length === 3, `Expected three ${suffix} Palmer sets, found ${labels.length}`)
    rosters[`Palmer (${suffix})`] = labels
  }

  return { sets, rosters }
}

function buildSetdex(sets) {
  const setdex = {}
  for (const set of sets) {
    const evs = {}
    set.evs.forEach((value, index) => {
      if (value) evs[STAT_KEYS[index]] = value
    })
    setdex[set.species] ??= {}
    setdex[set.species][set.label] = {
      evs,
      moves: set.moves,
      nature: set.nature,
      item: set.item,
    }
  }
  return setdex
}

function buildMiraTeamData(miraLabels, setByLabel) {
  const teamData = {}
  for (const label of miraLabels) {
    const source = setByLabel.get(label)
    assert(source, `Missing Mira source set: ${label}`)
    const partnerLabel = `${label} (Mira DP)`
    teamData[source.species] ??= {}
    teamData[source.species][partnerLabel] = {
      evs: Object.fromEntries(source.evs.flatMap((value, index) => value ? [[STAT_KEYS[index], value]] : [])),
      moves: source.moves,
      nature: source.nature,
      item: source.item,
    }
  }
  return teamData
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(OUT_DIR, filename), `${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const [
    bulbapediaTrainerRaw,
    bulbapediaGroup1Raw,
    bulbapediaGroup2Raw,
    altissimoPokemonHtml,
    altissimoTrainerHtml,
    altissimoTowerHtml,
  ] = await Promise.all([
    fetchText(BULBA_TRAINERS_RAW),
    fetchText(BULBA_GROUP_1_RAW),
    fetchText(BULBA_GROUP_2_RAW),
    fetchText(ALTISSIMO_POKEMON),
    fetchText(ALTISSIMO_TRAINERS),
    fetchText(ALTISSIMO_TOWER),
  ])

  const ordinarySets = joinSetSources(
    parseBulbapediaSets(`${bulbapediaGroup1Raw}\n${bulbapediaGroup2Raw}`),
    parseAltissimoSets(altissimoPokemonHtml),
  )
  const trainers = parseBulbapediaTrainers(bulbapediaTrainerRaw)
  const { trainerPokemon, miraLabels } = parseAltissimoTrainerRosters(
    altissimoTrainerHtml,
    trainers,
    ordinarySets,
  )
  const palmer = parsePalmerSets(altissimoTowerHtml, ordinarySets)
  const allSets = [...ordinarySets, ...palmer.sets]
  const setByLabel = new Map(ordinarySets.map(set => [set.label, set]))
  const moves = { ...pthgssMoves, ...EXTRA_MOVES }

  for (const set of allSets) {
    for (const move of set.moves.filter(Boolean)) {
      assert(moves[move], `Missing Gen 4 move data for ${move}`)
    }
  }

  const battleTrainers = [
    ...trainers,
    { number: 9001, class: 'Tower Tycoon', name: 'Palmer (Silver)', ivs: 31, battleRanges: ['21'], boss: 'singles' },
    { number: 9002, class: 'Tower Tycoon', name: 'Palmer (Gold)', ivs: 31, battleRanges: ['49'], boss: 'singles' },
  ]
  const allTrainerPokemon = { ...trainerPokemon, ...palmer.rosters }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  writeJson('battle_trainers_dp.json', battleTrainers)
  writeJson('trainer_pokemon_dp.json', allTrainerPokemon)
  writeJson('setdex_dp.json', buildSetdex(allSets))
  writeJson('moves_dp.json', moves)
  writeJson('setteam_dp_partners.json', buildMiraTeamData(miraLabels, setByLabel))

  console.log('Validated 950 ordinary sets, 6 Palmer sets, 77 rosters, and 300 standard trainers.')
  console.log(`Wrote Diamond/Pearl Battle Tower data to ${OUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
