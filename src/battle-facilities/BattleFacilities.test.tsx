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
  })
})
