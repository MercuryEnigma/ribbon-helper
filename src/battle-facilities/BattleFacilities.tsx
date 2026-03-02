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

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function getBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] || '1-7'
}

function getIVsForBattle(battleNum: number): number {
  if (battleNum >= 50) return 31
  if (battleNum >= 36) return 21
  if (battleNum >= 29) return 15
  if (battleNum >= 22) return 12
  if (battleNum >= 15) return 9
  if (battleNum >= 8) return 6
  return 3
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
  const range = getBattleRange(battleNum)
  const exact = String(battleNum)
  return battleTrainers.filter(t =>
    t.battleRanges.includes(range) || t.battleRanges.includes(exact)
  )
}

function getPokemonForTrainer(trainerName: string): string[] {
  return (trainerPokemon as Record<string, string[]>)[trainerName] || []
}

const BASE_P1_OPTIONS = Object.keys(TEAM_EM)

interface P1Option {
  label: string
  species: string
  set: SetdexEntry
}

function buildP1Options(ribbonMaster: StoredSet | null, pokemonSets: StoredSet[]): P1Option[] {
  const options: P1Option[] = []

  if (ribbonMaster) {
    options.push({ label: ribbonMaster.label, species: ribbonMaster.species, set: ribbonMaster.set })
  }

  for (const species of BASE_P1_OPTIONS) {
    const set = Object.values(TEAM_EM[species])[0]
    options.push({ label: species, species, set })
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

function MoveResults({ pokemonName, results }: { pokemonName: string; results: DamageResult[] }) {
  return (
    <div className="bf-pokemon">
      <h3>{pokemonName}</h3>
      <table className="bf-results-table">
        <thead>
          <tr>
            <th>Move</th>
            <th>Damage Range</th>
            <th>% Range</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, i) => (
            <tr key={i} className={result.move.bp === 0 ? 'bf-status-move' : ''}>
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
          ))}
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

  const p1Options = useMemo(() => buildP1Options(ribbonMasterSet, pokemonSets), [ribbonMasterSet, pokemonSets])
  const [p1Label, setP1Label] = useState(p1Options[0]?.label ?? '')
  const [battleNum, setBattleNum] = useState(1)
  const [trainerKey, setTrainerKey] = useState('')
  const [p2Label, setP2Label] = useState('')

  // Field & battle status
  const [weather, setWeather] = useState('')
  const [level, setLevel] = useState(50)
  const [p1Side, setP1Side] = useState<SideState>(defaultSideState)
  const [p2Side, setP2Side] = useState<SideState>(defaultSideState)
  const [p1StatusOpen, setP1StatusOpen] = useState(false)
  const [p2StatusOpen, setP2StatusOpen] = useState(false)

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
    setP1Label(p1Options.find(o => BASE_P1_OPTIONS.includes(o.label))?.label ?? BASE_P1_OPTIONS[0])
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

  const { p1Results, p2Results, p1MaxHP, p2MaxHP } = useMemo(() => {
    if (!selectedP1 || !effectiveP2Label) return { p1Results: [], p2Results: [], p1MaxHP: 0, p2MaxHP: 0 }

    const p1Dex = POKEDEX_ADV[selectedP1.species]
    if (!p1Dex) return { p1Results: [], p2Results: [], p1MaxHP: 0, p2MaxHP: 0 }
    const p1 = buildPokemon(selectedP1.species, p1Dex, selectedP1.set, selectedP1.label, level)

    const p2Match = findSetByLabel(effectiveP2Label)
    if (!p2Match) return { p1Results: [], p2Results: [], p1MaxHP: 0, p2MaxHP: 0 }
    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return { p1Results: [], p2Results: [], p1MaxHP: 0, p2MaxHP: 0 }
    const p2 = buildPokemon(p2Match.species, p2Dex, p2Match.set, effectiveP2Label, level, p2Ivs)

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
    }, "singles", weather)
    const p2FieldSide = makeFieldSide({
      isReflect: p2Side.isReflect, isLightScreen: p2Side.isLightScreen,
      isHelpingHand: p2Side.isHelpingHand, isCharge: p2Side.isCharge,
      isSeeded: p2Side.isSeeded, spikes: p2Side.spikes,
    }, "singles", weather)

    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, p1FieldSide, p2FieldSide)

    return { p1Results, p2Results, p1MaxHP: p1.maxHP, p2MaxHP: p2.maxHP }
  }, [selectedP1, effectiveP2Label, p2Ivs, weather, level, p1Side, p2Side])

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
      <div className="bf-header">Battle Facilities — Emerald</div>

      <div className="bf-body">
        <p className="bf-team-note">
          Recommended team: <a href="https://pokepast.es/9f353ea337d86f51" target="_blank" rel="noopener noreferrer">Venty's Latios / Metagross / Suicune</a>
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
          <MoveResults pokemonName={selectedP1?.label ?? ''} results={p1Results} />
          <MoveResults pokemonName={effectiveP2Label} results={p2Results} />
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
