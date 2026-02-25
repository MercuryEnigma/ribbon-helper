import { useMemo } from 'react'
import {
  buildPokemon,
  buildField,
  calculateAllMovesGen3,
  POKEDEX_GEN3,
  SETDEX_GEN3,
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

export default function BattleFacilities() {
  const { p1Results, p2Results, p1Label, p2Label } = useMemo(() => {
    const claydolSet = SETDEX_GEN3["Claydol"]["Claydol-4 (717)"]
    const clamperlSet = SETDEX_GEN3["Clamperl"]["Clamperl-1 (135)"]

    const p1 = buildPokemon("Claydol", POKEDEX_GEN3["Claydol"], claydolSet, "Claydol-4 (717)", 50)
    const p2 = buildPokemon("Clamperl", POKEDEX_GEN3["Clamperl"], clamperlSet, "Clamperl-1 (135)", 50)

    const field = buildField("singles", "")
    const [p1Results, p2Results] = calculateAllMovesGen3(p1, p2, field)

    return { p1Results, p2Results, p1Label: "Claydol-4", p2Label: "Clamperl-1" }
  }, [])

  return (
    <div className="battle-facilities">
      <h2>Battle Facilities — Emerald</h2>
      <div className="bf-matchup">
        <MoveResults pokemonName={p1Label} results={p1Results} />
        <div className="bf-vs">vs.</div>
        <MoveResults pokemonName={p2Label} results={p2Results} />
      </div>
    </div>
  )
}
