import React, { useState, useMemo } from 'react';
import type { PokemonDatabase } from './types';
import { GAME_GROUPS, filterPokemonByGames } from './utils';
import { getPokemonIconProps } from './iconUtils';

interface AvailablePokemonProps {
  pokemonDb: PokemonDatabase;
}

export default function AvailablePokemon({ pokemonDb }: AvailablePokemonProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);

  const toggleGame = (gameIds: string[]) => {
    setSelectedGames(prev => {
      const prevSet = new Set(prev);
      const allSelected = gameIds.every(id => prevSet.has(id));

      if (allSelected) {
        // Deselect all
        return prev.filter(id => !gameIds.includes(id));
      } else {
        // Select all - add only ones not already present
        const toAdd = gameIds.filter(id => !prevSet.has(id));
        return [...prev, ...toAdd];
      }
    });
  };

  const selectedGamesSet = useMemo(() => new Set(selectedGames), [selectedGames]);

  const filteredPokemon = useMemo(() => {
    if (!pokemonDb) return [];
    return filterPokemonByGames(pokemonDb, selectedGames);
  }, [pokemonDb, selectedGames]);

  return (
    <div className="available-pokemon">
      <div className="game-selector">
        <h3>Select Games:</h3>
        <div className="game-checkboxes">
          {GAME_GROUPS.map(group => {
            const allChecked = group.ids.every(id => selectedGamesSet.has(id));
            return (
              <label key={group.name} className="game-checkbox">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => toggleGame(group.ids)}
                />
                <span>{group.name}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pokemon-results">
        <h3>
          Available Pokémon ({filteredPokemon.length})
        </h3>
        {selectedGames.length === 0 ? (
          <p className="hint">Select one or more games above to see which Pokémon are available in all of them.</p>
        ) : (
          <>
            {filteredPokemon.length === 0 ? (
              <p className="no-results">No Pokémon found that are available in all selected games.</p>
            ) : (
              <>
                <div className="pokemon-icon-grid">
                  {filteredPokemon.map(pokemon => {
                    const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);
                    return (
                      <img
                        key={pokemon.key}
                        className="pokemon-icon-grid-item"
                        alt={pokemon.name}
                        title={pokemon.name}
                        {...iconProps}
                      />
                    );
                  })}
                </div>
                <div className="pokemon-list">
                  <ul>
                    {filteredPokemon.map(pokemon => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);
                      return (
                        <li key={pokemon.key}>
                          <img
                            className="pokemon-icon"
                            alt={pokemon.name}
                            {...iconProps}
                          />
                          <span className="pokemon-name">{pokemon.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
