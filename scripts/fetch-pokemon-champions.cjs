#!/usr/bin/env node
// Scrapes Serebii for Pokémon Champions regulation rosters.
//
// Outputs:
//   src/data/pokemon_champions.json  — regulation slug → [pokemon key, ...]
//
// Usage: node scripts/fetch-pokemon-champions.cjs

const fs = require('fs')
const path = require('path')

const REGULATIONS = {
  'regulation-m-a': 'https://www.serebii.net/pokemonchampions/recruit/regularrosterm-a.shtml',
  'global-challenge-2026': 'https://www.serebii.net/pokemonchampions/recruit/regularrosterm-a.shtml',
}

const OUT_PATH = path.join(__dirname, '../src/data/pokemon_champions.json')
const POKEMON_DB_PATH = path.join(__dirname, '../src/data/pokemon.json')

// Serebii image suffix → pokemon.json key region suffix
const SUFFIX_TO_REGION = {
  a: '-alola',
  h: '-hisui',
  g: '-galar',
  p: '-paldea',
}

// Manual overrides: Serebii display name (lowercased) → pokemon.json key
// Add entries here when automatic resolution fails.
const MANUAL_OVERRIDES = {
  'sinistcha (masterpiece form)': 'sinistcha',
  // Alcremie cream variants are purely cosmetic — all map to base alcremie key
  'alcremie (ruby cream)': 'alcremie',
  'alcremie (matcha cream)': 'alcremie',
  'alcremie (mint cream)': 'alcremie',
  'alcremie (lemon cream)': 'alcremie',
  'alcremie (salted cream)': 'alcremie',
  'alcremie (ruby swirl)': 'alcremie',
  'alcremie (caramel swirl)': 'alcremie',
  'alcremie (rainbow swirl)': 'alcremie',
}

// ──────────────────────────────────────────────
// Build natdex lookup from pokemon.json
// ──────────────────────────────────────────────

function buildNatdexLookup(db) {
  const lookup = {} // natdex -> [key, ...]
  for (const [key, data] of Object.entries(db)) {
    let natdex = data.natdex
    if (!natdex && data['data-source']) natdex = db[data['data-source']]?.natdex
    if (!natdex) continue
    if (!lookup[natdex]) lookup[natdex] = []
    lookup[natdex].push(key)
  }
  return lookup
}

// ──────────────────────────────────────────────
// Resolve a Serebii entry to a pokemon.json key
// ──────────────────────────────────────────────

function resolveKey(natdex, suffix, displayName, natdexLookup, db) {
  const lowerDisplay = displayName.toLowerCase()

  // Check manual overrides first
  if (MANUAL_OVERRIDES[lowerDisplay]) {
    return MANUAL_OVERRIDES[lowerDisplay]
  }

  const candidates = natdexLookup[natdex] || []

  if (candidates.length === 0) {
    return null
  }

  // No suffix: prefer the base key (no regional/form suffix)
  if (!suffix) {
    const base = candidates.find(k => !k.includes('-') || !k.match(/-(?:alola|hisui|galar|paldea|blaze|combat|aqua|bloodmoon|eternal)/))
    return base || candidates[0]
  }

  // Map suffix to region string
  const regionSuffix = SUFFIX_TO_REGION[suffix]

  if (regionSuffix) {
    const regionMatches = candidates.filter(k => k.includes(regionSuffix))

    if (regionMatches.length === 1) return regionMatches[0]

    if (regionMatches.length > 1) {
      // Disambiguate using the parenthetical in the display name
      // e.g. "Paldean Tauros (Blaze Breed)" → "blaze"
      const parenMatch = lowerDisplay.match(/\(([^)]+)\)/)
      if (parenMatch) {
        const hint = parenMatch[1] // e.g. "blaze breed"
        const hintWord = hint.split(/\s+/)[0] // e.g. "blaze"
        const hintMatch = regionMatches.find(k => k.includes(hintWord))
        if (hintMatch) return hintMatch

        // Also try matching against forms.en in the db
        const formMatch = regionMatches.find(k => {
          const formName = db[k]?.forms?.en?.toLowerCase() || ''
          return formName.includes(hintWord)
        })
        if (formMatch) return formMatch
      }

      // Fall back to first match and warn
      console.warn(`  WARN: multiple matches for natdex ${natdex} suffix "${suffix}" display "${displayName}": ${regionMatches.join(', ')} — using ${regionMatches[0]}`)
      return regionMatches[0]
    }
  }

  // Unknown suffix (e.g. '-m' for masterpiece): fall back to display-name hint
  const hintMatch = candidates.find(k => {
    const formName = db[k]?.forms?.en?.toLowerCase() || ''
    return lowerDisplay.includes(formName) || formName.includes(suffix)
  })
  if (hintMatch) return hintMatch

  console.warn(`  WARN: unhandled suffix "${suffix}" for natdex ${natdex} display "${displayName}" — candidates: ${candidates.join(', ')}`)
  return candidates[0]
}

// ──────────────────────────────────────────────
// Parse HTML → [{natdex, suffix, displayName}]
// ──────────────────────────────────────────────

function parsePage(html) {
  const entries = []

  // Match rows that contain a pokedex-champions icon image
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  const imgRe = /\/icon\/(\d+)(-[a-z]+)?\.png/i
  const nameRe = /<u>([^<]+)<\/u>/i

  let rowMatch
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const row = rowMatch[1]

    const imgMatch = imgRe.exec(row)
    if (!imgMatch) continue

    const natdex = parseInt(imgMatch[1], 10)
    const suffix = imgMatch[2] ? imgMatch[2].slice(1) : '' // strip leading '-'

    const nameMatch = nameRe.exec(row)
    if (!nameMatch) continue

    const displayName = nameMatch[1].trim()
    entries.push({ natdex, suffix, displayName })
  }

  return entries
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────

async function main() {
  const db = JSON.parse(fs.readFileSync(POKEMON_DB_PATH, 'utf8'))
  const natdexLookup = buildNatdexLookup(db)
  const allKeys = new Set(Object.keys(db))

  const result = {}

  for (const [slug, url] of Object.entries(REGULATIONS)) {
    console.log(`\nFetching ${slug}: ${url}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    const html = await res.text()

    const entries = parsePage(html)
    console.log(`  Parsed ${entries.length} entries`)

    const keys = []
    const seen = new Set()

    for (const { natdex, suffix, displayName } of entries) {
      const key = resolveKey(natdex, suffix, displayName, natdexLookup, db)

      if (!key) {
        console.warn(`  WARN: could not resolve natdex=${natdex} suffix="${suffix}" display="${displayName}"`)
        continue
      }

      if (!allKeys.has(key)) {
        console.warn(`  WARN: resolved key "${key}" not found in pokemon.json (natdex=${natdex} display="${displayName}")`)
        continue
      }

      if (seen.has(key)) continue
      seen.add(key)
      keys.push(key)
    }

    // Sort by natdex to match codebase convention
    keys.sort((a, b) => {
      const aNatdex = db[a]?.natdex ?? db[db[a]?.['data-source']]?.natdex ?? 9999
      const bNatdex = db[b]?.natdex ?? db[db[b]?.['data-source']]?.natdex ?? 9999
      return aNatdex - bNatdex
    })

    console.log(`  Resolved ${keys.length} unique Pokémon`)
    result[slug] = keys
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2))
  console.log(`\nWrote ${OUT_PATH}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
