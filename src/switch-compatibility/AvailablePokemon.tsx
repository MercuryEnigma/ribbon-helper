import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import type { PokemonDatabase } from './types';
import { GAME_GROUPS, filterPokemonByGames } from './utils';
import { getPokemonIconProps } from './iconUtils';

interface AvailablePokemonProps {
  pokemonDb: PokemonDatabase;
}

export default function AvailablePokemon({ pokemonDb }: AvailablePokemonProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const iconGridRef = useRef<HTMLDivElement | null>(null);

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

  useLayoutEffect(() => {
    const measure = () => {
      if (iconGridRef.current) {
        setGridHeight(iconGridRef.current.getBoundingClientRect().height);
      }
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [filteredPokemon.length]);

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
              <div className="pokemon-results-content">
                <div className="pokemon-icon-grid" ref={iconGridRef}>
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
                <div
                  className="pokemon-list"
                  style={gridHeight ? { height: gridHeight } : undefined}
                >
                  <ul>
                    {filteredPokemon.map(pokemon => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);

                      // Get natdex - if form, look up base Pokemon's natdex
                      let natdex = pokemon.data.natdex;
                      if (!natdex && pokemon.data['data-source']) {
                        natdex = pokemonDb[pokemon.data['data-source']]?.natdex;
                      }
                      const displayNumber = natdex ? `No. ${natdex.toString().padStart(3, '0')}` : '';

                      return (
                        <li key={pokemon.key}>
                          <img
                            className="pokemon-icon"
                            alt={pokemon.name}
                            {...iconProps}
                          />
                          <span className="pokemon-number">{displayNumber}</span>
                          <span className="pokemon-name">{pokemon.name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
