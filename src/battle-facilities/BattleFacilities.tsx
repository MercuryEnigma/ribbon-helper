import { useState, useMemo } from 'react'
import {
  buildPokemon,
  buildField,
  calculateAllMovesGen3,
  findSetByLabel,
  POKEDEX_ADV,
  SETDEX_EM,
  type DamageResult,
} from './gen3calc'
import battleTrainers from './battle_trainers_em.json'
import trainerPokemon from './trainer_pokemon_em.json'
import './battle-facilities.css'

const BATTLE_RANGES = ['1-7', '8-14', '15-21', '22-28', '29-35', '36-42', '43-49', '50+'] as const

function getBattleRange(battleNum: number): string {
  if (battleNum >= 50) return '50+'
  const index = Math.floor((battleNum - 1) / 7)
  return BATTLE_RANGES[index] || '1-7'
}

function getTrainersForBattle(battleNum: number) {
  const range = getBattleRange(battleNum)
  return battleTrainers.filter(t => t.battleRanges.includes(range))
}

function getPokemonForTrainer(trainerName: string): string[] {
  return (trainerPokemon as Record<string, string[]>)[trainerName] || []
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
  const [battleNum, setBattleNum] = useState(1)
  const [trainerKey, setTrainerKey] = useState('')
  const [p2Label, setP2Label] = useState('')

  // Trainers available for current battle number
  const availableTrainers = useMemo(() => getTrainersForBattle(battleNum), [battleNum])

  // Auto-select first trainer when battle number changes
  const selectedTrainer = useMemo(() => {
    const match = availableTrainers.find(t => `${t.class} ${t.name}` === trainerKey)
    if (match) return match
    return availableTrainers[0] || null
  }, [availableTrainers, trainerKey])

  const effectiveTrainerKey = selectedTrainer ? `${selectedTrainer.class} ${selectedTrainer.name}` : ''

  // Pokemon sets available for selected trainer
  const availableSets = useMemo(() => {
    if (!selectedTrainer) return []
    return getPokemonForTrainer(selectedTrainer.name)
  }, [selectedTrainer])

  // Auto-select first pokemon when trainer changes
  const effectiveP2Label = useMemo(() => {
    if (availableSets.includes(p2Label)) return p2Label
    return availableSets[0] || ''
  }, [availableSets, p2Label])

  const { p1Results, p2Results } = useMemo(() => {
    if (!effectiveP2Label) return { p1Results: [], p2Results: [] }

    const claydolSet = SETDEX_EM["Claydol"]["Claydol-4 (717)"]
    const p1 = buildPokemon("Claydol", POKEDEX_ADV["Claydol"], claydolSet, "Claydol-4 (717)", 50)

    const p2Match = findSetByLabel(effectiveP2Label)
    if (!p2Match) return { p1Results: [], p2Results: [] }

    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return { p1Results: [], p2Results: [] }

    const p2 = buildPokemon(p2Match.species, p2Dex, p2Match.set, effectiveP2Label, 50)
    const field = buildField("singles", "")
    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, field)

    return { p1Results, p2Results }
  }, [effectiveP2Label])

  const handleBattleNumChange = (newNum: number) => {
    const clamped = Math.max(1, newNum)
    setBattleNum(clamped)
  }

  return (
    <div className="battle-facilities">
      <h2>Battle Facilities — Emerald</h2>
      <div className="bf-matchup">
        <MoveResults pokemonName="Claydol-4" results={p1Results} />
        <div className="bf-vs">vs.</div>
        <div className="bf-pokemon">
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
          <table className="bf-results-table">
            <thead>
              <tr>
                <th>Move</th>
                <th>Damage Range</th>
                <th>% Range</th>
              </tr>
            </thead>
            <tbody>
              {p2Results.map((result, i) => (
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
      </div>
    </div>
  )
}
