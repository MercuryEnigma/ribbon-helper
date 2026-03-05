import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  emeraldConfig,
  sunMoonConfig,
  type GameConfig,
  type SideState,
  type PokeSummary,
  type DamageResult,
  type SideStateFieldDef,
  type P1Option,
  type Trainer,
} from './battleCalculator'
import {
  parsePokepaste,
  loadRibbonMasterSet,
  saveRibbonMasterSet,
  loadPokemonSets,
  appendPokemonSet,
  deleteAllCustomSets,
  type StoredSet,
} from './pokepaste'
import './battle-facilities.css'

const GAME_CONFIGS: GameConfig[] = [emeraldConfig, sunMoonConfig]

const STATUS_OPTIONS = ['Healthy', 'Poisoned', 'Badly Poisoned', 'Burned', 'Paralyzed', 'Asleep', 'Frozen'] as const
const STAT_NAMES = ['at', 'df', 'sa', 'sd', 'sp'] as const
const STAT_LABELS: Record<string, string> = { at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' }
const EV_LABELS: Record<string, string> = { hp: 'HP', at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' }

function formatEvs(evs: Partial<Record<string, number>>): string {
  return Object.entries(evs)
    .filter(([, v]) => v && v > 0)
    .map(([k, v]) => `${v} ${EV_LABELS[k] ?? k}`)
    .join(' / ')
}

function BattleStatusAccordion({
  label, side, level, maxLevel, onLevelChange, onChange, open, onToggle, fieldDefs,
}: {
  label: string
  side: SideState
  level: number
  maxLevel?: number
  onLevelChange: (lvl: number) => void
  onChange: (s: SideState) => void
  open: boolean
  onToggle: () => void
  fieldDefs: SideStateFieldDef[]
}) {
  const setBoost = (stat: string, val: number) => {
    onChange({ ...side, boosts: { ...side.boosts, [stat]: Math.max(-6, Math.min(6, val)) } })
  }

  // Group fields by row number
  const rows = new Map<number, SideStateFieldDef[]>()
  for (const f of fieldDefs) {
    const row = f.row ?? 0
    if (!rows.has(row)) rows.set(row, [])
    rows.get(row)!.push(f)
  }
  const sortedRows = [...rows.entries()].sort(([a], [b]) => a - b)

  return (
    <div className="bf-accordion">
      <button className="bf-accordion-toggle" onClick={onToggle}>
        {open ? '\u25BE' : '\u25B8'} {label} Status
        <span className="bf-level-badge">Lv. {level}</span>
        {side.maxHP > 0 && <span className="bf-hp-badge">{side.curHP}/{side.maxHP} HP</span>}
      </button>
      {open && (
        <div className="bf-accordion-body">
          <div className="bf-status-row">
            <span className="bf-status-label">Level</span>
            <input
              type="number"
              min={1}
              max={maxLevel ?? 100}
              value={level}
              onChange={e => {
                const n = parseInt(e.target.value) || 1
                const cap = maxLevel ?? 100
                onLevelChange(Math.max(1, Math.min(cap, n)))
              }}
              className="bf-level-input"
            />
          </div>
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
          {sortedRows.map(([rowNum, fields]) => (
            <div key={rowNum} className="bf-status-row">
              {fields.map(f => {
                if (f.type === 'checkbox') {
                  return (
                    <label key={f.key} className={`bf-checkbox-label${side[f.key] ? ' bf-checkbox-active' : ''}`}>
                      <input type="checkbox" checked={!!side[f.key]} onChange={e => onChange({ ...side, [f.key]: e.target.checked })} />
                      {f.label}
                    </label>
                  )
                }
                if (f.type === 'select') {
                  return (
                    <span key={f.key} className="bf-status-row">
                      <span className="bf-status-label">{f.label}</span>
                      <select value={side[f.key]} onChange={e => onChange({ ...side, [f.key]: parseInt(e.target.value) })}>
                        {f.options.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </span>
                  )
                }
                return null
              })}
            </div>
          ))}
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
  const [config, setConfig] = useState<GameConfig>(emeraldConfig)
  const [pasteText, setPasteText] = useState('')
  const [isRibbonMaster, setIsRibbonMaster] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [ribbonMasterSet, setRibbonMasterSet] = useState<StoredSet | null>(loadRibbonMasterSet)
  const [pokemonSets, setPokemonSets] = useState<StoredSet[]>(loadPokemonSets)

  const [mode, setMode] = useState(config.modes[0])

  function clampLevelToMode(lvl: number, targetMode: typeof mode): number {
    const cap = targetMode.maxLevel ?? 100
    return Math.max(1, Math.min(cap, lvl))
  }

  const p1Options = useMemo(() => config.buildP1Options(ribbonMasterSet, pokemonSets, mode.pokemon), [config, ribbonMasterSet, pokemonSets, mode])
  const [p1Label, setP1Label] = useState(p1Options[0]?.label ?? '')
  const [battleNum, setBattleNum] = useState(1)
  const [trainerKey, setTrainerKey] = useState('')
  const [p2Label, setP2Label] = useState('')

  // Field & battle status
  const [weather, setWeather] = useState('')
  const [terrain, setTerrain] = useState('')
  const [gravity, setGravity] = useState(false)
  const [p1Level, setP1Level] = useState(() => clampLevelToMode(mode.defaultLevel, mode))
  const [p2Level, setP2Level] = useState(() => clampLevelToMode(mode.defaultLevel, mode))
  const [p1Side, setP1Side] = useState<SideState>(config.defaultSideState())
  const [p2Side, setP2Side] = useState<SideState>(config.defaultSideState())
  const [p1StatusOpen, setP1StatusOpen] = useState(false)
  const [p2StatusOpen, setP2StatusOpen] = useState(false)
  const [p2Ability, setP2Ability] = useState('')

  const currentRibbon = mode.ribbon

  const selectedP1 = useMemo(() => {
    return p1Options.find((o: P1Option) => o.label === p1Label) ?? p1Options[0] ?? null
  }, [p1Options, p1Label])

  const handleGameChange = useCallback((newConfig: GameConfig) => {
    setConfig(newConfig)
    const newMode = newConfig.modes[0]
    setMode(newMode)
    setP1Level(clampLevelToMode(newMode.defaultLevel, newMode))
    setP2Level(clampLevelToMode(newMode.defaultLevel, newMode))
    setBattleNum(1)
    setTrainerKey('')
    setP2Label('')
    setWeather('')
    setTerrain('')
    setGravity(false)
    setP1Side(newConfig.defaultSideState())
    setP2Side(newConfig.defaultSideState())
    setP1StatusOpen(false)
    setP2StatusOpen(false)
    setP2Ability('')
    const newOptions = newConfig.buildP1Options(ribbonMasterSet, pokemonSets, newMode.pokemon)
    setP1Label(newOptions[0]?.label ?? '')
  }, [ribbonMasterSet, pokemonSets])

  const handleSave = () => {
    setSaveError('')
    const parsed = parsePokepaste(pasteText)
    if (!parsed) {
      setSaveError('Invalid moveset. Needs species, nature, and at least one move.')
      return
    }
    if (!config.isValidSpecies(parsed.species)) {
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
  const availableTrainers = useMemo(() => config.getTrainersForBattle(battleNum, mode.id), [config, battleNum, mode])

  const selectedTrainer = useMemo(() => {
    const match = availableTrainers.find((t: Trainer) => `${t.class} ${t.name}` === trainerKey)
    if (match) return match
    return availableTrainers[0] || null
  }, [availableTrainers, trainerKey])

  const effectiveTrainerKey = selectedTrainer ? `${selectedTrainer.class} ${selectedTrainer.name}` : ''

  const availableSets = useMemo(() => {
    if (!selectedTrainer) return []
    return config.getPokemonForTrainer(selectedTrainer.name)
  }, [config, selectedTrainer])

  const effectiveP2Label = useMemo(() => {
    if (availableSets.includes(p2Label)) return p2Label
    return availableSets[0] || ''
  }, [availableSets, p2Label])

  const p2Ivs = config.getIVsForTrainer(selectedTrainer)

  const emptyCalc = { p1Results: [] as DamageResult[], p2Results: [] as DamageResult[], p1MaxHP: 0, p2MaxHP: 0, p1Summary: undefined as PokeSummary | undefined, p2Summary: undefined as PokeSummary | undefined }
  const { p1Results, p2Results, p1MaxHP, p2MaxHP, p1Summary, p2Summary } = useMemo(() => {
    if (!selectedP1 || !effectiveP2Label) return emptyCalc

    const result = config.runCalc({
      p1: selectedP1,
      p2Label: effectiveP2Label,
      p1Level,
      p2Level,
      p2Ivs,
      p2Ability,
      weather,
      terrain,
      gravity,
      p1Side,
      p2Side,
      format: mode.format,
    })

    if (!result) return emptyCalc
    return result
  }, [config, selectedP1, effectiveP2Label, p1Level, p2Level, p2Ivs, weather, terrain, gravity, p1Side, p2Side, mode, p2Ability])

  // Sync maxHP/curHP when pokemon changes or side state resets
  useEffect(() => {
    if (p1MaxHP > 0 && p1MaxHP !== p1Side.maxHP) {
      setP1Side(s => ({ ...s, maxHP: p1MaxHP, curHP: p1MaxHP }))
    }
  }, [p1MaxHP, p1Side.maxHP])
  useEffect(() => {
    if (p2MaxHP > 0 && p2MaxHP !== p2Side.maxHP) {
      setP2Side(s => ({ ...s, maxHP: p2MaxHP, curHP: p2MaxHP }))
    }
  }, [p2MaxHP, p2Side.maxHP])
  // Reset ability override when opponent pokemon changes
  useEffect(() => { setP2Ability('') }, [effectiveP2Label])

  const handleModeChange = (newMode: typeof mode) => {
    setMode(newMode)
    setP1Level(clampLevelToMode(newMode.defaultLevel, newMode))
    setP2Level(clampLevelToMode(newMode.defaultLevel, newMode))
    const newOptions = config.buildP1Options(ribbonMasterSet, pokemonSets, newMode.pokemon)
    if (newOptions.length > 0 && !newOptions.find((o: P1Option) => o.label === p1Label)) {
      setP1Label(newOptions[0].label)
    }
    // Clamp battle number to the new mode's max (if any)
    handleBattleNumChange(Math.min(battleNum, newMode.maxBattle ?? battleNum), newMode)
  }

  const handleBattleNumChange = (newNum: number, targetMode: typeof mode = mode) => {
    const upper = targetMode.maxBattle ?? Infinity
    const clamped = Math.min(Math.max(1, newNum), upper)
    setBattleNum(clamped)
    setWeather('')
    setTerrain('')
    setGravity(false)
    setP1Side(s => ({ ...config.defaultSideState(), maxHP: s.maxHP, curHP: s.maxHP }))
    setP2Side(s => ({ ...config.defaultSideState(), maxHP: s.maxHP, curHP: s.maxHP }))
    setP1StatusOpen(false)
    setP2StatusOpen(false)
  }

  const handleP1LevelChange = (lvl: number) => setP1Level(clampLevelToMode(lvl, mode))
  const handleP2LevelChange = (lvl: number) => setP2Level(clampLevelToMode(lvl, mode))

  const handleGameSelect = (title: string) => {
    const gc = GAME_CONFIGS.find(g => g.title === title)
    if (gc) handleGameChange(gc)
  }

  return (
    <div className="bf-card">
      <div className="bf-header">
        <select
          className="bf-header-select"
          value={config.title}
          onChange={e => handleGameSelect(e.target.value)}
        >
          {GAME_CONFIGS.map(gc => (
            <option key={gc.title} value={gc.title}>{gc.title}</option>
          ))}
        </select>
      </div>

      <div className="bf-body">
        <div className="bf-radio-group bf-mode-selector">
          <div className="bf-radio-buttons">
            {config.modes.map((m, i) => (
              <label
                key={m.id}
                className={`bf-radio-btn${mode.id === m.id ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === config.modes.length - 1 ? ' bf-radio-btn-right' : ''}`}
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
        {currentRibbon && currentRibbon.warning && (
          <p className="bf-warning">
            {currentRibbon.warning}
          </p>
        )}
        {currentRibbon && (
          <p className="bf-ribbon-note">
            <img src={currentRibbon.icon} alt={currentRibbon.name} className="bf-ribbon-icon" />
            {currentRibbon.description}
          </p>
        )}
        {mode.teamUrl && (
          <p className="bf-team-note">
            Recommended team: <a href={mode.teamUrl} target="_blank" rel="noopener noreferrer">{mode.teamName}</a>
          </p>
        )}
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
                  {p1Options.map((opt: P1Option) => (
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
                  max={mode.maxBattle ?? undefined}
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
                <span className="bf-range-badge">{config.getBattleRange(battleNum)}</span>
                <span className="bf-range-badge">{p2Ivs} IVs</span>
              </div>
              <div className="bf-trainer-row">
                <span className="bf-row-label">Trainer</span>
                <select
                  value={effectiveTrainerKey}
                  onChange={e => setTrainerKey(e.target.value)}
                >
                  {availableTrainers.map((t: Trainer) => {
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
          <div className="bf-radio-group">
            <span className="bf-radio-group-label">Weather</span>
            <div className="bf-radio-buttons">
              {config.weatherOptions.map((w, i) => (
                <label
                  key={w}
                  className={`bf-radio-btn${weather === w ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === config.weatherOptions.length - 1 ? ' bf-radio-btn-right' : ''}`}
                >
                  <input
                    type="radio"
                    name="weather"
                    value={w}
                    checked={weather === w}
                    onChange={() => setWeather(w)}
                    className="bf-radio-input"
                  />
                  {config.weatherLabels[w]}
                </label>
              ))}
            </div>
          </div>
          {config.terrainOptions && config.terrainLabels && (
            <div className="bf-radio-group">
              <span className="bf-radio-group-label">Terrain</span>
              <div className="bf-radio-buttons">
                {config.terrainOptions.map((t, i) => (
                  <label
                    key={t}
                    className={`bf-radio-btn${terrain === t ? ' bf-radio-btn-active' : ''}${i === 0 ? ' bf-radio-btn-left' : ''}${i === config.terrainOptions!.length - 1 ? ' bf-radio-btn-right' : ''}`}
                  >
                    <input
                      type="radio"
                      name="terrain"
                      value={t}
                      checked={terrain === t}
                      onChange={() => setTerrain(t)}
                      className="bf-radio-input"
                    />
                    {config.terrainLabels![t]}
                  </label>
                ))}
              </div>
            </div>
          )}
          {config.hasGravity && (
            <label className={`bf-checkbox-label${gravity ? ' bf-checkbox-active' : ''}`}>
              <input
                type="checkbox"
                checked={gravity}
                onChange={() => setGravity(g => !g)}
              />
              Gravity
            </label>
          )}
        </div>
        <div className="bf-status-sides">
          <BattleStatusAccordion
            label="Your"
            side={p1Side}
            level={p1Level}
            maxLevel={mode.maxLevel}
            onLevelChange={handleP1LevelChange}
            onChange={setP1Side}
            open={p1StatusOpen}
            onToggle={() => setP1StatusOpen(o => !o)}
            fieldDefs={config.sideStateFields}
          />
          <BattleStatusAccordion
            label="Opponent"
            side={p2Side}
            level={p2Level}
            maxLevel={mode.maxLevel}
            onLevelChange={handleP2LevelChange}
            onChange={setP2Side}
            open={p2StatusOpen}
            onToggle={() => setP2StatusOpen(o => !o)}
            fieldDefs={config.sideStateFields}
          />
        </div>
      </div>
    </div>
  )
}
