import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import type { PokemonDatabase } from './types';
import { GAME_GROUPS, filterPokemonByGames } from './utils';
import { getPokemonIconProps } from './iconUtils';

interface AvailablePokemonProps {
  pokemonDb: PokemonDatabase;
  onPokemonSelect: (key: string) => void;
}

export default function AvailablePokemon({ pokemonDb, onPokemonSelect }: AvailablePokemonProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const [highlightedPokemon, setHighlightedPokemon] = useState<string | null>(null);
  const iconGridRef = useRef<HTMLDivElement | null>(null);
  const listItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

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

  const handlePokemonClick = (pokemonKey: string) => {
    const listItem = listItemRefs.current.get(pokemonKey);
    if (listItem) {
      const container = listItem.closest('.pokemon-list ul');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = listItem.getBoundingClientRect();
        const scrollOffset = itemRect.top - containerRect.top - (containerRect.height / 2) + (itemRect.height / 2);
        const startPosition = container.scrollTop;
        const duration = 800; // ms
        const startTime = performance.now();

        const smoothScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeInOutQuad = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          container.scrollTop = startPosition + (scrollOffset * easeInOutQuad);

          if (progress < 1) {
            requestAnimationFrame(smoothScroll);
          }
        };

        requestAnimationFrame(smoothScroll);
      }

      setHighlightedPokemon(pokemonKey);

      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedPokemon(null);
      }, 2000);
    }
  };

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
                        onClick={() => handlePokemonClick(pokemon.key)}
                        style={{ cursor: 'pointer' }}
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
                        <li
                          key={pokemon.key}
                          ref={el => {
                            if (el) {
                              listItemRefs.current.set(pokemon.key, el);
                            } else {
                              listItemRefs.current.delete(pokemon.key);
                            }
                          }}
                          className={highlightedPokemon === pokemon.key ? 'highlighted' : ''}
                          onClick={() => onPokemonSelect(pokemon.key)}
                          style={{ cursor: 'pointer' }}
                        >
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
