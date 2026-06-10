import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BattleFacilities from './BattleFacilities'

describe('BattleFacilities routes', () => {
  it('loads the Ruby/Sapphire calculator and requested mode', () => {
    render(
      <MemoryRouter initialEntries={['/battle-facilities/rs?mode=lvl100']}>
        <Routes>
          <Route path="/battle-facilities/:game" element={<BattleFacilities />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByDisplayValue('Ruby/Sapphire - Battle Tower')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Lvl 100' })).toBeChecked()
    expect(screen.getByRole('img', { name: 'Victory Ribbon' })).toBeInTheDocument()

    const natureSelect = screen.getByLabelText('Opponent nature')
    fireEvent.change(natureSelect, { target: { value: 'Adamant' } })
    expect(natureSelect).toHaveValue('Adamant')

    expect(screen.getByRole('link', { name: "Psychic J's Salamence / Registeel / Latios" }).closest('li'))
      .toHaveTextContent("Recommended team: Psychic J's Salamence / Registeel / Latios")
    expect(screen.getByRole('link', { name: "Venty's Latios / Metagross / Suicune" }).closest('li'))
      .toHaveTextContent("Emerald team: Venty's Latios / Metagross / Suicune")

    expect(screen.getByDisplayValue("Psychic J's Salamence / Registeel / Latios")).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Salamence (Psychic J RS Singles)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Registeel (Psychic J RS Singles)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Latios (Psychic J RS Singles)' })).toBeInTheDocument()
  })

  it('loads the Diamond/Pearl calculator and requested mode', () => {
    render(
      <MemoryRouter initialEntries={['/battle-facilities/dp?mode=singles']}>
        <Routes>
          <Route path="/battle-facilities/:game" element={<BattleFacilities />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByDisplayValue('Diamond / Pearl - Battle Tower')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Singles' })).toBeChecked()
    expect(screen.getByRole('img', { name: 'Ability Ribbon' })).toBeInTheDocument()

    const natureSelect = screen.getByLabelText('Opponent nature')
    fireEvent.change(natureSelect, { target: { value: 'Timid' } })
    expect(natureSelect).toHaveValue('Timid')
  })
})
