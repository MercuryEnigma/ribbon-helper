import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from './types';
import AvailablePokemon from './AvailablePokemon';
import BySpecies from './BySpecies';
import ShadowPokemon from './ShadowPokemon';
import SwitchCompatibility from './SwitchCompatibility';
const FRLG_SWITCH_NAME = 'FireRed / LeafGreen (Switch)';
const FRLG_SWITCH_ORIGIN = 'FRLG (Switch)';

const db = pokemonData as PokemonDatabase;
const subset = Object.fromEntries(['pikachu', 'mew', 'togepi', 'sylveon', 'eevee'].map(key => [key, db[key]]));

describe('FRLG Switch pages', () => {
  it('leaves FRLG unchecked by default and filters to native species when selected', () => {
    const select = vi.fn();
    render(<AvailablePokemon pokemonDb={subset} onPokemonSelect={select} />);
    const frlg = screen.getByRole('checkbox', { name: FRLG_SWITCH_NAME });
    expect(frlg).not.toBeChecked();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    fireEvent.click(frlg);
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Togepi')).toBeInTheDocument();
    expect(screen.queryByText('Mew')).not.toBeInTheDocument();
    expect(screen.queryByText('Sylveon')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Pikachu'));
    expect(select).toHaveBeenCalledWith('pikachu');
  });

  it('uses the normal species link without a separate origin parameter', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/game-compatibility/species?p=pikachu']}>
        <Routes><Route path="/game-compatibility/*" element={<SwitchCompatibility />} /></Routes>
      </MemoryRouter>,
    );
    expect(container.querySelector('.pokedex-entry-gen')).toHaveValue('Gen 3');
    expect(screen.getByText(FRLG_SWITCH_NAME)).toBeInTheDocument();
  });

  it('filters Shadow Pokémon through game availability like LGPE', () => {
    render(<ShadowPokemon pokemonDb={subset} onPokemonSelect={() => {}} />);
    const frlg = screen.getByRole('checkbox', { name: FRLG_SWITCH_NAME });
    expect(frlg).not.toBeChecked();
    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
    }
    fireEvent.click(frlg);
    expect(screen.getAllByText('Togepi').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transfer out only!').length).toBeGreaterThan(0);
  });

  it.each([1440, 390])('offers a distinct origin and Champion Ribbon at viewport width %i', width => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    const { container } = render(
      <MemoryRouter><BySpecies pokemonDb={subset} initialPokemonKey="pikachu" /></MemoryRouter>,
    );
    const origin = container.querySelector('.pokedex-entry-gen') as HTMLSelectElement;
    expect(within(origin).getByRole('option', { name: FRLG_SWITCH_ORIGIN })).toBeInTheDocument();
    expect(screen.getByText(FRLG_SWITCH_NAME)).toBeInTheDocument();
    fireEvent.change(origin, { target: { value: FRLG_SWITCH_ORIGIN } });
    expect(screen.getByText(FRLG_SWITCH_NAME)).toBeInTheDocument();
    expect(container.querySelector('.ribbons-grid img[alt="Champion Ribbon"]')).toBeInTheDocument();
    expect(container.querySelector('.ribbons-mobile-layout img[alt="Champion Ribbon"]')).toBeInTheDocument();
    expect(screen.queryByText('RSE')).not.toBeInTheDocument();
    const desktopRows = [...container.querySelectorAll('.ribbons-grid-row')];
    const swsh = desktopRows.find(row => row.querySelector('.ribbon-game-tag')?.textContent === 'SwSh')!;
    const sv = desktopRows.find(row => row.querySelector('.ribbon-game-tag')?.textContent === 'SV')!;
    expect(swsh.querySelector('img[alt="Master Rank Ribbon"]')).toBeInTheDocument();
    expect(sv.querySelector('img[alt="Master Rank Ribbon"]')).not.toBeInTheDocument();
    const mobileGame = container.querySelector('.ribbons-mobile-dropdown')!;
    fireEvent.change(mobileGame, { target: { value: 'SV' } });
    expect(container.querySelector('.ribbons-mobile-layout img[alt="Master Rank Ribbon"]')).not.toBeInTheDocument();
    fireEvent.change(mobileGame, { target: { value: 'SwSh' } });
    expect(container.querySelector('.ribbons-mobile-layout img[alt="Master Rank Ribbon"]')).toBeInTheDocument();
  });
});
