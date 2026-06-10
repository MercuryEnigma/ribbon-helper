/**
 * Generate Ruby/Sapphire Battle Tower data and cross-check Bulbapedia against
 * Altissimo's tables.
 *
 * Usage: node src/damage-calc/_scripts/generate_rs_battle_tower_data.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '../../data/battle-facilities/rs')
const EMERALD_MOVES_PATH = path.join(__dirname, '../../data/battle-facilities/emerald/moves_em.json')

const BULBA_TRAINERS_RAW = 'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Ruby_and_Sapphire&action=raw'
const BULBA_POKEMON_RAW = 'https://bulbapedia.bulbagarden.net/w/index.php?title=List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Ruby_and_Sapphire&action=raw'
const BULBA_API = 'https://bulbapedia.bulbagarden.net/w/api.php'
const ALTISSIMO_TRAINERS = 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-trainers.html'
const ALTISSIMO_POKEMON = 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-pokemon.html'

const STAT_KEYS = ['hp', 'at', 'df', 'sa', 'sd', 'sp']

const MOVE_NAME_MAP = {
  AncientPower: 'Ancient Power',
  BubbleBeam: 'Bubble Beam',
  DoubleSlap: 'Double Slap',
  DragonBreath: 'Dragon Breath',
  DynamicPunch: 'Dynamic Punch',
  ExtremeSpeed: 'Extreme Speed',
  'Faint Attack': 'Feint Attack',
  FeatherDance: 'Feather Dance',
  GrassWhistle: 'Grass Whistle',
  PoisonPowder: 'Poison Powder',
  'Sand-Attack': 'Sand Attack',
  Selfdestruct: 'Self-Destruct',
  SmokeScreen: 'Smokescreen',
  Softboiled: 'Soft-Boiled',
  Solarbeam: 'Solar Beam',
  SolarBeam: 'Solar Beam',
  SonicBoom: 'Sonic Boom',
  ThunderPunch: 'Thunder Punch',
  ThunderShock: 'Thunder Shock',
  ViceGrip: 'Vise Grip',
}

const ITEM_NAME_MAP = {
  BlackGlasses: 'Black Glasses',
  BrightPowder: 'Bright Powder',
  NeverMeltIce: 'Never-Melt Ice',
  SilverPowder: 'Silver Powder',
  TwistedSpoon: 'Twisted Spoon',
}

// These moves do not occur in Emerald's facility setdex, so moves_em.json does
// not include them even though they can occur in the Ruby/Sapphire Tower.
const EXTRA_MOVES = {
  Absorb: { bp: 20, type: 'Grass', category: 'Special', acc: 100 },
  'Arm Thrust': { bp: 15, type: 'Fighting', category: 'Physical', makesContact: true, maxMultiHits: 5, acc: 100 },
  Assist: { bp: 0, type: 'Normal' },
  Bubble: { bp: 20, type: 'Water', category: 'Special', hasSecondaryEffect: true, acc: 100 },
  Constrict: { bp: 10, type: 'Normal', category: 'Physical', makesContact: true, hasSecondaryEffect: true, acc: 100 },
  Cut: { bp: 50, type: 'Normal', category: 'Physical', makesContact: true, acc: 95 },
  'Double Slap': { bp: 15, type: 'Normal', category: 'Physical', makesContact: true, maxMultiHits: 5, acc: 85 },
  'Fury Attack': { bp: 15, type: 'Normal', category: 'Physical', maxMultiHits: 5, acc: 85 },
  Harden: { bp: 0, type: 'Normal' },
  'Hidden Power': { bp: 70, type: 'Normal', category: 'Special', acc: 100 },
  'Horn Attack': { bp: 65, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Howl: { bp: 0, type: 'Normal' },
  Meditate: { bp: 0, type: 'Psychic' },
  'Mud Sport': { bp: 0, type: 'Ground' },
  'Poison Gas': { bp: 0, type: 'Poison' },
  'Poison Sting': { bp: 15, type: 'Poison', category: 'Physical', hasSecondaryEffect: true, acc: 100 },
  Pound: { bp: 40, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Rage: { bp: 20, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Scratch: { bp: 40, type: 'Normal', category: 'Physical', makesContact: true, acc: 100 },
  Smog: { bp: 20, type: 'Poison', category: 'Special', hasSecondaryEffect: true, acc: 70 },
  Smokescreen: { bp: 0, type: 'Normal' },
  Supersonic: { bp: 0, type: 'Normal', isSound: true },
  'Sweet Scent': { bp: 0, type: 'Normal' },
  'Water Sport': { bp: 0, type: 'Water' },
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

function normalizeMoveName(name) {
  return MOVE_NAME_MAP[name] ?? name
}

function normalizeItemName(name) {
  if (!name || name === 'None' || name === 'N/A') return ''
  return ITEM_NAME_MAP[name] ?? name
}

function comparisonText(value) {
  return normalizeItemName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^visegrip$/, 'vicegrip')
}

function normalizedEvs(evs) {
  return evs.map(value => value === 255 ? 252 : value)
}

function setSignature(set) {
  return JSON.stringify([
    set.level,
    comparisonText(set.species),
    comparisonText(set.item),
    set.moves.map(normalizeMoveName).map(comparisonText).sort(),
    normalizedEvs(set.evs),
  ])
}

function parseTemplateEvs(fields) {
  return fields.slice(14, 20).map(value => {
    if (!value || value.includes('=')) return 0
    const parsed = Number(value.match(/^\d+/)?.[0])
    return Number.isFinite(parsed) ? parsed : 0
  })
}

function parseBulbapediaSets(raw) {
  const sets = []
  let level = 0

  for (const line of raw.split(/\r?\n/)) {
    if (line === '==Level 50==') level = 50
    if (line === '==Level 100==') level = 100
    if (!line.startsWith('{{lop/facility|')) continue

    const fields = line.split('|')
    sets.push({
      level,
      species: fields[3],
      item: normalizeItemName(fields[4]),
      moves: [fields[5], fields[7], fields[9], fields[11]].map(normalizeMoveName),
      nature: fields[13],
      evs: parseTemplateEvs(fields),
    })
  }

  return sets
}

function parseAltissimoSets(html) {
  const document = new JSDOM(html).window.document
  const sets = []

  for (const table of document.querySelectorAll('table[data-level]')) {
    const level = Number(table.dataset.level)
    for (const labelCell of table.querySelectorAll('td[data-species]')) {
      const row = labelCell.parentElement
      const cells = [...row.children]
      const labelIndex = cells.indexOf(labelCell)
      const text = cells.map(cell => cell.textContent.trim().replace(/\s+/g, ' '))
      const label = labelCell.textContent.trim()

      sets.push({
        level,
        label,
        species: label.replace(/-\d+$/, ''),
        item: normalizeItemName(text[labelIndex + 1]),
        moves: text.slice(labelIndex + 2, labelIndex + 6).map(normalizeMoveName),
        evs: text.slice(labelIndex + 6, labelIndex + 12).map(Number),
      })
    }
  }

  return sets
}

function joinSetSources(bulbapediaSets, altissimoSets) {
  assert(bulbapediaSets.length === 600, `Expected 600 Bulbapedia sets, found ${bulbapediaSets.length}`)
  assert(altissimoSets.length === 600, `Expected 600 Altissimo sets, found ${altissimoSets.length}`)

  const bulbapediaBySignature = new Map()
  for (const set of bulbapediaSets) {
    const signature = setSignature(set)
    assert(!bulbapediaBySignature.has(signature), `Duplicate Bulbapedia set signature: ${signature}`)
    bulbapediaBySignature.set(signature, set)
  }

  return altissimoSets.map(altissimoSet => {
    const bulbapediaSet = bulbapediaBySignature.get(setSignature(altissimoSet))
    assert(bulbapediaSet, `Altissimo set does not match Bulbapedia: ${altissimoSet.level} ${altissimoSet.label}`)

    return {
      ...altissimoSet,
      item: bulbapediaSet.item,
      moves: bulbapediaSet.moves,
      nature: bulbapediaSet.nature,
    }
  })
}

function parseAltissimoTrainerRosters(html) {
  const document = new JSDOM(html).window.document
  const rosters = {}

  for (const level of [50, 100]) {
    const root = document.querySelector(`#lv${level}`)
    assert(root, `Missing Altissimo Level ${level} trainer section`)

    for (const heading of root.querySelectorAll('h4')) {
      if (!/^Roster \d+/.test(heading.textContent.trim())) continue

      let table = heading.nextElementSibling
      while (table && table.tagName !== 'TABLE' && !/^H[34]$/.test(table.tagName)) {
        table = table.nextElementSibling
      }
      if (!table || table.tagName !== 'TABLE') continue

      const labels = []
      for (const cell of table.querySelectorAll('td')) {
        const text = cell.textContent.trim().replace(/\s+/g, ' ')
        const match = text.match(/^([A-Za-z.' -]+)-(\d+(?:,\s*\d+)*)$/)
        if (!match) continue
        for (const setNumber of match[2].split(',').map(value => value.trim())) {
          labels.push(`${match[1]}-${setNumber}`)
        }
      }

      let trainerList = table.nextElementSibling
      while (trainerList && trainerList.tagName !== 'UL' && !/^H[34]$/.test(trainerList.tagName)) {
        trainerList = trainerList.nextElementSibling
      }
      if (!trainerList || trainerList.tagName !== 'UL') continue

      for (const listItem of trainerList.querySelectorAll(':scope > li')) {
        const fullName = listItem.textContent.trim().replace(/\s+/g, ' ')
        const trainerName = fullName.split(' ').at(-1)
        rosters[`${level}:${trainerName}`] = [...labels].sort()
      }
    }
  }

  assert(Object.keys(rosters).length === 200, `Expected 200 Altissimo trainer-mode rosters, found ${Object.keys(rosters).length}`)
  return rosters
}

function trainerNamesFromHeading(heading) {
  return heading
    .replace(/, and /g, ', ')
    .replace(/ and /g, ', ')
    .split(',')
    .map(name => name.trim())
}

function parseBulbapediaTrainerRosters(classPages, setLabelBySignature) {
  const rosters = {}

  for (const raw of classPages) {
    for (const section of raw.split(/(?=^===)/m)) {
      const heading = section.match(/^===([^\n]+?) \(Lv\.(50|100) Mode\)===/m)
      if (!heading) continue

      const level = Number(heading[2])
      const labels = []

      for (const line of section.split(/\r?\n/)) {
        if (!line.startsWith('{{lop/facility|')) continue
        const fields = line.split('|')
        const set = {
          level,
          species: fields[3],
          item: normalizeItemName(fields[4]),
          moves: [fields[5], fields[7], fields[9], fields[11]].map(normalizeMoveName),
          evs: parseTemplateEvs(fields),
        }
        const label = setLabelBySignature.get(setSignature(set))
        assert(label, `Trainer set does not match the consolidated tables: ${level} ${set.species}`)
        labels.push(label)
      }

      for (const trainerName of trainerNamesFromHeading(heading[1])) {
        rosters[`${level}:${trainerName}`] = [...labels].sort()
      }
    }
  }

  assert(Object.keys(rosters).length === 200, `Expected 200 Bulbapedia trainer-mode rosters, found ${Object.keys(rosters).length}`)
  return rosters
}

function parseBulbapediaTrainers(raw) {
  const rangeLabels = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+']
  const trainers = []

  for (const block of raw.split('|- style=background:#fff').slice(1)) {
    const lines = block.split(/\r?\n/).map(line => line.trim())
    const numberLine = lines.find(line => /^\| \d{3}$/.test(line))
    if (!numberLine) continue

    const number = Number(numberLine.slice(2))
    const classLineIndex = lines.findIndex(line => line.includes('{{tc|'))
    const trainerClass = lines[classLineIndex]?.match(/\{\{tc\|([^}]+)\}\}/)?.[1]
    const name = lines[classLineIndex + 1]?.replace(/^\| /, '')
    const ivLineIndex = lines.findIndex(line => /^\| (6|9|12|15|18|21|31)$/.test(line))
    const ivs = Number(lines[ivLineIndex].slice(2))
    const availability = lines.slice(ivLineIndex + 1, ivLineIndex + 9)
    const battleRanges = []

    availability.forEach((cell, index) => {
      const range = rangeLabels[index]
      if (cell.includes('ruby color')) {
        battleRanges.push(range.includes('-') ? range.split('-')[1] : range)
      } else if (cell.includes('sapphire color')) {
        if (range === '50+') {
          battleRanges.push('49+')
        } else {
          const [start, end] = range.split('-').map(Number)
          battleRanges.push(`${start}-${end - 1}`)
        }
      }
    })

    assert(trainerClass && name && ivs, `Unable to parse trainer ${number}`)
    trainers.push({ number, class: trainerClass, name, ivs, battleRanges })
  }

  assert(trainers.length === 100, `Expected 100 trainers, found ${trainers.length}`)
  return trainers
}

function expectedTrainerData(number) {
  if (number <= 10) return { ivs: 6, ranges: ['1-6'] }
  if (number <= 20) return { ivs: 6, ranges: ['1-6', '8-13'] }
  if (number <= 30) return { ivs: 9, ranges: ['7', '8-13', '15-20'] }
  if (number <= 40) return { ivs: 12, ranges: ['14', '15-20', '22-27'] }
  if (number <= 50) return { ivs: 15, ranges: ['21', '22-27', '29-34'] }
  if (number <= 60) return { ivs: 18, ranges: ['28', '29-34', '36-41'] }
  if (number <= 70) return { ivs: 21, ranges: ['35', '36-41', '43-48'] }
  if (number <= 80) return { ivs: 31, ranges: ['42', '43-48', '49+'] }
  return { ivs: 31, ranges: ['43-48', '49+'] }
}

function validateTrainerAppearances(trainers) {
  for (const trainer of trainers) {
    const expected = expectedTrainerData(trainer.number)
    assert(trainer.ivs === expected.ivs, `IV mismatch for trainer ${trainer.number} ${trainer.name}`)
    assert(
      JSON.stringify(trainer.battleRanges) === JSON.stringify(expected.ranges),
      `Battle appearance mismatch for trainer ${trainer.number} ${trainer.name}`,
    )
  }
}

function validateRosters(altissimoRosters, bulbapediaRosters) {
  for (const [key, altissimoLabels] of Object.entries(altissimoRosters)) {
    const bulbapediaLabels = bulbapediaRosters[key]
    assert(bulbapediaLabels, `Missing Bulbapedia roster for ${key}`)
    assert(
      JSON.stringify(altissimoLabels) === JSON.stringify(bulbapediaLabels),
      `Trainer roster mismatch for ${key}`,
    )
  }
}

function buildSetdex(sets, level) {
  const setdex = {}
  for (const set of sets.filter(entry => entry.level === level)) {
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

function buildTrainerPokemon(rosters, level) {
  const result = {}
  for (const [key, labels] of Object.entries(rosters)) {
    if (!key.startsWith(`${level}:`)) continue
    result[key.slice(key.indexOf(':') + 1)] = labels
  }
  return result
}

async function fetchBulbapediaClassPages(mainTrainerRaw) {
  const titles = [...new Set(
    [...mainTrainerRaw.matchAll(/\[\[(List of Battle Tower Trainers in Pokémon Ruby and Sapphire\/[^#|\]]+)/g)]
      .map(match => match[1]),
  )].sort()
  const pages = []

  for (let index = 0; index < titles.length; index += 20) {
    const params = new URLSearchParams({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: titles.slice(index, index + 20).join('|'),
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const response = JSON.parse(await fetchText(`${BULBA_API}?${params}`))
    for (const page of response.query.pages) {
      pages.push(page.revisions[0].slots.main.content)
    }
  }

  assert(pages.length === 37, `Expected 37 Bulbapedia trainer class pages, found ${pages.length}`)
  return pages
}

function writeJson(filename, value) {
  fs.writeFileSync(path.join(OUT_DIR, filename), `${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const [bulbaTrainerRaw, bulbaPokemonRaw, altissimoTrainerHtml, altissimoPokemonHtml] = await Promise.all([
    fetchText(BULBA_TRAINERS_RAW),
    fetchText(BULBA_POKEMON_RAW),
    fetchText(ALTISSIMO_TRAINERS),
    fetchText(ALTISSIMO_POKEMON),
  ])
  const classPages = await fetchBulbapediaClassPages(bulbaTrainerRaw)

  const sets = joinSetSources(
    parseBulbapediaSets(bulbaPokemonRaw),
    parseAltissimoSets(altissimoPokemonHtml),
  )
  const setLabelBySignature = new Map(sets.map(set => [setSignature(set), set.label]))
  const altissimoRosters = parseAltissimoTrainerRosters(altissimoTrainerHtml)
  const bulbapediaRosters = parseBulbapediaTrainerRosters(classPages, setLabelBySignature)
  const trainers = parseBulbapediaTrainers(bulbaTrainerRaw)

  validateRosters(altissimoRosters, bulbapediaRosters)
  validateTrainerAppearances(trainers)

  const moves = {
    ...JSON.parse(fs.readFileSync(EMERALD_MOVES_PATH, 'utf8')),
    ...EXTRA_MOVES,
  }
  for (const set of sets) {
    for (const move of set.moves.filter(Boolean)) {
      assert(moves[move], `Missing Gen 3 move data for ${move}`)
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  writeJson('battle_trainers_rs.json', trainers)
  writeJson('trainer_pokemon_lvl50_rs.json', buildTrainerPokemon(altissimoRosters, 50))
  writeJson('trainer_pokemon_lvl100_rs.json', buildTrainerPokemon(altissimoRosters, 100))
  writeJson('setdex_lvl50_rs.json', buildSetdex(sets, 50))
  writeJson('setdex_lvl100_rs.json', buildSetdex(sets, 100))
  writeJson('moves_rs.json', moves)

  console.log('Validated 600 sets, 200 trainer-mode rosters, and 100 trainer appearance/IV records.')
  console.log(`Wrote Ruby/Sapphire Battle Tower data to ${OUT_DIR}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
