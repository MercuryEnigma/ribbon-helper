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
    expect(screen.getByText('Choose Games:')).toBeInTheDocument();
  });

  it('should show all Pokemon when no games selected', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    // Deselect all games by clicking each checked checkbox
    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    const bdspCheckbox = screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i });
    const legendsCheckbox = screen.getByRole('checkbox', { name: /Legends: Arceus/i });
    const scarletCheckbox = screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i });

    fireEvent.click(swordShieldCheckbox);
    fireEvent.click(bdspCheckbox);
    fireEvent.click(legendsCheckbox);
    fireEvent.click(scarletCheckbox);

    expect(screen.getByText(/Available Pokémon \(3\)/i)).toBeInTheDocument();
  });

  it('should display all game checkboxes', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);
    expect(screen.getByRole('checkbox', { name: /Let's Go Pikachu \/ Eevee/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Sword \/ Shield/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Legends: Arceus/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i })).toBeInTheDocument();
  });

  it('should filter Pokemon when games are selected', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    // First deselect all default-selected games
    fireEvent.click(screen.getByRole('checkbox', { name: /Sword \/ Shield/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Legends: Arceus/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i }));

    // Now select only Sword/Shield
    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    fireEvent.click(swordShieldCheckbox);

    // All 3 Pokemon are in Sword/Shield
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('Meowth')).toBeInTheDocument();
  });

  it('should show Pokemon available in ALL selected games', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    // First deselect all default-selected games
    fireEvent.click(screen.getByRole('checkbox', { name: /Sword \/ Shield/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Legends: Arceus/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i }));

    // Select both Sword/Shield and Let's Go
    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    const letsGoCheckbox = screen.getByRole('checkbox', { name: /Let's Go/i });

    fireEvent.click(swordShieldCheckbox);
    fireEvent.click(letsGoCheckbox);

    // Only Pikachu is in both
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument();
    expect(screen.queryByText('Meowth')).not.toBeInTheDocument();
  });

  it('should deselect games when clicked again', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i }) as HTMLInputElement;

    // Starts checked by default
    expect(swordShieldCheckbox.checked).toBe(true);

    // Click to deselect
    fireEvent.click(swordShieldCheckbox);
    expect(swordShieldCheckbox.checked).toBe(false);

    // Deselect remaining games
    fireEvent.click(screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Legends: Arceus/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i }));

    // No selected games means no availability restriction
    expect(screen.getByText(/Available Pokémon \(3\)/i)).toBeInTheDocument();
  });

  it('should display Pokemon count', () => {
    render(<AvailablePokemon pokemonDb={mockDb} />);

    // First deselect all default-selected games
    fireEvent.click(screen.getByRole('checkbox', { name: /Sword \/ Shield/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Brilliant Diamond \/ Shining Pearl/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Legends: Arceus/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Scarlet \/ Violet/i }));

    // Now select only Sword/Shield
    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    fireEvent.click(swordShieldCheckbox);

    expect(screen.getByText(/Available Pokémon \(3\)/i)).toBeInTheDocument();
  });

  it('should handle empty database gracefully', () => {
    render(<AvailablePokemon pokemonDb={{}} />);

    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    fireEvent.click(swordShieldCheckbox);

    expect(screen.getByText(/No Pokémon found/i)).toBeInTheDocument();
  });

  it('should handle null database gracefully', () => {
    render(<AvailablePokemon pokemonDb={null as any} />);

    const swordShieldCheckbox = screen.getByRole('checkbox', { name: /Sword \/ Shield/i });
    fireEvent.click(swordShieldCheckbox);

    // Should not crash and should show appropriate message
    expect(screen.queryByText(/Select one or more games/i)).not.toBeInTheDocument();
  });
});
