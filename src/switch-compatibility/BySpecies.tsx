import React, { useState, useMemo, useEffect } from 'react';
import type { PokemonDatabase } from './types';
import { getGamesForPokemon, getGameGroupNames, searchPokemonByName, getPokemonDisplayName } from './utils';
import { getPokemonIconProps } from './iconUtils';

interface BySpeciesProps {
  pokemonDb: PokemonDatabase;
  initialPokemonKey?: string;
}

export default function BySpecies({ pokemonDb, initialPokemonKey }: BySpeciesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<string>(initialPokemonKey || '');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (initialPokemonKey && pokemonDb[initialPokemonKey]) {
      setSelectedPokemon(initialPokemonKey);
      const pokemonData = pokemonDb[initialPokemonKey];

      // For forms with data-source, we need to get the base name from the source Pokemon
      let displayName = '';
      if (pokemonData['data-source']) {
        const sourceData = pokemonDb[pokemonData['data-source']];
        if (sourceData) {
          displayName = getPokemonDisplayName(initialPokemonKey, {
            ...pokemonData,
            names: sourceData.names
          });
        }
      } else {
        displayName = getPokemonDisplayName(initialPokemonKey, pokemonData);
      }

      setSearchTerm(displayName);
    }
  }, [initialPokemonKey, pokemonDb]);

  const searchResults = useMemo(() => {
    if (!pokemonDb || searchTerm.length < 2) return [];
    try {
      return searchPokemonByName(pokemonDb, searchTerm).slice(0, 50);
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      return [];
    }
  }, [pokemonDb, searchTerm]);

  const handleSelect = (key: string, name: string) => {
    if (!key || !name) return;
    setSelectedPokemon(key);
    setSearchTerm(name);
    setShowDropdown(false);
  };

  const availableGames = useMemo(() => {
    if (!pokemonDb || !selectedPokemon) return [];
    try {
      const gameIds = getGamesForPokemon(pokemonDb, selectedPokemon);
      return getGameGroupNames(gameIds);
    } catch (error) {
      console.error('Error getting available games:', error);
      return [];
    }
  }, [pokemonDb, selectedPokemon]);

  return (
    <div className="by-species">
      <div className="pokemon-search">
        <h3>Select a Pokémon:</h3>
        <div className="combobox-container">
          <input
            type="text"
            className="combobox-input"
            placeholder="Type to search..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              setSelectedPokemon('');
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {showDropdown && searchResults.length > 0 && (
            <ul className="combobox-dropdown">
              {searchResults.map(result => {
                const pokemonData = pokemonDb[result.key];
                if (!pokemonData) return null;
                const iconProps = getPokemonIconProps(result.key, pokemonData, pokemonDb);
                return (
                  <li
                    key={result.key}
                    onMouseDown={() => handleSelect(result.key, result.name)}
                    className="combobox-option"
                  >
                    <img
                      className="pokemon-icon-small"
                      alt={result.name}
                      {...iconProps}
                    />
                    <span>{result.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selectedPokemon && (
        <div className="game-results">
          <h3>Available in:</h3>
          {availableGames.length === 0 ? (
            <p className="no-results">This Pokémon is not available in any Switch games.</p>
          ) : (
            <ul className="game-list">
              {availableGames.map(game => (
                <li key={game}>{game}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!selectedPokemon && searchTerm.length > 0 && (
        <p className="hint">Select a Pokémon from the dropdown to see which Switch games it's available in.</p>
      )}

      {!searchTerm && (
        <p className="hint">Start typing a Pokémon name to search.</p>
      )}
    </div>
  );
}
