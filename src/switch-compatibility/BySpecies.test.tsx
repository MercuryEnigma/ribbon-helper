import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BySpecies from './BySpecies';
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
    games: ['sw', 'sh', 'lgp', 'lge', 'scar', 'vio'],
  },
  'pikachu-alola-cap': {
    'data-source': 'pikachu',
    forms: { en: 'Alola Cap', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
    gender: 'male',
    natdex: 25,
    sort: 1,
    games: ['sun', 'moon', 'sw', 'sh'],
  },
  meowth: {
    names: { en: 'Meowth', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
    gender: 'both',
    natdex: 52,
    games: ['sw', 'sh'],
  },
};

describe('BySpecies', () => {
  it('should render without crashing', () => {
    render(<BySpecies pokemonDb={mockDb} />);
    expect(screen.getByText('Choose a Pokémon:')).toBeInTheDocument();
  });

  it('should show initial hint', () => {
    render(<BySpecies pokemonDb={mockDb} />);
    expect(screen.getByText(/Start typing a Pokémon name/i)).toBeInTheDocument();
  });

  it('should show dropdown when typing', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'pika');

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });
  });

  it('should not show dropdown for short search terms', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'p');

    // Should not show dropdown for single character
    expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
  });

  it('should display search results in dropdown', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'pika');

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
      expect(screen.getByText(/Pikachu \(Alola Cap\)/i)).toBeInTheDocument();
    });
  });

  it('should show available games when Pokemon is selected', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'pika');

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    const pikachuOption = screen.getByText('Pikachu');
    fireEvent.mouseDown(pikachuOption);

    await waitFor(() => {
      const availableInLabels = screen.getAllByText(/Available in$/i);
      expect(availableInLabels.length).toBeGreaterThan(0);
      expect(screen.getByText(/Sword \/ Shield/i)).toBeInTheDocument();
      expect(screen.getByText(/Let's Go Pikachu \/ Eevee/i)).toBeInTheDocument();
      expect(screen.getByText(/Scarlet \/ Violet/i)).toBeInTheDocument();
    });
  });

  it('should handle Pokemon with no Switch games', async () => {
    const dbWithOldPokemon: PokemonDatabase = {
      ...mockDb,
      oldmon: {
        names: { en: 'Oldmon', 'es-es': '', fr: '', de: '', it: '', ja: '', ko: '', 'zh-Hans': '', 'zh-Hant': '' },
        gender: 'both',
        natdex: 999,
        games: ['x', 'y', 'or', 'as'], // Only 3DS games
      },
    };

    const user = userEvent.setup();
    render(<BySpecies pokemonDb={dbWithOldPokemon} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'oldmon');

    await waitFor(() => {
      expect(screen.getByText('Oldmon')).toBeInTheDocument();
    });

    const oldmonOption = screen.getByText('Oldmon');
    fireEvent.mouseDown(oldmonOption);

    await waitFor(() => {
      expect(screen.getByText(/Not in Switch titles/i)).toBeInTheDocument();
    });
  });

  it('should handle empty database gracefully', () => {
    render(<BySpecies pokemonDb={{}} />);
    expect(screen.getByText(/Start typing a Pokémon name/i)).toBeInTheDocument();
  });

  it('should handle null database gracefully', () => {
    render(<BySpecies pokemonDb={null as any} />);
    expect(screen.getByText(/Start typing a Pokémon name/i)).toBeInTheDocument();
  });

  it('should clear selection when input is changed', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i) as HTMLInputElement;
    await user.type(input, 'pika');

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });

    const pikachuOption = screen.getByText('Pikachu');
    fireEvent.mouseDown(pikachuOption);

    await waitFor(() => {
      const availableInLabels = screen.getAllByText(/Available in$/i);
      expect(availableInLabels.length).toBeGreaterThan(0);
    });

    // Clear and type new search
    await user.clear(input);
    await user.type(input, 'bulba');

    await waitFor(() => {
      expect(screen.queryAllByText(/Available in$/i).length).toBe(0);
    });
  });

  it('should be case insensitive', async () => {
    const user = userEvent.setup();
    render(<BySpecies pokemonDb={mockDb} />);

    const input = screen.getByPlaceholderText(/Type to search/i);
    await user.type(input, 'PIKA');

    await waitFor(() => {
      expect(screen.getByText('Pikachu')).toBeInTheDocument();
    });
  });
});
