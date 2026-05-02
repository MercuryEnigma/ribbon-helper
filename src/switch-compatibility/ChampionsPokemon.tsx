import { useState, useMemo, useLayoutEffect, useRef, useEffect } from 'react';
import type { PokemonDatabase, PokemonData } from './types';
import { GAME_TOOLTIPS } from './types';
import { GAME_GROUPS, getPokemonDisplayName } from './utils';
import { getPokemonIconProps } from './iconUtils';
import { REGULATION_MA_POKEMON, GLOBAL_CHALLENGE_POKEMON } from './championsData';

interface ChampionsPokemonProps {
  pokemonDb: PokemonDatabase;
  onPokemonSelect: (key: string) => void;
}

interface FilteredPokemon {
  key: string;
  name: string;
  data: PokemonData;
  championsSource?: 'regulationMA' | 'globalChallenge' | 'both';
  shadowGamesSource?: 'colosseum' | 'xd' | 'both';
  preEvoShadowSource?: 'colosseum' | 'xd' | 'both';
  preEvoName?: string;
}

function getPreEvoShadowInfo(
  key: string,
  pokemonDb: PokemonDatabase
): { source: 'colosseum' | 'xd' | 'both'; name: string } | undefined {
  const visited = new Set<string>();
  let currentKey = pokemonDb[key]?.evolvesFrom ?? null;

  while (currentKey && !visited.has(currentKey)) {
    visited.add(currentKey);
    const data = pokemonDb[currentKey];
    if (!data) break;

    const flags = data.flags || [];
    const inCol = flags.includes('colShadow');
    const inXD = flags.includes('xdShadow');
    if (inCol || inXD) {
      const source = inCol && inXD ? 'both' : inCol ? 'colosseum' : 'xd';
      const name = data.names?.en ?? currentKey;
      return { source, name };
    }

    currentKey = data.evolvesFrom ?? null;
  }

  return undefined;
}

function filterChampionsPokemonByGames(
  pokemonDb: PokemonDatabase,
  selectedGames: string[],
  championsFilter: 'regulationMA' | 'globalChallenge' | 'either'
): FilteredPokemon[] {
  if (!pokemonDb) return [];

  const results: FilteredPokemon[] = [];

  for (const [key, data] of Object.entries(pokemonDb)) {
    const hasRegulationMA = REGULATION_MA_POKEMON.has(key);
    const hasGlobalChallenge = GLOBAL_CHALLENGE_POKEMON.has(key);

    if (!hasRegulationMA && !hasGlobalChallenge) continue;

    const pokemonGames = Array.isArray(data.games) ? data.games : [];
    const hasAllGames = selectedGames.length === 0 || selectedGames.every(gameId => pokemonGames.includes(gameId));
    if (!hasAllGames) continue;

    let displayName = '';
    if (data['data-source']) {
      const sourceData = pokemonDb[data['data-source']];
      if (sourceData) {
        displayName = getPokemonDisplayName(key, { ...data, names: sourceData.names });
      }
    } else {
      displayName = getPokemonDisplayName(key, data);
    }

    // Actual membership — used for icon coloring regardless of filter
    const championsSource: 'regulationMA' | 'globalChallenge' | 'both' =
      hasRegulationMA && hasGlobalChallenge ? 'both'
      : hasRegulationMA ? 'regulationMA'
      : 'globalChallenge';

    let matchesFilter = false;
    if (championsFilter === 'regulationMA') {
      matchesFilter = hasRegulationMA;
    } else if (championsFilter === 'globalChallenge') {
      matchesFilter = hasGlobalChallenge;
    } else {
      matchesFilter = hasRegulationMA || hasGlobalChallenge;
    }

    if (matchesFilter) {
      const flags = data.flags || pokemonDb[data['data-source'] ?? '']?.flags || [];
      const inCol = flags.includes('colShadow');
      const inXD = flags.includes('xdShadow');
      const shadowGamesSource = inCol && inXD ? 'both' : inCol ? 'colosseum' : inXD ? 'xd' : undefined;
      const preEvoInfo = shadowGamesSource ? undefined : getPreEvoShadowInfo(key, pokemonDb);
      results.push({ key, name: displayName, data, championsSource, shadowGamesSource, preEvoShadowSource: preEvoInfo?.source, preEvoName: preEvoInfo?.name });
    }
  }

  results.sort((a, b) => {
    let aNum = a.data.natdex;
    let bNum = b.data.natdex;

    if (!aNum && a.data['data-source']) aNum = pokemonDb[a.data['data-source']]?.natdex;
    if (!bNum && b.data['data-source']) bNum = pokemonDb[b.data['data-source']]?.natdex;

    if (!aNum && !bNum) return 0;
    if (!aNum) return 1;
    if (!bNum) return -1;
    return aNum - bNum;
  });

  return results;
}

type ChampionsFilter = 'regulationMA' | 'globalChallenge' | 'either';

export default function ChampionsPokemon({ pokemonDb, onPokemonSelect }: ChampionsPokemonProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>(() =>
    GAME_GROUPS
      .filter(group => group.name !== "Let's Go Pikachu / Eevee" && group.name !== 'Legends: Z-A')
      .flatMap(group => group.ids)
  );
  const [championsFilter, setChampionsFilter] = useState<ChampionsFilter>('either');
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const [highlightedPokemon, setHighlightedPokemon] = useState<string | null>(null);
  const [hoveredPokemon, setHoveredPokemon] = useState<{
    name: string;
    game: string;
    x: number;
    y: number;
    hasSpecial: boolean;
    specialMessages: string[];
  } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const listItemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleGame = (gameIds: string[]) => {
    setSelectedGames(prev => {
      const prevSet = new Set(prev);
      const allSelected = gameIds.every(id => prevSet.has(id));
      if (allSelected) {
        return prev.filter(id => !gameIds.includes(id));
      } else {
        const toAdd = gameIds.filter(id => !prevSet.has(id));
        return [...prev, ...toAdd];
      }
    });
  };

  const selectedGamesSet = useMemo(() => new Set(selectedGames), [selectedGames]);

  const filteredPokemon = useMemo(() => {
    if (!pokemonDb) return [];
    return filterChampionsPokemonByGames(pokemonDb, selectedGames, championsFilter);
  }, [pokemonDb, selectedGames, championsFilter]);

  useLayoutEffect(() => {
    const measure = () => {
      if (gridWrapperRef.current) {
        setGridHeight(gridWrapperRef.current.getBoundingClientRect().height);
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
        const duration = 800;
        const startTime = performance.now();

        const smoothScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeInOutQuad = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          container.scrollTop = startPosition + (scrollOffset * easeInOutQuad);
          if (progress < 1) requestAnimationFrame(smoothScroll);
        };

        requestAnimationFrame(smoothScroll);
      }

      setHighlightedPokemon(pokemonKey);
      setTimeout(() => setHighlightedPokemon(null), 2000);
    }
  };

  return (
    <div className="available-pokemon champions-pokemon">
      <div className="game-selector champions-selector">
        <h3>Choose Games:</h3>
        {/* <div className="champions-filter-toggle">
          {[
            { key: 'regulationMA', label: 'Regulation M-A' },
            { key: 'either', label: 'Either' },
            { key: 'globalChallenge', label: 'Global Challenge 2026' }
          ].map(option => {
            const detail = GAME_TOOLTIPS.champions[option.label];
            return (
              <div key={option.key} className="champions-filter-button has-tooltip">
                <button
                  className={championsFilter === option.key ? 'active' : ''}
                  onClick={() => setChampionsFilter(option.key as ChampionsFilter)}
                >
                  {option.label}
                </button>
                {detail && (!isMobile || detail.isLastChance) && (
                  <div className="game-tooltip-card">
                    <div className={`game-tooltip-header${detail.isLastChance ? ' last-chance' : ''}`}>
                      {detail.header}
                      {detail.isLastChance && <span className="game-tooltip-subline">(Last Chance!)</span>}
                    </div>
                    <div className="game-tooltip-body">{detail.body}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div> */}
        <div className="game-checkboxes">
          {GAME_GROUPS.map(group => {
            const allChecked = group.ids.every(id => selectedGamesSet.has(id));
            const special = GAME_TOOLTIPS.champions[group.name];
            return (
              <label
                key={group.name}
                className={`game-checkbox champions-checkbox${special ? ' has-tooltip' : ''}${special?.isLastChance ? ' special-game' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => toggleGame(group.ids)}
                />
                <span className="toggle-label">{group.name}</span>
                {special && (!isMobile || special.isLastChance) && (
                  <div className="game-tooltip-card">
                    <div className={`game-tooltip-header${special.isLastChance ? ' last-chance' : ''}`}>
                      {special.header}
                    </div>
                    <div className="game-tooltip-body">{special.body}</div>
                  </div>
                )}
                <span className="toggle-track" aria-hidden="true">
                  {allChecked && <span className="toggle-check">✓</span>}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="pokemon-results champions-results">
        <h3>
          Champions Pokémon ({filteredPokemon.length})
        </h3>
        <>
            {filteredPokemon.length === 0 ? (
              <p className="no-results champions-no-results">No Champions Pokémon found that are available in all selected games.</p>
            ) : (
              <div className="pokemon-results-content">
                <div className="pokemon-grid-wrapper" ref={gridWrapperRef}>
                  <div className="pokemon-icon-grid champions-grid">
                    {filteredPokemon.map((pokemon, index) => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);
                      const uniqueKey = pokemon.championsSource ? `${pokemon.key}-${pokemon.championsSource}` : `${pokemon.key}-${index}`;
                      const sourceClass = pokemon.shadowGamesSource === 'colosseum' ? 'champ-col'
                        : pokemon.shadowGamesSource === 'xd' ? 'champ-xd'
                        : pokemon.shadowGamesSource === 'both' ? 'champ-both'
                        : pokemon.preEvoShadowSource ? 'champ-pre-evo'
                        : '';
                      return (
                        <img
                          key={uniqueKey}
                          className={`pokemon-icon-grid-item${sourceClass ? ` ${sourceClass}` : ''}`}
                          alt={pokemon.name}
                          onClick={() => handlePokemonClick(uniqueKey)}
                          onMouseEnter={(e) => {
                            if (isMobile) return;

                            const rect = e.currentTarget.getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const viewport = typeof window !== 'undefined' ? window.innerWidth : 0;
                            const safeMargin = viewport ? Math.min(200, viewport / 4) : 160;
                            const maxX = viewport ? viewport - safeMargin : centerX;
                            const clampedX = Math.min(Math.max(centerX, safeMargin), maxX);

                            const shadowGame = pokemon.shadowGamesSource === 'colosseum' ? 'Colosseum'
                              : pokemon.shadowGamesSource === 'xd' ? 'XD: Gale of Darkness'
                              : pokemon.shadowGamesSource === 'both' ? 'Both'
                              : null;
                            const preEvoGame = pokemon.preEvoShadowSource === 'colosseum' ? 'Colosseum'
                              : pokemon.preEvoShadowSource === 'xd' ? 'XD: Gale of Darkness'
                              : pokemon.preEvoShadowSource === 'both' ? 'Both'
                              : null;
                            const gameName = shadowGame
                              ?? (pokemon.preEvoName && preEvoGame ? `${pokemon.preEvoName}: ${preEvoGame}` : '');

                            setHoveredPokemon({
                              name: pokemon.name,
                              game: gameName,
                              x: clampedX,
                              y: rect.top,
                              hasSpecial: false,
                              specialMessages: []
                            });
                          }}
                          onMouseLeave={() => setHoveredPokemon(null)}
                          style={{ cursor: 'pointer' }}
                          {...iconProps}
                        />
                      );
                    })}
                  </div>
                  <div className="border-legend">
                    <div className="legend-item">
                      <div className="legend-color champ-col"></div>
                      <span>Colosseum</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color champ-xd"></div>
                      <span>XD: Gale of Darkness</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color champ-pre-evo"></div>
                      <span>Pre-evolution</span>
                    </div>
                  </div>
                </div>
                <div
                  className="pokemon-list champions-list"
                  style={gridHeight ? { height: gridHeight } : undefined}
                >
                  <ul>
                    {filteredPokemon.map((pokemon, index) => {
                      const iconProps = getPokemonIconProps(pokemon.key, pokemon.data, pokemonDb);

                      let natdex = pokemon.data.natdex;
                      if (!natdex && pokemon.data['data-source']) {
                        natdex = pokemonDb[pokemon.data['data-source']]?.natdex;
                      }
                      const displayNumber = natdex ? `No. ${natdex.toString().padStart(3, '0')}` : '';
                      const listItemKey = pokemon.championsSource ? `${pokemon.key}-${pokemon.championsSource}` : `${pokemon.key}-${index}`;

                      return (
                        <li
                          key={listItemKey}
                          ref={el => {
                            if (el) {
                              listItemRefs.current.set(listItemKey, el);
                            } else {
                              listItemRefs.current.delete(listItemKey);
                            }
                          }}
                          className={highlightedPokemon === listItemKey ? 'highlighted' : ''}
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
      </div>

      {hoveredPokemon && (
        <div
          className="champions-pokemon-tooltip"
          style={{
            left: `${hoveredPokemon.x}px`,
            top: `${hoveredPokemon.y}px`
          }}
        >
          <div className="champions-pokemon-tooltip-header">
            {hoveredPokemon.name}
          </div>
          <div className="champions-pokemon-tooltip-body">
            {hoveredPokemon.game}
          </div>
        </div>
      )}
    </div>
  );
}
