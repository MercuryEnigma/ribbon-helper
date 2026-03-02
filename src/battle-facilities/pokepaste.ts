import type { SetdexEntry } from './gen3calc'

export interface ParsedPokemon {
  species: string
  set: SetdexEntry
}

const STAT_MAP: Record<string, string> = {
  'HP': 'hp', 'Atk': 'at', 'Def': 'df',
  'SpA': 'sa', 'SpD': 'sd', 'Spe': 'sp',
}

export function parsePokepaste(text: string): ParsedPokemon | null {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l !== '')
  if (lines.length === 0) return null

  // Line 1: [Nickname (]Species[)] @ Item
  const firstLine = lines[0]
  let species = ''
  let item = ''

  const atIndex = firstLine.indexOf('@')
  const namePart = atIndex >= 0 ? firstLine.slice(0, atIndex).trim() : firstLine.trim()
  if (atIndex >= 0) {
    item = firstLine.slice(atIndex + 1).trim()
  }

  // Remove gender markers
  const cleaned = namePart.replace(/\s*\(M\)\s*$/, '').replace(/\s*\(F\)\s*$/, '').trim()

  // Check for nickname (Species) format
  const parenMatch = cleaned.match(/^.+\((.+)\)\s*$/)
  if (parenMatch) {
    species = parenMatch[1].trim()
  } else {
    species = cleaned
  }

  if (!species) return null

  const evs: Record<string, number> = {}
  const ivs: Record<string, number> = {}
  let nature = ''
  const moves: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('EVs:')) {
      const evStr = line.slice(4).trim()
      for (const part of evStr.split('/')) {
        const m = part.trim().match(/^(\d+)\s+(\w+)$/)
        if (m) {
          const key = STAT_MAP[m[2]]
          if (key) evs[key] = parseInt(m[1])
        }
      }
    } else if (line.startsWith('IVs:')) {
      const ivStr = line.slice(4).trim()
      for (const part of ivStr.split('/')) {
        const m = part.trim().match(/^(\d+)\s+(\w+)$/)
        if (m) {
          const key = STAT_MAP[m[2]]
          if (key) ivs[key] = parseInt(m[1])
        }
      }
    } else if (line.endsWith('Nature')) {
      nature = line.replace('Nature', '').trim()
    } else if (line.startsWith('- ')) {
      moves.push(line.slice(2).replace(/[\[\]]/g, '').trim())
    }
    // Skip Ability:, Level:, etc. — not needed for SetdexEntry
  }

  if (!nature || moves.length === 0) return null

  const set: SetdexEntry = {
    evs,
    moves,
    nature,
    item,
  }
  if (Object.keys(ivs).length > 0) {
    set.ivs = ivs
  }

  return { species, set }
}

// localStorage keys
const LS_RIBBON_MASTER = 'bf_ribbonMasterSet'
const LS_CUSTOM_SETS = 'bf_customSets'

export interface StoredSet {
  species: string
  label: string
  set: SetdexEntry
}

export function loadRibbonMasterSet(): StoredSet | null {
  try {
    const raw = localStorage.getItem(LS_RIBBON_MASTER)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveRibbonMasterSet(species: string, set: SetdexEntry): void {
  const stored: StoredSet = { species, label: `${species} (RM)`, set }
  localStorage.setItem(LS_RIBBON_MASTER, JSON.stringify(stored))
}

export function loadPokemonSets(): StoredSet[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_SETS)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function appendPokemonSet(species: string, set: SetdexEntry): void {
  const existing = loadPokemonSets()
  const label = `${species} (Custom ${existing.length + 1})`
  existing.push({ species, label, set })
  localStorage.setItem(LS_CUSTOM_SETS, JSON.stringify(existing))
}

export function deleteAllCustomSets(): void {
  localStorage.removeItem(LS_RIBBON_MASTER)
  localStorage.removeItem(LS_CUSTOM_SETS)
}
