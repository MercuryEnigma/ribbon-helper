import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AvailablePokemon from './AvailablePokemon';
import type { PokemonDatabase } from './types';

const mockDb: PokemonDatabase = {
  bulbasaur: {
    names: { en: 'Bulbasaur', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
    gender: 'both',
    natdex: 1,
    games: ['sw', 'sh', 'bd', 'sp'],
  },
  pikachu: {
    names: { en: 'Pikachu', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
    gender: 'both',
    natdex: 25,
    games: ['sw', 'sh', 'lgp', 'lge'],
  },
  meowth: {
    names: { en: 'Meowth', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
    gender: 'both',
    natdex: 52,
    games: ['sw', 'sh', 'scar', 'vio'],
  },
};

describe('AvailablePokemon', () => {
  it('should render without crashing', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);
    expect(screen.getByText('Select Games:')).toBeInTheDocument();
  });

  it('should show hint when no games selected', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);
    expect(screen.getByText(/Select one or more games/i)).toBeInTheDocument();
  });

  it('should display all game checkboxes', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);
    expect(screen.getByLabelText(/Let's Go Pikachu \/ Eevee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Sword \/ Shield/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Brilliant Diamond \/ Shining Pearl/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Legends: Arceus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scarlet \/ Violet/i)).toBeInTheDocument();
  });

  it('should filter Pokemon when games are selected', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i);
    fireEvent.click(swordShieldCheckbox);

    // All 3 Pokemon are in Sword/Shield
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Meowth')).toBeInTheDocument();
  });

  it('should show Pokemon available in ALL selected games', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    // Select both Sword/Shield and Let's Go
    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i);
    const letsGoCheckbox = screen.getByLabelText(/Let's Go/i);

    fireEvent.click(swordShieldCheckbox);
    fireEvent.click(letsGoCheckbox);

    // Only Pikachu is in both
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument();
    expect(screen.queryByText('Meowth')).not.toBeInTheDocument();
  });

  it('should deselect games when clicked again', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i) as HTMLInputElement;

    fireEvent.click(swordShieldCheckbox);
    expect(swordShieldCheckbox.checked).toBe(true);

    fireEvent.click(swordShieldCheckbox);
    expect(swordShieldCheckbox.checked).toBe(false);

    // Should show hint again
    expect(screen.getByText(/Select one or more games/i)).toBeInTheDocument();
  });

  it('should display Pokemon count', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i);
    fireEvent.click(swordShieldCheckbox);

    expect(screen.getByText(/Available Pokémon \(3\)/i)).toBeInTheDocument();
  });

  it('should handle empty database gracefully', () => {
    render(<AvailablePokemon pokemonDb={{}} />);

    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i);
    fireEvent.click(swordShieldCheckbox);

    expect(screen.getByText(/No Pokémon found/i)).toBeInTheDocument();
  });

  it('should handle null database gracefully', () => {
    render(<AvailablePokemon pokemonDb={null as any} />);

    const swordShieldCheckbox = screen.getByLabelText(/Sword \/ Shield/i);
    fireEvent.click(swordShieldCheckbox);

    // Should not crash and should show appropriate message
    expect(screen.queryByText(/Select one or more games/i)).not.toBeInTheDocument();
  });
});
