import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PokemonDatabase } from './types';
import { getGamesForPokemon, getGameGroupNames, searchPokemonByName, getPokemonDisplayName, getAvailableGenerations, GENERATION_ORDER } from './utils';
import { getPokemonIconProps, getPokemonLargeImageProps } from './iconUtils';
import { getAvailableRibbons } from './ribbonUtils';
import ribbonsData from '../data/ribbons.json';

interface BySpeciesProps {
  pokemonDb: PokemonDatabase;
  initialPokemonKey?: string;
  onPokemonSelect?: (key: string) => void;
}

export default function BySpecies({ pokemonDb, initialPokemonKey, onPokemonSelect }: BySpeciesProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<string>(initialPokemonKey || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('');
  const [isShadow, setIsShadow] = useState(false);
  const [level, setLevel] = useState<number>(50);

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
      const order = ['Let\'s Go Pikachu / Eevee', 'Sword / Shield', 'Brilliant Diamond / Shining Pearl', 'Legends: Arceus', 'Scarlet / Violet', 'Legends: Z-A'];
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

  const largeImageProps = useMemo(() => {
    if (!selectedPokemonData) return null;
    return getPokemonLargeImageProps(selectedPokemon, selectedPokemonData, pokemonDb);
  }, [pokemonDb, selectedPokemon, selectedPokemonData]);

  const isShadowPokemon = useMemo(() => {
    if (!selectedPokemonData?.flags) return false;
    return selectedPokemonData.flags.includes('colShadow') || selectedPokemonData.flags.includes('xdShadow');
  }, [selectedPokemonData]);

  // Calculate available generations based on Pokemon's games
  const availableGenerations = useMemo(() => {
    return getAvailableGenerations(selectedPokemonData, pokemonDb);
  }, [pokemonDb, selectedPokemonData]);

  // Initialize generation when Pokemon is selected
  useEffect(() => {
    if (availableGenerations.size > 0) {
      // Pick the first available generation (prefer numeric gens, then special ones)
      const firstAvailable = GENERATION_ORDER.find(g => availableGenerations.has(g));
      if (firstAvailable) {
        setSelectedGeneration(firstAvailable);
      }
    }
    setIsShadow(false);
  }, [selectedPokemon, availableGenerations]);

  // Calculate available ribbons
  const availableRibbons = useMemo(() => {
    if (!selectedPokemon || !selectedGeneration || !pokemonDb) return {};
    return getAvailableRibbons(selectedPokemon, level, selectedGeneration, isShadow, pokemonDb);
  }, [selectedPokemon, level, selectedGeneration, isShadow, pokemonDb]);

  // Mobile ribbon game selection
  const [selectedRibbonGame, setSelectedRibbonGame] = useState<string>('');

  // Set initial ribbon game when ribbons change
  useEffect(() => {
    const gameGroups = Object.keys(availableRibbons);
    if (gameGroups.length > 0 && !selectedRibbonGame) {
      setSelectedRibbonGame(gameGroups[0]);
    }
  }, [availableRibbons, selectedRibbonGame]);

  // Find evolutions and pre-evolution
  const evolutions = useMemo(() => {
    if (!selectedPokemon || !pokemonDb) return [];
    const evos: string[] = [];
    for (const [key, data] of Object.entries(pokemonDb)) {
      if (data.evolvesFrom === selectedPokemon) {
        evos.push(key);
      }
    }
    return evos;
  }, [selectedPokemon, pokemonDb]);

  const preEvolution = useMemo(() => {
    return selectedPokemonData?.evolvesFrom || null;
  }, [selectedPokemonData]);

  const renderRibbonImage = (ribbonKey: string, isLastChance: boolean) => {
    const ribbonInfo = (ribbonsData as Record<string, { names?: { en?: string }; descs?: { en?: string } }>)[ribbonKey];
    const ribbonName = ribbonInfo?.names?.en || ribbonKey;
    const ribbonDesc = ribbonInfo?.descs?.en || '';
    const baseTooltip = ribbonDesc ? `${ribbonName} : ${ribbonDesc}` : ribbonName;
    const tooltipTitle = isLastChance ? `${baseTooltip} (Last Chance!)` : baseTooltip;
    const wrapperClass = `ribbon-tooltip${isLastChance ? ' ribbon-last-chance-wrapper' : ''}`;

    return (
      <div key={ribbonKey} className={wrapperClass}>
        <img
          src={`${import.meta.env.BASE_URL}images/${ribbonKey}.png`}
          alt={ribbonName}
          title={tooltipTitle}
          className="ribbon-image"
        />
        <div className="ribbon-tooltip-content">
          <span className="ribbon-tooltip-text">{ribbonName}</span>
          {ribbonDesc && <span className="ribbon-tooltip-desc">{ribbonDesc}</span>}
          {isLastChance && (
            <span className="ribbon-tooltip-last-chance">(Last Chance!)</span>
          )}
        </div>
      </div>
    );
  };

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
                {largeImageProps && (
                  <img
                    className="pokedex-entry-image"
                    alt={displayName}
                    {...largeImageProps}
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
              <div className="pill-container">
                {isShadowPokemon && selectedGeneration === 'Gen 3' && (
                  <label className="shadow-pill shadow-pill-checkbox">
                    <input
                      type="checkbox"
                      checked={isShadow}
                      onChange={(e) => setIsShadow(e.target.checked)}
                    />
                    <span className="toggle-label">Shadow</span>
                    <span className="toggle-track" aria-hidden="true">
                      {isShadow && <span className="toggle-check">✓</span>}
                    </span>
                  </label>
                )}
                <div className="pokedex-entry-level">
                  <label htmlFor="level-input">Lv.</label>
                  <input
                    id="level-input"
                    type="number"
                    min="1"
                    max="100"
                    value={level}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1 && val <= 100) {
                        setLevel(val);
                      } else if (e.target.value === '') {
                        setLevel(1);
                      }
                    }}
                  />
                </div>
                {selectedGeneration && (
                  <select
                    className="pokedex-entry-gen"
                    value={selectedGeneration}
                    onChange={(e) => {
                      setSelectedGeneration(e.target.value);
                      if (e.target.value !== 'Gen 3') {
                        setIsShadow(false);
                      }
                    }}
                  >
                    {availableGenerations.has('Gen 3') && <option value="Gen 3">Gen 3</option>}
                    {availableGenerations.has('Gen 4') && <option value="Gen 4">Gen 4</option>}
                    {availableGenerations.has('Gen 5') && <option value="Gen 5">Gen 5</option>}
                    {availableGenerations.has('Gen 6') && <option value="Gen 6">Gen 6</option>}
                    {availableGenerations.has('VC') && <option value="VC">VC</option>}
                    {availableGenerations.has('Gen 7') && <option value="Gen 7">Gen 7</option>}
                    {availableGenerations.has('GO') && <option value="GO">GO</option>}
                    {availableGenerations.has('Switch') && <option value="Switch">Switch</option>}
                  </select>
                )}
              </div>
            </div>
            <div className="pokedex-entry-rows">
              {availableGames.length === 0 ? (
                <div className="pokedex-row">
                  <div className="pokedex-row-label">Available in</div>
                  <div className="pokedex-row-value">Not in Switch titles</div>
                </div>
              ) : (
                availableGames.map(game => (
                  <div className="pokedex-row" key={game}>
                    <div className="pokedex-row-label">Available in</div>
                    <div className="pokedex-row-value">{game}</div>
                  </div>
                ))
              )}
            </div>

            {/* Evolution navigation */}
            {(preEvolution || evolutions.length > 0) && (
              <div className="evolution-navigation">
                {preEvolution && (
                  <button
                    className="evolution-button"
                    onClick={() => {
                      setSelectedPokemon(preEvolution);
                      setSearchTerm('');
                      if (onPokemonSelect) onPokemonSelect(preEvolution);
                    }}
                  >
                    {(() => {
                      const preEvoData = pokemonDb[preEvolution];
                      const preEvoIconProps = preEvoData ? getPokemonIconProps(preEvolution, preEvoData, pokemonDb) : null;
                      const preEvoDisplayName = preEvoData ? (() => {
                        // Handle regional forms that have data-source
                        if (preEvoData['data-source']) {
                          const baseData = pokemonDb[preEvoData['data-source']];
                          return getPokemonDisplayName(preEvolution, {
                            ...preEvoData,
                            names: baseData?.names,
                          });
                        }
                        return getPokemonDisplayName(preEvolution, preEvoData);
                      })() : preEvolution;
                      return (
                        <>
                          {preEvoIconProps && (
                            <img
                              className="evolution-icon"
                              alt={preEvoDisplayName}
                              {...preEvoIconProps}
                            />
                          )}
                          <span className="evolution-name">{preEvoDisplayName}</span>
                        </>
                      );
                    })()}
                  </button>
                )}
                {evolutions.length > 0 && (
                  <div className={`evolution-list ${evolutions.length > 1 ? 'stacked' : ''}`}>
                    {evolutions.map(evoKey => (
                      <button
                        key={evoKey}
                        className="evolution-button"
                        onClick={() => {
                          setSelectedPokemon(evoKey);
                          setSearchTerm('');
                          if (onPokemonSelect) onPokemonSelect(evoKey);
                        }}
                      >
                        {(() => {
                          const evoData = pokemonDb[evoKey];
                          const evoIconProps = evoData ? getPokemonIconProps(evoKey, evoData, pokemonDb) : null;
                          const evoDisplayName = evoData ? (() => {
                            // Handle regional forms that have data-source
                            if (evoData['data-source']) {
                              const baseData = pokemonDb[evoData['data-source']];
                              return getPokemonDisplayName(evoKey, {
                                ...evoData,
                                names: baseData?.names,
                              });
                            }
                            return getPokemonDisplayName(evoKey, evoData);
                          })() : evoKey;
                          return (
                            <>
                              {evoIconProps && (
                                <img
                                  className="evolution-icon"
                                  alt={evoDisplayName}
                                  {...evoIconProps}
                                />
                              )}
                              <span className="evolution-name">{evoDisplayName}</span>
                            </>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Contest moves navigation */}
            {(() => {
              if (!selectedGeneration || !selectedPokemon) return null;

              const pokemonQuery = `?p=${encodeURIComponent(selectedPokemon)}`;
              let contestMovesPath = '';

              if (selectedGeneration === 'Gen 3') {
                contestMovesPath = `/contest-moves/rse${pokemonQuery}`;
              } else if (selectedGeneration === 'Gen 4') {
                contestMovesPath = `/contest-moves/dppt${pokemonQuery}`;
              } else if (selectedGeneration === 'Gen 5' || selectedGeneration === 'Gen 6') {
                contestMovesPath = `/contest-moves/oras${pokemonQuery}`;
              } else {
                // For other generations, only show if the Pokémon appears in BDSP
                const games = selectedPokemonData?.games || (selectedPokemonData?.['data-source'] ? pokemonDb[selectedPokemonData['data-source']]?.games : null);
                const hasBDSP = games?.some(game => game === 'bd' || game === 'sp');
                if (hasBDSP) {
                  contestMovesPath = `/contest-moves/bdsp${pokemonQuery}`;
                }
              }

              if (!contestMovesPath) return null;

              return (
                <div className="contest-moves-navigation">
                  <button
                    type="button"
                    className="contest-moves-button"
                    onClick={() => navigate(contestMovesPath)}
                  >
                    Contest Moves
                  </button>
                </div>
              );
            })()}

            {/* <div className="pokedex-entry-notes">
              Reserved for Pokédex entry text
            </div> */}
          </div>

          {/* Ribbons section */}
          {Object.keys(availableRibbons).length > 0 && (
            <div className="ribbons-section">
              <h3 className="ribbons-header">Available Ribbons</h3>

              {/* Mobile dropdown for game selection */}
              <select
                className="ribbons-mobile-dropdown"
                value={selectedRibbonGame}
                onChange={(e) => setSelectedRibbonGame(e.target.value)}
              >
                {Object.keys(availableRibbons).map(gameGroup => (
                  <option key={gameGroup} value={gameGroup}>{gameGroup}</option>
                ))}
              </select>

              {/* Mobile layout - two rows */}
              <div className="ribbons-mobile-layout">
                {selectedRibbonGame && availableRibbons[selectedRibbonGame as keyof typeof availableRibbons] && (() => {
                  const ribbonData = availableRibbons[selectedRibbonGame as keyof typeof availableRibbons];
                  if (!ribbonData) return null;
                  const isSwitchGame = ['SwSh', 'BDSP', 'PLA', 'SV'].includes(selectedRibbonGame);
                  return (
                    <>
                      {ribbonData['first-introduced'].length > 0 && (
                        <div className="ribbons-mobile-row">
                          <div className="ribbon-game-tag">New ribbons</div>
                          <div className="ribbon-item">
                            {ribbonData['first-introduced'].map(ribbonKey => {
                              const isLastChance = !isSwitchGame && ribbonData['last-chance'].includes(ribbonKey);
                              return renderRibbonImage(ribbonKey, isLastChance);
                            })}
                          </div>
                        </div>
                      )}
                      {ribbonData['again'].length > 0 && (
                        <div className="ribbons-mobile-row">
                          <div className="ribbon-game-tag">Recurring ribbons</div>
                          <div className="ribbon-item">
                            {ribbonData['again'].map(ribbonKey => {
                              const isLastChance = !isSwitchGame && ribbonData['last-chance'].includes(ribbonKey);
                              return renderRibbonImage(ribbonKey, isLastChance);
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Desktop grid layout */}
              <div className="ribbons-grid">
                <div className="ribbons-grid-header">
                  <div className="ribbon-grid-cell"></div>
                  <div className="ribbon-grid-cell">New ribbons</div>
                  <div className="ribbon-grid-cell">Recurring ribbons</div>
                </div>
                {Object.entries(availableRibbons).map(([gameGroup, ribbonData]) => {
                  const isSwitchGame = ['SwSh', 'BDSP', 'PLA', 'SV'].includes(gameGroup);
                  return (
                    <div key={gameGroup} className="ribbons-grid-row">
                      <div className="ribbon-game-tag">{gameGroup}</div>
                      <div className="ribbon-grid-cell">
                        {ribbonData['first-introduced'].length > 0 && (
                          <div className="ribbon-item">
                            {ribbonData['first-introduced'].map(ribbonKey => {
                              const isLastChance = !isSwitchGame && ribbonData['last-chance'].includes(ribbonKey);
                              return renderRibbonImage(ribbonKey, isLastChance);
                            })}
                          </div>
                        )}
                      </div>
                      <div className="ribbon-grid-cell">
                        {ribbonData['again'].length > 0 && (
                          <div className="ribbon-item">
                            {ribbonData['again'].map(ribbonKey => {
                              const isLastChance = !isSwitchGame && ribbonData['last-chance'].includes(ribbonKey);
                              return renderRibbonImage(ribbonKey, isLastChance);
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
