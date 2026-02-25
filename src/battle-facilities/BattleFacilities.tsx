import { useState, useMemo } from 'react'
import {
  buildPokemon,
  buildField,
  calculateAllMovesGen3,
  getAllSetLabels,
  findSetByLabel,
  POKEDEX_ADV,
  SETDEX_EM,
  type DamageResult,
} from './gen3calc'
import './battle-facilities.css'

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

const allSetLabels = getAllSetLabels()

export default function BattleFacilities() {
  const [p2Label, setP2Label] = useState('Clamperl-1 (135)')

  const { p1Results, p2Results } = useMemo(() => {
    const claydolSet = SETDEX_EM["Claydol"]["Claydol-4 (717)"]
    const p1 = buildPokemon("Claydol", POKEDEX_ADV["Claydol"], claydolSet, "Claydol-4 (717)", 50)

    const p2Match = findSetByLabel(p2Label)
    if (!p2Match) return { p1Results: [], p2Results: [] }

    const p2Dex = POKEDEX_ADV[p2Match.species]
    if (!p2Dex) return { p1Results: [], p2Results: [] }

    const p2 = buildPokemon(p2Match.species, p2Dex, p2Match.set, p2Label, 50)
    const field = buildField("singles", "")
    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, field)

    return { p1Results, p2Results }
  }, [p2Label])

  return (
    <div className="battle-facilities">
      <h2>Battle Facilities — Emerald</h2>
      <div className="bf-matchup">
        <MoveResults pokemonName="Claydol-4" results={p1Results} />
        <div className="bf-vs">vs.</div>
        <div className="bf-pokemon">
          <div className="bf-p2-selector">
            <label htmlFor="p2-select">Opponent</label>
            <select
              id="p2-select"
              value={p2Label}
              onChange={e => setP2Label(e.target.value)}
            >
              {allSetLabels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
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
