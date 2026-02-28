import { useState, useMemo } from 'react'
import {
  buildPokemon,
  buildField,
  calculateAllMovesGen3,
  findSetByLabel,
  POKEDEX_ADV,
  type DamageResult,
} from './gen3calc'
import { TEAM_EM } from './setteam_gen3'
import battleTrainers from './battle_trainers_em.json'
import trainerPokemon from './trainer_pokemon_em.json'
import './battle-facilities.css'

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

const P1_OPTIONS = Object.keys(TEAM_EM)

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
  const [p1Label, setP1Label] = useState(P1_OPTIONS[0])
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

  const p2Ivs = getIVsForBattle(battleNum)

  const { p1Results, p2Results } = useMemo(() => {
    if (!effectiveP2Label) return { p1Results: [], p2Results: [] }

    const p1Sets = TEAM_EM[p1Label]
    if (!p1Sets) return { p1Results: [], p2Results: [] }
    const p1Set = Object.values(p1Sets)[0]
    const p1Dex = POKEDEX_ADV[p1Label]
    if (!p1Dex) return { p1Results: [], p2Results: [] }
    const p1 = buildPokemon(p1Label, p1Dex, p1Set, p1Label, 50)

    const p2Match = findSetByLabel(effectiveP2Label)
    if (!p2Match) return { p1Results: [], p2Results: [] }
    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return { p1Results: [], p2Results: [] }
    const p2 = buildPokemon(p2Match.species, p2Dex, p2Match.set, effectiveP2Label, 50, p2Ivs)

    const field = buildField("singles", "")
    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, field)

    return { p1Results, p2Results }
  }, [p1Label, effectiveP2Label, p2Ivs])

  const handleBattleNumChange = (newNum: number) => {
    const clamped = Math.max(1, newNum)
    setBattleNum(clamped)
  }

  return (
    <div className="battle-facilities">
      <h2>Battle Facilities — Emerald</h2>
      <p className="bf-team-note">
        Recommended team: <a href="https://pokepast.es/9f353ea337d86f51" target="_blank" rel="noopener noreferrer">Venty's Latios / Metagross / Suicune</a>
      </p>
      <div className="bf-matchup">
        <div className="bf-pokemon">
          <div className="bf-p1-selector">
            <label>Your Pokemon</label>
            <select
              value={p1Label}
              onChange={e => setP1Label(e.target.value)}
            >
              {P1_OPTIONS.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
          <MoveResults pokemonName={p1Label} results={p1Results} />
        </div>
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
