import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AvailablePokemon from './AvailablePokemon';
import ShadowPokemon from './ShadowPokemon';
import BySpecies from './BySpecies';
import ErrorBoundary from './ErrorBoundary';
import pokemonData from '../data/pokemon.json';
import type { PokemonDatabase } from './types';
import './switch-compatibility.css';

function GamesSection() {
  const navigate = useNavigate();
  const pokemonDb = pokemonData as PokemonDatabase;

  const handlePokemonSelect = (key: string) => {
    navigate(`/game-compatibility/species?p=${key}`);
  };

  return <AvailablePokemon pokemonDb={pokemonDb} onPokemonSelect={handlePokemonSelect} />;
}

function ShadowSection() {
  const navigate = useNavigate();
  const pokemonDb = pokemonData as PokemonDatabase;

  const handlePokemonSelect = (key: string) => {
    navigate(`/game-compatibility/species?p=${key}`);
  };

  return <ShadowPokemon pokemonDb={pokemonDb} onPokemonSelect={handlePokemonSelect} />;
}

function SpeciesPokemon() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pokemonKey = searchParams.get('p') || undefined;
  const pokemonDb = pokemonData as PokemonDatabase;

  const handlePokemonSelect = (key: string) => {
    navigate(`/game-compatibility/species?p=${key}`);
  };

  return <BySpecies pokemonDb={pokemonDb} initialPokemonKey={pokemonKey} onPokemonSelect={handlePokemonSelect} />;
}

export default function SwitchCompatibility() {
  const pokemonDb = pokemonData as PokemonDatabase;
  const location = useLocation();
  const isShadowMode = location.pathname.includes('/shadow');

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
    <div className={`switch-compatibility ${isShadowMode ? 'shadow-mode' : ''}`}>
      <div className="mode-selector">
        <NavLink
          to="/game-compatibility/games"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Availability by games
        </NavLink>
        <NavLink
          to="/game-compatibility/shadow"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Shadow Pokemon by games
        </NavLink>
        <NavLink
          to="/game-compatibility/species"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          Lookup by species
        </NavLink>
      </div>

      <div className="mode-content">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/game-compatibility/games" replace />} />
            <Route path="/games" element={<GamesSection />} />
            <Route path="/shadow" element={<ShadowSection />} />
            <Route path="/species" element={<SpeciesPokemon />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </div>
  );
}
