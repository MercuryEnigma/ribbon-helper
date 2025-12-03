import React, { useState, useMemo, useEffect } from 'react';
import type { PokemonDatabase } from './types';
import { getGamesForPokemon, getGameGroupNames, searchPokemonByName, getPokemonDisplayName } from './utils';
import { getPokemonIconProps } from './iconUtils';
import games from '../data/games.json';

interface BySpeciesProps {
  pokemonDb: PokemonDatabase;
  initialPokemonKey?: string;
  onPokemonSelect?: (key: string) => void;
}

export default function BySpecies({ pokemonDb, initialPokemonKey, onPokemonSelect }: BySpeciesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<string>(initialPokemonKey || '');
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedPokemonData = useMemo(() => {
    if (!pokemonDb || !selectedPokemon) return null;
    return pokemonDb[selectedPokemon] || null;
  }, [pokemonDb, selectedPokemon]);

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
    // Update URL when a Pokemon is selected
    if (onPokemonSelect) {
      onPokemonSelect(key);
    }
  };

  const availableGames = useMemo(() => {
    if (!pokemonDb || !selectedPokemon) return [];
    try {
      const gameIds = getGamesForPokemon(pokemonDb, selectedPokemon);
      const names = getGameGroupNames(gameIds);
      const order = ['Let\'s Go Pikachu / Eevee', 'Sword / Shield', 'Brilliant Diamond / Shining Pearl', 'Legends: Arceus', 'Scarlet / Violet'];
      return names.sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        const ao = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const bo = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        return ao - bo || a.localeCompare(b);
      });
    } catch (error) {
      console.error('Error getting available games:', error);
      return [];
    }
  }, [pokemonDb, selectedPokemon]);

  const displayName = useMemo(() => {
    if (!pokemonDb || !selectedPokemonData) return '';

    if (selectedPokemonData['data-source']) {
      const sourceData = pokemonDb[selectedPokemonData['data-source']];
      if (sourceData) {
        return getPokemonDisplayName(selectedPokemon, {
          ...selectedPokemonData,
          names: sourceData.names
        });
      }
    }

    return getPokemonDisplayName(selectedPokemon, selectedPokemonData);
  }, [pokemonDb, selectedPokemon, selectedPokemonData]);

  const natdexNumber = useMemo(() => {
    if (!pokemonDb || !selectedPokemonData) return '';
    let natdex = selectedPokemonData.natdex;
    if (!natdex && selectedPokemonData['data-source']) {
      natdex = pokemonDb[selectedPokemonData['data-source']]?.natdex;
    }
    return natdex ? `No. ${natdex.toString().padStart(3, '0')}` : '';
  }, [pokemonDb, selectedPokemonData]);

  const largeIconProps = useMemo(() => {
    if (!selectedPokemonData) return null;
    return getPokemonIconProps(selectedPokemon, selectedPokemonData, pokemonDb);
  }, [pokemonDb, selectedPokemon, selectedPokemonData]);

  const earliestGen = useMemo(() => {
    if (!pokemonDb || !selectedPokemonData) return '';
    try {
      const gameIds = (() => {
        const ownGames = Array.isArray(selectedPokemonData.games) ? selectedPokemonData.games : [];

        // If the form has explicit games, use them; otherwise, fall back to the base form's games.
        if (ownGames.length > 0 || !selectedPokemonData['data-source']) {
          return ownGames;
        }

        const baseKey = selectedPokemonData['data-source'];
        const baseGames = baseKey && pokemonDb[baseKey]?.games;
        return Array.isArray(baseGames) ? baseGames : [];
      })();

      let minGen: number | null = null;
      for (const id of gameIds) {
        const entry = (games as any)[id];
        const gen = entry?.gen ?? ((entry?.partOf && (games as any)[entry.partOf]?.gen) || null);
        if (gen !== null && (minGen === null || gen < minGen)) {
          minGen = gen;
        }
      }
      return minGen ? `Gen ${minGen}` : '';
    } catch {
      return '';
    }
  }, [pokemonDb, selectedPokemon, selectedPokemonData]);

  const isShadowPokemon = useMemo(() => {
    if (!selectedPokemonData?.flags) return false;
    return selectedPokemonData.flags.includes('colShadow') || selectedPokemonData.flags.includes('xdShadow');
  }, [selectedPokemonData]);

  return (
    <div className="by-species">
      <div className="pokemon-search">
        <h3>Choose a Pokémon:</h3>
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
        <div className="pokedex-entry">
          <div className="pokedex-entry-left">
            <div className="pokedex-entry-frame">
              <div className="pokedex-entry-bg">
                {largeIconProps && (
                  <img
                    className="pokedex-entry-image"
                    alt={displayName}
                    {...largeIconProps}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pokedex-entry-right">
            <div className="pokedex-entry-header">
              {largeIconProps && (
                <img
                  className="pokedex-entry-header-icon"
                  alt={displayName}
                  {...largeIconProps}
                />
              )}
              <div className="pokedex-entry-title">
                <span className="pokedex-entry-title-number">{natdexNumber}</span>
                <span className="pokedex-entry-title-name">{displayName}</span>
              </div>
              {isShadowPokemon && (
                <div className="shadow-pill">Shadow</div>
              )}
              {earliestGen && (
                <div className="pokedex-entry-gen">{earliestGen}</div>
              )}
            </div>
            <div className="pokedex-entry-rows">
              {availableGames.length === 0 ? (
                <div className="pokedex-row">
                  <div className="pokedex-row-label">Available in</div>
                  <div className="pokedex-row-value">Not in Switch titles</div>
                </div>
              ) : (
                availableGames.slice(0, 5).map(game => (
                  <div className="pokedex-row" key={game}>
                    <div className="pokedex-row-label">Available in</div>
                    <div className="pokedex-row-value">{game}</div>
                  </div>
                ))
              )}
            </div>
            {/* <div className="pokedex-entry-notes">
              Reserved for Pokédex entry text
            </div> */}
          </div>
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
