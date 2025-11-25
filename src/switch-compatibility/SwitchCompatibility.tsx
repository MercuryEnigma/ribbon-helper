import React, { useState } from 'react';
import AvailablePokemon from './AvailablePokemon';
import BySpecies from './BySpecies';
import ErrorBoundary from './ErrorBoundary';
import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from './types';
import './switch-compatibility.css';

type Mode = 'filter-by-games' | 'lookup-by-species';

export default function SwitchCompatibility() {
  const [mode, setMode] = useState<Mode>('filter-by-games');
  const pokemonDb = pokemonData as PokemonDatabase;

  if (!pokemonDb || typeof pokemonDb !== 'object') {
    return (
      <div className="error-boundary">
        <div className="error-message">
          <h3>Unable to load Pokémon data</h3>
          <p>The Pokémon database could not be loaded. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="switch-compatibility">
      <div className="mode-selector">
        <button
          className={mode === 'filter-by-games' ? 'active' : ''}
          onClick={() => setMode('filter-by-games')}
        >
          Filter by Games
        </button>
        <button
          className={mode === 'lookup-by-species' ? 'active' : ''}
          onClick={() => setMode('lookup-by-species')}
        >
          Lookup by Species
        </button>
      </div>

      <div className="mode-content">
        <ErrorBoundary key={mode}>
          {mode === 'filter-by-games' ? (
            <AvailablePokemon pokemonDb={pokemonDb} />
          ) : (
            <BySpecies pokemonDb={pokemonDb} />
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
}
