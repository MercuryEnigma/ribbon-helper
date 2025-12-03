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
  shadowSource?: 'colosseum' | 'xd'; // Track which game the shadow version is from
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

    const pokemonGames = Array.isArray(data.games) ? data.games : [];

    // Check if Pokemon has all selected games
    const hasAllGames = selectedGames.every(gameId => pokemonGames.includes(gameId));

    if (!hasAllGames) {
      continue;
    }

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

    // Special handling for Togepi when "either" is selected
    if (key === 'togepi' && shadowFilter === 'either' && hasColShadow && hasXdShadow) {
      // Add Colosseum version (e-reader)
      results.push({ key, name: displayName, data, shadowSource: 'colosseum' });
      // Add XD version (non e-reader)
      results.push({ key, name: displayName, data, shadowSource: 'xd' });
    } else {
      // Normal filtering logic
      let matchesShadowFilter = false;
      let shadowSource: 'colosseum' | 'xd' | undefined;

      if (shadowFilter === 'colosseum') {
        matchesShadowFilter = hasColShadow;
        shadowSource = 'colosseum';
      } else if (shadowFilter === 'xd') {
        matchesShadowFilter = hasXdShadow;
        shadowSource = 'xd';
      } else { // 'either'
        matchesShadowFilter = hasColShadow || hasXdShadow;
        // Determine which version
        if (hasColShadow && hasXdShadow) {
          shadowSource = 'colosseum'; // Default to colosseum if both
        } else if (hasColShadow) {
          shadowSource = 'colosseum';
        } else if (hasXdShadow) {
          shadowSource = 'xd';
        }
      }

      if (matchesShadowFilter) {
        results.push({ key, name: displayName, data, shadowSource });
      }
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
  const iconGridContainerRef = useRef<HTMLDivElement | null>(null);
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
      if (iconGridContainerRef.current) {
        setGridHeight(iconGridContainerRef.current.getBoundingClientRect().height);
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
        <h3>Choose Games:</h3>
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
                <span className="toggle-track" aria-hidden="true">
                  {allChecked && <span className="toggle-check">✓</span>}
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
                <div ref={iconGridContainerRef}>
                  <div className="pokemon-icon-grid shadow-grid">
                    {filteredPokemon.map((pokemon, index) => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);
                      const hasOverFifty = pokemon.data.flags?.includes('overFifty');
                      const hasRestricted = pokemon.data.flags?.includes('restricted');
                      // Check if e-reader exclusive based on shadowSource
                      const isEReader = pokemon.shadowSource === 'colosseum' && ['mareep', 'scizor', 'togepi'].includes(pokemon.key);
                      const classNames = ['pokemon-icon-grid-item'];
                      if (hasOverFifty) classNames.push('over-fifty');
                      if (hasRestricted) classNames.push('restricted');
                      if (isEReader) classNames.push('ereader');
                      // Use index in key to handle duplicate Togepi entries
                      const uniqueKey = pokemon.shadowSource ? `${pokemon.key}-${pokemon.shadowSource}` : `${pokemon.key}-${index}`;
                      return (
                        <img
                          key={uniqueKey}
                          className={classNames.join(' ')}
                          alt={pokemon.name}
                          title={pokemon.name}
                          onClick={() => handlePokemonClick(uniqueKey)}
                          style={{ cursor: 'pointer' }}
                          {...iconProps}
                        />
                      );
                    })}
                  </div>
                  <div className="border-legend">
                    <div className="legend-item">
                      <div className="legend-color over-fifty"></div>
                      <span>Over lvl 50</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color ereader"></div>
                      <span>e-Reader</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color restricted"></div>
                      <span>Restricted</span>
                    </div>
                  </div>
                </div>
                <div
                  className="pokemon-list shadow-list"
                  style={gridHeight ? { height: gridHeight } : undefined}
                >
                  <ul>
                    {filteredPokemon.map((pokemon, index) => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);
                      const hasOverFifty = pokemon.data.flags?.includes('overFifty');
                      const hasRestricted = pokemon.data.flags?.includes('restricted');
                      // Check if e-reader exclusive based on shadowSource
                      const isEReader = pokemon.shadowSource === 'colosseum' && ['mareep', 'scizor', 'togepi'].includes(pokemon.key);

                      // Get natdex - if form, look up base Pokemon's natdex
                      let natdex = pokemon.data.natdex;
                      if (!natdex && pokemon.data['data-source']) {
                        natdex = pokemonDb[pokemon.data['data-source']]?.natdex;
                      }
                      const displayNumber = natdex ? `No. ${natdex.toString().padStart(3, '0')}` : '';

                      // Use unique key to handle duplicate Togepi entries
                      const uniqueKey = pokemon.shadowSource ? `${pokemon.key}-${pokemon.shadowSource}` : `${pokemon.key}-${index}`;

                      return (
                        <li
                          key={uniqueKey}
                          ref={el => {
                            if (el) {
                              listItemRefs.current.set(uniqueKey, el);
                            } else {
                              listItemRefs.current.delete(uniqueKey);
                            }
                          }}
                          className={highlightedPokemon === uniqueKey ? 'highlighted' : ''}
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
                          {hasOverFifty && <span className="over-fifty-pill">over lvl 50</span>}
                          {hasRestricted && <span className="restricted-pill">Restricted</span>}
                          {isEReader && <span className="ereader-pill">e-reader</span>}
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
