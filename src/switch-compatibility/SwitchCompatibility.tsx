import { Routes, Route, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import AvailablePokemon from './AvailablePokemon';
import BySpecies from './BySpecies';
import ErrorBoundary from './ErrorBoundary';
import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from './types';
import './switch-compatibility.css';

function GamesSection() {
  const navigate = useNavigate();
  const pokemonDb = pokemonData as PokemonDatabase;

  const handlePokemonSelect = (key: string) => {
    navigate(`/game-compatibility/species/${key}`);
  };

  return <AvailablePokemon pokemonDb={pokemonDb} onPokemonSelect={handlePokemonSelect} />;
}

function SpeciesSection() {
  const pokemonDb = pokemonData as PokemonDatabase;
  return <BySpecies pokemonDb={pokemonDb} />;
}

function SpeciesPokemon() {
  const { pokemonKey } = useParams<{ pokemonKey: string }>();
  const pokemonDb = pokemonData as PokemonDatabase;
  return <BySpecies pokemonDb={pokemonDb} initialPokemonKey={pokemonKey} />;
}

export default function SwitchCompatibility() {
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
        <NavLink
          to="/game-compatibility/games"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Filter by Games
        </NavLink>
        <NavLink
          to="/game-compatibility/species"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Lookup by Species
        </NavLink>
      </div>

      <div className="mode-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/game-compatibility/games" replace />} />
            <Route path="/games" element={<GamesSection />} />
            <Route path="/species" element={<SpeciesSection />} />
            <Route path="/species/:pokemonKey" element={<SpeciesPokemon />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}
