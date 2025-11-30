import { useState, useMemo, useLayoutEffect, useRef } from 'react';
import type { PokemonDatabase, PokemonData } from './types';
import { GAME_GROUPS, getPokemonDisplayName } from './utils';
import { getPokemonIconProps } from './iconUtils';

interface ShadowPokemonProps {
  pokemonDb: PokemonDatabase;
  onPokemonSelect: (key: string) => void;
}

interface FilteredPokemon {
  key: string;
  name: string;
  data: PokemonData;
}

function filterShadowPokemonByGames(
  pokemonDb: PokemonDatabase,
  selectedGames: string[],
  shadowFilter: 'colosseum' | 'xd' | 'either'
): FilteredPokemon[] {
  if (!pokemonDb || selectedGames.length === 0) return [];

  const selectedSet = new Set(selectedGames);
  const results: FilteredPokemon[] = [];

  for (const [key, data] of Object.entries(pokemonDb)) {
    // Skip if no flags
    if (!data.flags) {
      continue;
    }

    // Apply shadow filter
    const hasColShadow = data.flags.includes('colShadow');
    const hasXdShadow = data.flags.includes('xdShadow');

    let matchesShadowFilter = false;
    if (shadowFilter === 'colosseum') {
      matchesShadowFilter = hasColShadow;
    } else if (shadowFilter === 'xd') {
      matchesShadowFilter = hasXdShadow;
    } else { // 'either'
      matchesShadowFilter = hasColShadow || hasXdShadow;
    }

    if (!matchesShadowFilter) {
      continue;
    }

    const pokemonGames = Array.isArray(data.games) ? data.games : [];

    // Check if Pokemon has all selected games
    const hasAllGames = selectedGames.every(gameId => pokemonGames.includes(gameId));

    if (hasAllGames) {
      let displayName = '';

      // Handle forms with data-source
      if (data['data-source']) {
        const sourceData = pokemonDb[data['data-source']];
        if (sourceData) {
          displayName = getPokemonDisplayName(key, {
            ...data,
            names: sourceData.names
          });
        }
      } else {
        displayName = getPokemonDisplayName(key, data);
      }

      results.push({ key, name: displayName, data });
    }
  }

  // Sort by natdex number
  results.sort((a, b) => {
    let aNum = a.data.natdex;
    let bNum = b.data.natdex;

    // If form, get base Pokemon's natdex
    if (!aNum && a.data['data-source']) {
      aNum = pokemonDb[a.data['data-source']]?.natdex;
    }
    if (!bNum && b.data['data-source']) {
      bNum = pokemonDb[b.data['data-source']]?.natdex;
    }

    if (!aNum && !bNum) return 0;
    if (!aNum) return 1;
    if (!bNum) return -1;

    return aNum - bNum;
  });

  return results;
}

type ShadowFilter = 'colosseum' | 'xd' | 'either';

export default function ShadowPokemon({ pokemonDb, onPokemonSelect }: ShadowPokemonProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>(() =>
    GAME_GROUPS.filter(group => group.name !== "Let's Go Pikachu / Eevee").flatMap(group => group.ids)
  );
  const [shadowFilter, setShadowFilter] = useState<ShadowFilter>('either');
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
    return filterShadowPokemonByGames(pokemonDb, selectedGames, shadowFilter);
  }, [pokemonDb, selectedGames, shadowFilter]);

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
    <div className="available-pokemon shadow-pokemon">
      <div className="game-selector shadow-selector">
        <h3>Select Games:</h3>
        <div className="shadow-filter-toggle">
          <button
            className={shadowFilter === 'colosseum' ? 'active' : ''}
            onClick={() => setShadowFilter('colosseum')}
          >
            Colosseum
          </button>
          <button
            className={shadowFilter === 'either' ? 'active' : ''}
            onClick={() => setShadowFilter('either')}
          >
            Either
          </button>
          <button
            className={shadowFilter === 'xd' ? 'active' : ''}
            onClick={() => setShadowFilter('xd')}
          >
            XD: Gale of Darkness
          </button>
        </div>
        <div className="game-checkboxes">
          {GAME_GROUPS.map(group => {
            const allChecked = group.ids.every(id => selectedGamesSet.has(id));
            return (
              <label key={group.name} className="game-checkbox shadow-checkbox">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => toggleGame(group.ids)}
                />
                <span className="toggle-label">{group.name}</span>
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pokemon-results shadow-results">
        <h3>
          Shadow Pokémon ({filteredPokemon.length})
        </h3>
        {selectedGames.length === 0 ? (
          <p className="hint shadow-hint">Select one or more games above to see which Shadow Pokémon are available in all of them.</p>
        ) : (
          <>
            {filteredPokemon.length === 0 ? (
              <p className="no-results shadow-no-results">No Shadow Pokémon found that are available in all selected games.</p>
            ) : (
              <div className="pokemon-results-content">
                <div className="pokemon-icon-grid shadow-grid" ref={iconGridRef}>
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
                  className="pokemon-list shadow-list"
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
