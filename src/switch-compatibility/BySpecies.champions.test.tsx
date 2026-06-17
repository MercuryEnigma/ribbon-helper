import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BySpecies from './BySpecies';
import type { PokemonDatabase, PokemonNames } from './types';

vi.mock('./championsData', () => ({
  isChampionsPokemon: (key: string) => key === 'mb-only'
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

const mockDb: PokemonDatabase = {
  'mb-only': {
    names: names('M-B Only'),
    gender: 'both',
    natdex: 1,
    games: ['sw', 'sh']
  }
};

describe('BySpecies Champions availability', () => {
  it('shows Champions for a Regulation M-B Pokemon', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <BySpecies pokemonDb={mockDb} />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText(/Type to search/i), 'm-b');
    fireEvent.mouseDown(await screen.findByText('M-B Only'));

    await waitFor(() => {
      expect(screen.getByText('Champions')).toBeInTheDocument();
    });
  });
});
