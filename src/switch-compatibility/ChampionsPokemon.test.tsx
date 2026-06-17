import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChampionsPokemon from './ChampionsPokemon';
import type { PokemonDatabase, PokemonNames } from './types';

const mockChampionsSets = vi.hoisted(() => ({
  regulationMA: new Set(['ma-only', 'shared', 'ma-sw-only', 'ma-bdsp-only']),
  regulationMB: new Set(['mb-only', 'shared'])
}));

vi.mock('./championsData', () => ({
  REGULATION_MA_POKEMON: mockChampionsSets.regulationMA,
  REGULATION_MB_POKEMON: mockChampionsSets.regulationMB,
  isChampionsPokemon: (key: string) =>
    mockChampionsSets.regulationMA.has(key) || mockChampionsSets.regulationMB.has(key)
}));

const names = (en: string): PokemonNames => ({
  en,
  'es-es': '',
  fr: '',
  de: '',
  it: '',
  ja: '',
  ko: '',
  'zh-Hans': '',
  'zh-Hant': ''
});

const allDefaultGames = ['sw', 'sh', 'bd', 'sp', 'pla', 'scar', 'vio'];

const mockDb: PokemonDatabase = {
  'ma-only': {
    names: names('M-A Only'),
    gender: 'both',
    natdex: 1,
    games: allDefaultGames
  },
  'mb-only': {
    names: names('M-B Only'),
    gender: 'both',
    natdex: 2,
    games: allDefaultGames
  },
  shared: {
    names: names('Shared'),
    gender: 'both',
    natdex: 3,
    games: allDefaultGames
  },
  'ma-sw-only': {
    names: names('M-A SW Only'),
    gender: 'both',
    natdex: 4,
    games: ['sw', 'sh']
  },
  'ma-bdsp-only': {
    names: names('M-A BDSP Only'),
    gender: 'both',
    natdex: 5,
    games: ['bd', 'sp']
  }
};

function renderChampionsPokemon() {
  return render(<ChampionsPokemon pokemonDb={mockDb} onPokemonSelect={vi.fn()} />);
}

describe('ChampionsPokemon', () => {
  it('renders the requested Champions format options', () => {
    renderChampionsPokemon();

    const select = screen.getByLabelText('Champions format:') as HTMLSelectElement;
    const options = Array.from(select.options).map(option => option.textContent);

    expect(select.value).toBe('any');
    expect(options).toEqual(['Regulation M-A', 'Regulation M-B', 'Any']);
  });

  it('defaults Any to Pokemon from either regulation', () => {
    renderChampionsPokemon();

    expect(screen.getByText('M-A Only')).toBeInTheDocument();
    expect(screen.getByText('M-B Only')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('filters to Regulation M-A only', () => {
    renderChampionsPokemon();

    fireEvent.change(screen.getByLabelText('Champions format:'), {
      target: { value: 'regulationMA' }
    });

    expect(screen.getByText('M-A Only')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.queryByText('M-B Only')).not.toBeInTheDocument();
  });

  it('filters to Regulation M-B only', () => {
    renderChampionsPokemon();

    fireEvent.change(screen.getByLabelText('Champions format:'), {
      target: { value: 'regulationMB' }
    });

    expect(screen.getByText('M-B Only')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.queryByText('M-A Only')).not.toBeInTheDocument();
  });

  it('intersects the regulation filter with selected games', () => {
    renderChampionsPokemon();

    fireEvent.change(screen.getByLabelText('Champions format:'), {
      target: { value: 'regulationMA' }
    });
    fireEvent.click(screen.getByLabelText(/Brilliant Diamond \/ Shining Pearl/i));
    fireEvent.click(screen.getByLabelText(/Legends: Arceus/i));
    fireEvent.click(screen.getByLabelText(/Scarlet \/ Violet/i));

    expect(screen.getByText('M-A SW Only')).toBeInTheDocument();
    expect(screen.queryByText('M-A BDSP Only')).not.toBeInTheDocument();
  });
});
