import { useState, useMemo, useEffect } from 'react'
import {
  buildPokemon,
  makeFieldSide,
  calculateAllMovesGen3,
  findSetByLabel,
  POKEDEX_ADV,
  type DamageResult,
  type SetdexEntry,
} from './gen3calc'
import teamData from '../data/battle-facilities/setteam_em.json'
import {
  parsePokepaste,
  loadRibbonMasterSet,
  saveRibbonMasterSet,
  loadPokemonSets,
  appendPokemonSet,
  deleteAllCustomSets,
  type StoredSet,
} from './pokepaste'
import battleTrainers from '../data/battle-facilities/battle_trainers_em.json'
import trainerPokemon from '../data/battle-facilities/trainer_pokemon_em.json'
import './battle-facilities.css'

const TEAM_EM = teamData as Record<string, Record<string, SetdexEntry>>

/* ===== Facility mode configuration ===== */
interface FacilityMode {
  id: string
  label: string
  defaultLevel: number
  format: 'singles' | 'doubles'
  teamUrl: string
  teamName: string
  pokemon: string[] // set labels from TEAM_EM to show in the P1 selector
}

const FACILITY_MODES: FacilityMode[] = [
  {
    id: 'lvl50-singles',
    label: 'Lvl 50 Singles',
    defaultLevel: 50,
    format: 'singles',
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
  },
  {
    id: 'open-singles',
    label: 'Open Singles',
    defaultLevel: 60,
    format: 'singles',
    teamUrl: 'https://pokepast.es/9f353ea337d86f51',
    teamName: "Venty's Latios / Metagross / Suicune",
    pokemon: ['Latios (Singles)', 'Metagross (Singles)', 'Suicune (Singles)'],
  },
  {
    id: 'lvl50-doubles',
    label: 'Lvl 50 Doubles',
    defaultLevel: 50,
    format: 'doubles',
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
  },
  {
    id: 'open-doubles',
    label: 'Open Doubles',
    defaultLevel: 60,
    format: 'doubles',
    teamUrl: 'https://pokepast.es/773249e264806f40',
    teamName: "Venty's Explosive doubles team",
    pokemon: ['Latios (Doubles)', 'Metagross (Doubles)', 'Snorlax (Doubles)', 'Gengar (Doubles)'],
  },
]

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function getBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] || '1-7'
}

function battleRangeMatches(battleNum: number, range: string): boolean {
  if (range.endsWith('+')) {
    const start = parseInt(range.slice(0, -1), 10)
    return Number.isFinite(start) && battleNum >= start
  }
  if (range.includes('-')) {
    const [a, b] = range.split('-').map(v => parseInt(v, 10))
    return Number.isFinite(a) && Number.isFinite(b) && battleNum >= a && battleNum <= b
  }
  const exact = parseInt(range, 10)
  return Number.isFinite(exact) && battleNum === exact
}

function getIVsForTrainer(trainer: { number: number; name: string } | null): number {
  if (!trainer) return 3
  if (trainer.name === 'Anabel (Silver)') return 24
  if (trainer.name === 'Anabel (Gold)') return 31

  const n = trainer.number
  if (n <= 100) return 3
  if (n <= 120) return 6
  if (n <= 140) return 9
  if (n <= 160) return 12
  if (n <= 180) return 15
  if (n <= 200) return 18
  if (n <= 220) return 21
  if (n <= 300) return 31
  return 31
}

function getTrainersForBattle(battleNum: number) {
  return battleTrainers.filter(t =>
    t.battleRanges.some(r => battleRangeMatches(battleNum, r))
  )
}

function getPokemonForTrainer(trainerName: string): string[] {
  return (trainerPokemon as Record<string, string[]>)[trainerName] || []
}

interface P1Option {
  label: string
  species: string
  set: SetdexEntry
}

// Build a lookup from set label → { species, set } across all TEAM_EM entries
const TEAM_EM_BY_LABEL: Record<string, { species: string; set: SetdexEntry }> = {}
for (const [species, sets] of Object.entries(TEAM_EM)) {
  for (const [label, set] of Object.entries(sets)) {
    TEAM_EM_BY_LABEL[label] = { species, set }
  }
}

function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[], modeLabels: string[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const label of modeLabels) {
    const entry = TEAM_EM_BY_LABEL[label]
    if (!entry) continue
    options.push({ label, species: entry.species, set: entry.set })
  }

  for (const cs of pokemonSets) {
    options.push({ label: cs.label, species: cs.species, set: cs.set })
  }

  return options
}

const WEATHER_OPTIONS = ['', 'Sun', 'Rain', 'Sand', 'Hail'] as const
const WEATHER_LABELS: Record<string, string> = { '': 'None', Sun: 'Sun', Rain: 'Rain', Sand: 'Sand', Hail: 'Hail' }
const STATUS_OPTIONS = ['Healthy', 'Poisoned', 'Badly Poisoned', 'Burned', 'Paralyzed', 'Asleep', 'Frozen'] as const
const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const
const STAT_LABELS: Record<string, string> = { at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' }

interface SideState {
  isReflect: boolean
  isLightScreen: boolean
  isHelpingHand: boolean
  isCharge: boolean
  isSeeded: boolean
  spikes: number
  boosts: Record<string, number>
  curHP: number
  maxHP: number
  status: string
}

function defaultSideState(): SideState {
  return {
    isReflect: false,
    isLightScreen: false,
    isHelpingHand: false,
    isCharge: false,
    isSeeded: false,
    spikes: 0,
    boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
    curHP: 0,
    maxHP: 0,
    status: 'Healthy',
  }
}

function BattleStatusAccordion({
  label, side, onChange, open, onToggle,
}: {
  label: string
  side: SideState
  onChange: (s: SideState) => void
  open: boolean
  onToggle: () => void
}) {
  const setBoost = (stat: string, val: number) => {
    onChange({ ...side, boosts: { ...side.boosts, [stat]: Math.max(-6, Math.min(6, val)) } })
  }

  return (
    <div className="bf-accordion">
      <button className="bf-accordion-toggle" onClick={onToggle}>
        {open ? '\u25BE' : '\u25B8'} {label} Status
        {side.maxHP > 0 && <span className="bf-hp-badge">{side.curHP}/{side.maxHP} HP</span>}
      </button>
      {open && (
        <div className="bf-accordion-body">
          <div className="bf-status-row">
            <span className="bf-status-label">HP</span>
            <input
              type="number"
              min={0}
              max={side.maxHP}
              value={side.curHP}
              onChange={e => onChange({ ...side, curHP: Math.max(0, Math.min(side.maxHP, parseInt(e.target.value) || 0)) })}
              className="bf-hp-input"
            />
            <span className="bf-hp-max">/ {side.maxHP}</span>
          </div>
          <div className="bf-radio-group bf-radio-group-compact">
            <span className="bf-radio-group-label">Status</span>
            <div className="bf-radio-buttons">
              {STATUS_OPTIONS.map((s, i) => (
                <label
                  key={s}
                  className={`bf-radio-btn bf-radio-btn-sm${side.status === s ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === STATUS_OPTIONS.length - 1 ? ' bf-radio-btn-right' : ''}`}
                >
                  <input
                    type="radio"
                    name={`${label}-status`}
                    value={s}
                    checked={side.status === s}
                    onChange={() => onChange({ ...side, status: s })}
                    className="bf-radio-input"
                  />
                  {s === 'Badly Poisoned' ? 'Badly Psn' : s === 'Poisoned' ? 'Psn' : s === 'Paralyzed' ? 'Par' : s === 'Burned' ? 'Brn' : s === 'Asleep' ? 'Slp' : s === 'Frozen' ? 'Frz' : s}
                </label>
              ))}
            </div>
          </div>
          <div className="bf-status-row">
            <label className={`bf-checkbox-label${side.isReflect ? ' bf-checkbox-active' : ''}`}>
              <input type="checkbox" checked={side.isReflect} onChange={e => onChange({ ...side, isReflect: e.target.checked })} />
              Reflect
            </label>
            <label className={`bf-checkbox-label${side.isLightScreen ? ' bf-checkbox-active' : ''}`}>
              <input type="checkbox" checked={side.isLightScreen} onChange={e => onChange({ ...side, isLightScreen: e.target.checked })} />
              Light Screen
            </label>
          </div>
          <div className="bf-status-row">
            <label className={`bf-checkbox-label${side.isHelpingHand ? ' bf-checkbox-active' : ''}`}>
              <input type="checkbox" checked={side.isHelpingHand} onChange={e => onChange({ ...side, isHelpingHand: e.target.checked })} />
              Helping Hand
            </label>
            <label className={`bf-checkbox-label${side.isCharge ? ' bf-checkbox-active' : ''}`}>
              <input type="checkbox" checked={side.isCharge} onChange={e => onChange({ ...side, isCharge: e.target.checked })} />
              Charge
            </label>
            <label className={`bf-checkbox-label${side.isSeeded ? ' bf-checkbox-active' : ''}`}>
              <input type="checkbox" checked={side.isSeeded} onChange={e => onChange({ ...side, isSeeded: e.target.checked })} />
              Leech Seed
            </label>
          </div>
          <div className="bf-status-row">
            <span className="bf-status-label">Spikes</span>
            <select value={side.spikes} onChange={e => onChange({ ...side, spikes: parseInt(e.target.value) })}>
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
          <div className="bf-boosts-row">
            {STAT_NAMES.map(stat => (
              <div key={stat} className="bf-boost-item">
                <span>{STAT_LABELS[stat]}</span>
                <input
                  type="number"
                  min={-6}
                  max={6}
                  value={side.boosts[stat]}
                  onChange={e => setBoost(stat, parseInt(e.target.value) || 0)}
                  className="bf-boost-input"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const EV_LABELS: Record<string, string> = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' }

interface PokeSummary {
  evs: Partial<Record<string, number>>
  nature: string
  ability: string
  abilities: string[]
  item: string
  speed: number
}

function formatEvs(evs: Partial<Record<string, number>>): string {
  return Object.entries(evs)
    .filter(([, v]) => v && v > 0)
    .map(([k, v]) => `${v} ${EV_LABELS[k] ?? k}`)
    .join(' / ')
}

function getModifiedStat(stat: number, mod: number): number {
  if (mod > 0) return Math.floor(stat * (2 + mod) / 2)
  if (mod < 0) return Math.floor(stat * 2 / (2 - mod))
  return stat
}

function calcCurrentSpeed(pokemon: ReturnType<typeof buildPokemon>, weather: string): number {
  // Start from computed stat (already includes IVs/EVs/nature)
  let speed = pokemon.stats.sp
  // Apply stage boosts
  speed = getModifiedStat(speed, pokemon.boosts.sp)
  // Status: paralysis (Gen 3 is 1/4)
  if (pokemon.status === 'Paralyzed') {
    speed = Math.floor(speed / 4)
  }
  // Item modifiers
  if (pokemon.item === 'Macho Brace') {
    speed = Math.floor(speed / 2)
  }
  // Weather-based abilities
  if (weather === 'Sun' && pokemon.curAbility === 'Chlorophyll') {
    speed *= 2
  } else if (weather === 'Rain' && pokemon.curAbility === 'Swift Swim') {
    speed *= 2
  }
  return speed
}

function MoveResults({ pokemonName, summary, opponentSpeed, isOpponent = false, results, onAbilityChange }: { pokemonName: string; summary?: PokeSummary; opponentSpeed?: number; isOpponent?: boolean; results: DamageResult[]; onAbilityChange?: (ability: string) => void }) {
  const renderSpeed = () => {
    if (!summary) return null
    let className = ''
    if (opponentSpeed !== undefined && summary.speed !== opponentSpeed) {
      const isFaster = summary.speed > opponentSpeed
      if (isFaster) {
        className = isOpponent ? 'bf-speed-opp-fast' : 'bf-speed-player-fast'
      }
    }
    return <span className={className}>{summary.speed} Speed</span>
  }

  const bestDamageIndex = useMemo(() => {
    if (!summary || results.length === 0) return -1
    let bestIdx = -1
    let bestVal = -1
    results.forEach((r, i) => {
      const val = r.minDamage
      if (val > bestVal) {
        bestVal = val
        bestIdx = i
      }
    })
    return bestIdx
  }, [results, summary])

  const opponentFaster = isOpponent && summary && opponentSpeed !== undefined && summary.speed > opponentSpeed

  return (
    <div className="bf-pokemon">
      <h3>{summary?.item ? `${pokemonName} @ ${summary.item}` : pokemonName}</h3>
      {summary && (
        <div className="bf-pokemon-summary">
          <span>
            {summary.abilities.length > 1 && onAbilityChange ? (
              <select
                value={summary.ability}
                onChange={e => onAbilityChange(e.target.value)}
                className="bf-ability-select"
              >
                {summary.abilities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            ) : (
              summary.ability
            )}
            {' '}| {summary.nature} Nature | {renderSpeed()}
          </span>
          <span>EVs: {formatEvs(summary.evs)}</span>
        </div>
      )}
      <table className="bf-results-table">
        <thead>
          <tr>
            <th>Move</th>
            <th>Damage Range</th>
            <th>% Range</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, i) => {
            let rowClass = result.move.bp === 0 ? 'bf-status-move' : ''
            if (i === bestDamageIndex) {
              if (opponentFaster) rowClass += ' bf-best-move-opp'
              else if (!isOpponent) rowClass += ' bf-best-move-player'
            }
            return (
              <tr key={i} className={rowClass}>
              <td>{result.move.name}</td>
              <td>
                {result.move.bp === 0
                  ? '—'
                  : `${result.minDamage}–${result.maxDamage}`}
              </td>
              <td>
                {result.move.bp === 0
                  ? '—'
                  : `${result.minPercent}–${result.maxPercent}%`}
              </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function BattleFacilities() {
  const [pasteText, setPasteText] = useState('')
  const [isRibbonMaster, setIsRibbonMaster] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [ribbonMasterSet, setRibbonMasterSet] = useState<StoredSet | null>(loadRibbonMasterSet)
  const [pokemonSets, setPokemonSets] = useState<StoredSet[]>(loadPokemonSets)

  const [mode, setMode] = useState<FacilityMode>(FACILITY_MODES[0])

  const p1Options = useMemo(() => buildP1Options(ribbonMasterSet, pokemonSets, mode.pokemon), [ribbonMasterSet, pokemonSets, mode])
  const [p1Label, setP1Label] = useState(p1Options[0]?.label ?? '')
  const [battleNum, setBattleNum] = useState(1)
  const [trainerKey, setTrainerKey] = useState('')
  const [p2Label, setP2Label] = useState('')

  // Field & battle status
  const [weather, setWeather] = useState('')
  const [level, setLevel] = useState(mode.defaultLevel)
  const [p1Side, setP1Side] = useState<SideState>(defaultSideState)
  const [p2Side, setP2Side] = useState<SideState>(defaultSideState)
  const [p1StatusOpen, setP1StatusOpen] = useState(false)
  const [p2StatusOpen, setP2StatusOpen] = useState(false)
  const [p2Ability, setP2Ability] = useState('')

  const selectedP1 = useMemo(() => {
    return p1Options.find(o => o.label === p1Label) ?? p1Options[0] ?? null
  }, [p1Options, p1Label])

  const handleSave = () => {
    setSaveError('')
    const parsed = parsePokepaste(pasteText)
    if (!parsed) {
      setSaveError('Invalid moveset. Needs species, nature, and at least one move.')
      return
    }
    if (!POKEDEX_ADV[parsed.species]) {
      setSaveError(`Unknown species: ${parsed.species}`)
      return
    }
    if (isRibbonMaster) {
      saveRibbonMasterSet(parsed.species, parsed.set)
      const updated = loadRibbonMasterSet()
      setRibbonMasterSet(updated)
      if (updated) setP1Label(updated.label)
    } else {
      appendPokemonSet(parsed.species, parsed.set)
      const updated = loadPokemonSets()
      setPokemonSets(updated)
      setP1Label(updated[updated.length - 1].label)
    }
    setPasteText('')
  }

  const handleDelete = () => {
    deleteAllCustomSets()
    setRibbonMasterSet(null)
    setPokemonSets([])
    setP1Label(mode.pokemon[0] ?? '')
  }

  // Trainers available for current battle number
  const availableTrainers = useMemo(() => getTrainersForBattle(battleNum), [battleNum])

  const selectedTrainer = useMemo(() => {
    const match = availableTrainers.find(t => `${t.class} ${t.name}` === trainerKey)
    if (match) return match
    return availableTrainers[0] || null
  }, [availableTrainers, trainerKey])

  const effectiveTrainerKey = selectedTrainer ? `${selectedTrainer.class} ${selectedTrainer.name}` : ''

  const availableSets = useMemo(() => {
    if (!selectedTrainer) return []
    return getPokemonForTrainer(selectedTrainer.name)
  }, [selectedTrainer])

  const effectiveP2Label = useMemo(() => {
    if (availableSets.includes(p2Label)) return p2Label
    return availableSets[0] || ''
  }, [availableSets, p2Label])

  const p2Ivs = getIVsForTrainer(selectedTrainer)

  const emptyCalc = { p1Results: [] as DamageResult[], p2Results: [] as DamageResult[], p1MaxHP: 0, p2MaxHP: 0, p1Summary: undefined as PokeSummary | undefined, p2Summary: undefined as PokeSummary | undefined }
  const { p1Results, p2Results, p1MaxHP, p2MaxHP, p1Summary, p2Summary } = useMemo(() => {
    if (!selectedP1 || !effectiveP2Label) return emptyCalc

    const p1Dex = POKEDEX_ADV[selectedP1.species]
    if (!p1Dex) return emptyCalc
    const p1 = buildPokemon(selectedP1.species, p1Dex, selectedP1.set, selectedP1.label, level)

    const p2Match = findSetByLabel(effectiveP2Label)
    if (!p2Match) return emptyCalc
    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return emptyCalc
    const p2 = buildPokemon(p2Match.species, p2Dex, p2Match.set, effectiveP2Label, level, p2Ivs)

    // Apply selected opponent ability (if user overrode it)
    if (p2Ability && p2Dex.abilities.includes(p2Ability)) {
      p2.ability = p2Ability
      p2.curAbility = p2Ability
    }

    // Apply boosts
    for (const stat of STAT_NAMES) {
      p1.boosts[stat] = p1Side.boosts[stat]
      p2.boosts[stat] = p2Side.boosts[stat]
    }

    // Apply current HP and status
    if (p1Side.curHP > 0) p1.curHP = p1Side.curHP
    if (p2Side.curHP > 0) p2.curHP = p2Side.curHP
    p1.status = p1Side.status
    p2.status = p2Side.status

    const p1FieldSide = makeFieldSide({
      isReflect: p1Side.isReflect, isLightScreen: p1Side.isLightScreen,
      isHelpingHand: p1Side.isHelpingHand, isCharge: p1Side.isCharge,
      isSeeded: p1Side.isSeeded, spikes: p1Side.spikes,
    }, mode.format, weather)
    const p2FieldSide = makeFieldSide({
      isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
      isHelpingHand: p2Side.isHelpingHand, isCharge: p2Side.isCharge,
      isSeeded: p2Side.isSeeded, spikes: p2Side.spikes,
    }, mode.format, weather)

    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, p1FieldSide, p2FieldSide)

    const p1Summary: PokeSummary = {
      evs: p1.evs,
      nature: p1.nature,
      ability: p1.ability,
      abilities: [p1.ability],
      item: p1.item,
      speed: calcCurrentSpeed(p1, weather),
    }
    const p2Summary: PokeSummary = {
      evs: p2.evs,
      nature: p2.nature,
      ability: p2.ability,
      abilities: p2Dex.abilities,
      item: p2.item,
      speed: calcCurrentSpeed(p2, weather),
    }

    return { p1Results, p2Results, p1MaxHP: p1.maxHP, p2MaxHP: p2.maxHP, p1Summary, p2Summary }
  }, [selectedP1, effectiveP2Label, p2Ivs, weather, level, p1Side, p2Side, mode, p2Ability])

  // Sync maxHP/curHP when pokemon changes
  useEffect(() => {
    if (p1MaxHP > 0 && p1MaxHP !== p1Side.maxHP) {
      setP1Side(s => ({ ...s, maxHP: p1MaxHP, curHP: p1MaxHP }))
    }
  }, [p1MaxHP])
  useEffect(() => {
    if (p2MaxHP > 0 && p2MaxHP !== p2Side.maxHP) {
      setP2Side(s => ({ ...s, maxHP: p2MaxHP, curHP: p2MaxHP }))
    }
  }, [p2MaxHP])
  // Reset ability override when opponent pokemon changes
  useEffect(() => { setP2Ability('') }, [effectiveP2Label])

  const handleModeChange = (newMode: FacilityMode) => {
    setMode(newMode)
    setLevel(newMode.defaultLevel)
    // Reset P1 selection to first available pokemon in the new mode
    const newOptions = buildP1Options(ribbonMasterSet, pokemonSets, newMode.pokemon)
    if (newOptions.length > 0 && !newOptions.find(o => o.label === p1Label)) {
      setP1Label(newOptions[0].label)
    }
  }

  const handleBattleNumChange = (newNum: number) => {
    const clamped = Math.max(1, newNum)
    setBattleNum(clamped)
    setWeather('')
    setP1Side(s => ({ ...defaultSideState(), maxHP: s.maxHP, curHP: s.maxHP }))
    setP2Side(s => ({ ...defaultSideState(), maxHP: s.maxHP, curHP: s.maxHP }))
    setP1StatusOpen(false)
    setP2StatusOpen(false)
  }

  return (
    <div className="bf-card">
      <div className="bf-header">Emerald - Battle Frontier Tower</div>

      <div className="bf-body">
        <div className="bf-radio-group bf-mode-selector">
          <div className="bf-radio-buttons">
            {FACILITY_MODES.map((m, i) => (
              <label
                key={m.id}
                className={`bf-radio-btn${mode.id === m.id ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === FACILITY_MODES.length - 1 ? ' bf-radio-btn-right' : ''}`}
              >
                <input
                  type="radio"
                  name="facility-mode"
                  value={m.id}
                  checked={mode.id === m.id}
                  onChange={() => handleModeChange(m)}
                  className="bf-radio-input"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
        <p className="bf-team-note">
          Recommended team: <a href={mode.teamUrl} target="_blank" rel="noopener noreferrer">{mode.teamName}</a>
        </p>
        <div className="bf-matchup">
          <div className="bf-side">
            <div className="bf-p1-selector">
              <label>Your Pokemon</label>
              <div className="bf-custom-input">
                <textarea
                  rows={6}
                  placeholder={"Claydol @ Leftovers\nAbility: Levitate\nEVs: 100 HP / 150 Def / 4 SpA / 252 SpD / 4 HP\nCalm Nature\n- Protect\n- Psychic\n- Ancient Power\n- Explosion"}
                  value={pasteText}
                  onChange={e => { setPasteText(e.target.value); setSaveError('') }}
                />
                <div className="bf-custom-controls">
                  <label className={`bf-checkbox-label${isRibbonMaster ? ' bf-checkbox-active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isRibbonMaster}
                      onChange={e => setIsRibbonMaster(e.target.checked)}
                    />
                    Ribbon Master
                  </label>
                  <button className="bf-btn" onClick={handleSave}>Save</button>
                  <button className="bf-btn bf-btn-danger" onClick={handleDelete}>Delete custom sets</button>
                </div>
                {saveError && <div className="bf-save-error">{saveError}</div>}
              </div>
              <div className="bf-pokemon-row">
                <span className="bf-row-label">Pokemon</span>
                <select
                  value={selectedP1?.label ?? ''}
                  onChange={e => setP1Label(e.target.value)}
                >
                  {p1Options.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bf-side">
            <div className="bf-p2-selector">
              <label>Opponent</label>
              <div className="bf-battle-num-row">
                <span className="bf-row-label">Battle #</span>
                <input
                  type="number"
                  min={1}
                  value={battleNum}
                  onChange={e => handleBattleNumChange(parseInt(e.target.value) || 1)}
                  className="bf-battle-num-input"
                />
                <button
                  className="bf-btn"
                  onClick={() => handleBattleNumChange(battleNum + 1)}
                  title="Next battle"
                >+1</button>
                <button
                  className="bf-btn"
                  onClick={() => handleBattleNumChange(1)}
                  title="Reset to battle 1"
                >Reset</button>
                <span className="bf-range-badge">{getBattleRange(battleNum)}</span>
                <span className="bf-range-badge">{p2Ivs} IVs</span>
              </div>
              <div className="bf-trainer-row">
                <span className="bf-row-label">Trainer</span>
                <select
                  value={effectiveTrainerKey}
                  onChange={e => setTrainerKey(e.target.value)}
                >
                  {availableTrainers.map(t => {
                    const key = `${t.class} ${t.name}`
                    return <option key={key} value={key}>{key}</option>
                  })}
                </select>
              </div>
              <div className="bf-pokemon-row">
                <span className="bf-row-label">Pokemon</span>
                <select
                  value={effectiveP2Label}
                  onChange={e => setP2Label(e.target.value)}
                >
                  {availableSets.map((label: string) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bf-results-panel">
        <div className="bf-results">
          <MoveResults
            pokemonName={selectedP1?.label ?? ''}
            summary={p1Summary}
            opponentSpeed={p2Summary?.speed}
            isOpponent={false}
            results={p1Results}
          />
          <MoveResults
            pokemonName={effectiveP2Label}
            summary={p2Summary}
            opponentSpeed={p1Summary?.speed}
            isOpponent={true}
            results={p2Results}
            onAbilityChange={setP2Ability}
          />
        </div>
      </div>

      <div className="bf-battle-status">
        <h3>Battle Status</h3>
        <div className="bf-global-row">
          <div className="bf-level-row">
            <label>Level</label>
            <input
              type="number"
              min={1}
              max={100}
              value={level}
              onChange={e => setLevel(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="bf-level-input"
            />
          </div>
          <div className="bf-radio-group">
            <span className="bf-radio-group-label">Weather</span>
            <div className="bf-radio-buttons">
              {WEATHER_OPTIONS.map((w, i) => (
                <label
                  key={w}
                  className={`bf-radio-btn${weather === w ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === WEATHER_OPTIONS.length - 1 ? ' bf-radio-btn-right' : ''}`}
                >
                  <input
                    type="radio"
                    name="weather"
                    value={w}
                    checked={weather === w}
                    onChange={() => setWeather(w)}
                    className="bf-radio-input"
                  />
                  {WEATHER_LABELS[w]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="bf-status-sides">
          <BattleStatusAccordion
            label="Your"
            side={p1Side}
            onChange={setP1Side}
            open={p1StatusOpen}
            onToggle={() => setP1StatusOpen(o => !o)}
          />
          <BattleStatusAccordion
            label="Opponent"
            side={p2Side}
            onChange={setP2Side}
            open={p2StatusOpen}
            onToggle={() => setP2StatusOpen(o => !o)}
          />
        </div>
      </div>
    </div>
  )
}
