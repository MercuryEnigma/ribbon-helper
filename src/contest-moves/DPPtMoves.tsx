import { useState, useMemo, useEffect } from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import pokemonDb from '../data/pokemon.json';
import pokemonMovesData from '../data/pokemon_moves_dppt.json';
import contestMovesData from '../data/contest_moves_dppt.json';
import contestEffectsData from '../data/contest_effects_dppt.json';
import { getPokemonIconProps, getPokemonLargeImageProps } from '../switch-compatibility/iconUtils';
import { searchPokemonByName, getPokemonDisplayName } from '../switch-compatibility/utils';
import type { PokemonDatabase } from '../switch-compatibility/types';
import {
  getAvailableMovesForPokemon,
  filterAvailableMoves,
  getMoveLearnMethods,
  getSelectableMoves,
  getLearnMethodStates,
  getContestEffectForMove,
  type LearnMethod,
  type ContestType,
  type AvailableMovesByMethod,
  type ContestMoveData,
  type ContestEffect
} from './moveUtils';
import { getSuperContestOptimalMoves } from './superContestCalculator';

type GameSelection = 'rse' | 'dppt' | 'oras' | 'bdsp';

interface DPPtMovesProps {
  selectedGame: GameSelection;
  onNavigate: (path: string) => void;
}

const pokemonMoves = pokemonMovesData as Record<string, any>;
const contestMoves = contestMovesData as Record<string, ContestMoveData>;
const contestEffects = contestEffectsData as Record<string, ContestEffect>;
const typedPokemonDb = pokemonDb as PokemonDatabase;

export default function DPPtMoves({ selectedGame, onNavigate }: DPPtMovesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pokemonKey = searchParams.get('p') || undefined;

  const handlePrevious = () => {
    let targetGame: GameSelection;
    if (selectedGame === 'rse') targetGame = 'bdsp';
    else if (selectedGame === 'dppt') targetGame = 'rse';
    else if (selectedGame === 'oras') targetGame = 'dppt';
    else targetGame = 'oras';

    const pokemonQuery = selectedPokemon ? `?p=${selectedPokemon}` : '';
    onNavigate(`/contest-moves/${targetGame}${pokemonQuery}`);
  };

  const handleNext = () => {
    let targetGame: GameSelection;
    if (selectedGame === 'rse') targetGame = 'dppt';
    else if (selectedGame === 'dppt') targetGame = 'oras';
    else if (selectedGame === 'oras') targetGame = 'bdsp';
    else targetGame = 'rse';

    const pokemonQuery = selectedPokemon ? `?p=${selectedPokemon}` : '';
    onNavigate(`/contest-moves/${targetGame}${pokemonQuery}`);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<string>(pokemonKey || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedContestType, setSelectedContestType] = useState<ContestType | 'all'>('all');
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);

  // Move filtering state
  const [enabledMethods, setEnabledMethods] = useState<Record<LearnMethod, boolean>>({
    'level-up': true,
    'machine': true,
    'tutor': false,
    'egg': false,
    'purify': false,
    'pre-evolution': false,
    'other': false
  });
  const [excludedMoves, setExcludedMoves] = useState<Set<string>>(new Set());

  const selectedPokemonData = useMemo(() => {
    if (!selectedPokemon) return null;
    return typedPokemonDb[selectedPokemon] || null;
  }, [selectedPokemon]);

  useEffect(() => {
    if (pokemonKey && typedPokemonDb[pokemonKey]) {
      // Check if this Pokemon exists in the current game's data
      if (!pokemonMoves[pokemonKey]) {
        // Pokemon doesn't exist in this game, clear state and redirect to base route
        setSelectedPokemon('');
        setSearchTerm('');
        navigate(`/contest-moves/${selectedGame}`);
        return;
      }

      setSelectedPokemon(pokemonKey);
      const pokemonData = typedPokemonDb[pokemonKey];

      let displayName = '';
      if (pokemonData['data-source']) {
        const sourceData = typedPokemonDb[pokemonData['data-source']];
        if (sourceData) {
          displayName = getPokemonDisplayName(pokemonKey, {
            ...pokemonData,
            names: sourceData.names
          });
        }
      } else {
        displayName = getPokemonDisplayName(pokemonKey, pokemonData);
      }

      setSearchTerm(displayName);
    } else if (!pokemonKey) {
      // Clear selection when there's no pokemonKey in URL
      setSelectedPokemon('');
      setSearchTerm('');
    }
  }, [pokemonKey, navigate, selectedGame]);

  // Reset filtering when Pokemon or game changes
  useEffect(() => {
    const defaultEnabledMethods: Record<LearnMethod, boolean> = {
      'level-up': true,
      'machine': true,
      'tutor': false,
      'egg': false,
      'purify': false,
      'pre-evolution': false,
      'other': false
    };
    setEnabledMethods(defaultEnabledMethods);

    // Initialize excluded moves based on default enabled methods
    const initialExcludedMoves = new Set<string>();
    if (selectedPokemon && pokemonMoves[selectedPokemon]) {
      const moves = getAvailableMovesForPokemon(selectedPokemon, pokemonMoves, typedPokemonDb);

      // Check each method and add moves that are only available through disabled methods
      for (const method of Object.keys(moves) as LearnMethod[]) {
        if (moves[method] && !defaultEnabledMethods[method]) {
          for (const move of Object.keys(moves[method]!)) {
            const moveMethods = getMoveLearnMethods(move, moves);
            const hasEnabledMethod = moveMethods.some(m => defaultEnabledMethods[m]);
            if (!hasEnabledMethod) {
              initialExcludedMoves.add(move);
            }
          }
        }
      }
    }

    setExcludedMoves(initialExcludedMoves);
    setSelectedMoveIndex(null);
  }, [selectedPokemon, selectedGame]);

  // Clear selected move when contest type or filters change
  useEffect(() => {
    setSelectedMoveIndex(null);
  }, [selectedContestType, enabledMethods, excludedMoves]);

  // Add click outside handler to close move details
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.moves-container')) {
        setSelectedMoveIndex(null);
      }
    };

    if (selectedMoveIndex !== null) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedMoveIndex]);

  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    try {
      // Only show Pokemon that are available in DPPt (have entries in pokemon_moves_dppt.json)
      const allResults = searchPokemonByName(typedPokemonDb, searchTerm);
      return allResults.filter(result => pokemonMoves[result.key]).slice(0, 50);
    } catch (error) {
      console.error('Error searching Pokemon:', error);
      return [];
    }
  }, [searchTerm]);

  const handleSelect = (key: string, name: string) => {
    if (!key || !name) return;
    setSelectedPokemon(key);
    setSearchTerm(name);
    setShowDropdown(false);
    navigate(`/contest-moves/dppt?p=${key}`);
  };

  // Get available moves for the selected Pokemon
  const availableMoves = useMemo<AvailableMovesByMethod>(() => {
    if (!selectedPokemon || !pokemonMoves[selectedPokemon]) return {};
    return getAvailableMovesForPokemon(selectedPokemon, pokemonMoves, typedPokemonDb);
  }, [selectedPokemon]);

  // Get all moves regardless of enabled methods (always show all moves in the list)
  const selectableMoves = useMemo(() => {
    const allEnabledMethods: Record<LearnMethod, boolean> = {
      'level-up': true,
      'machine': true,
      'tutor': true,
      'egg': true,
      'purify': true,
      'pre-evolution': true,
      'other': true
    };
    return getSelectableMoves(availableMoves, allEnabledMethods);
  }, [availableMoves]);

  // Get learn method states for checkbox display
  const methodStates = useMemo(() => {
    return getLearnMethodStates(availableMoves, enabledMethods, excludedMoves);
  }, [availableMoves, enabledMethods, excludedMoves]);

  // Count visible learn methods for grid layout
  const visibleMethodCount = useMemo(() => {
    let count = 0;
    const methods: LearnMethod[] = ['level-up', 'machine', 'tutor', 'egg', 'purify', 'pre-evolution'];
    for (const method of methods) {
      if (availableMoves[method] && Object.keys(availableMoves[method]).length > 0) {
        count++;
      }
    }
    return count;
  }, [availableMoves]);

  const largeIconProps = useMemo(() => {
    if (!selectedPokemonData) return null;
    return getPokemonIconProps(selectedPokemon, selectedPokemonData, typedPokemonDb);
  }, [selectedPokemon, selectedPokemonData]);

  const largeImageProps = useMemo(() => {
    if (!selectedPokemonData) return null;
    return getPokemonLargeImageProps(selectedPokemon, selectedPokemonData, typedPokemonDb);
  }, [selectedPokemon, selectedPokemonData]);

  const displayName = useMemo(() => {
    if (!selectedPokemonData) return '';

    if (selectedPokemonData['data-source']) {
      const sourceData = typedPokemonDb[selectedPokemonData['data-source']];
      if (sourceData) {
        return getPokemonDisplayName(selectedPokemon, {
          ...selectedPokemonData,
          names: sourceData.names
        });
      }
    }

    return getPokemonDisplayName(selectedPokemon, selectedPokemonData);
  }, [selectedPokemon, selectedPokemonData]);

  // Calculate optimal moves with filtering applied
  const optimalMoves = useMemo(() => {
    if (!selectedPokemon || !pokemonMoves[selectedPokemon]) return null;

    // Filter moves based on enabled methods and excluded moves
    const filteredMovesMap = filterAvailableMoves(availableMoves, enabledMethods, excludedMoves);

    // Get optimal move sequence using the selected contest type
    return getSuperContestOptimalMoves(filteredMovesMap, selectedContestType);
  }, [selectedPokemon, availableMoves, enabledMethods, excludedMoves, selectedContestType]);

  const selectedMoveName = useMemo(() => {
    if (selectedMoveIndex === null || !optimalMoves || !optimalMoves[selectedMoveIndex]) return null;
    return optimalMoves[selectedMoveIndex].move;
  }, [optimalMoves, selectedMoveIndex]);

  const selectedMoveEffect = useMemo(() => {
    if (!selectedMoveName) return null;
    return getContestEffectForMove(selectedMoveName, contestMoves, contestEffects);
  }, [selectedMoveName]);

  const selectedMoveDisplay = useMemo(() => {
    if (selectedMoveIndex === null || !optimalMoves) return null;
    return optimalMoves[selectedMoveIndex];
  }, [optimalMoves, selectedMoveIndex]);

  const matchingEffectMoves = useMemo(() => {
    if (!selectedMoveDisplay?.move_role) return [];
    return selectedMoveDisplay.move_role.map(name => name.replace(/-/g, ' '));
  }, [selectedMoveDisplay]);

  const selectedMoveLearnMethods = useMemo(() => {
    if (!selectedMoveName) return '';
    const methods = getMoveLearnMethods(selectedMoveName, availableMoves);
    const methodOrder: LearnMethod[] = ['level-up', 'machine', 'tutor', 'egg', 'purify', 'pre-evolution', 'other'];
    const sortedMethods = methods.sort((a, b) =>
      methodOrder.indexOf(a) - methodOrder.indexOf(b)
    );

    const methodLabels = sortedMethods.map(m => {
      const value = availableMoves[m]?.[selectedMoveName];
      if (!value) return '';

      if (m === 'level-up') {
        return `lvl ${value}`;
      }
      return value;
    }).filter(Boolean).join(', ');

    return methodLabels;
  }, [selectedMoveName, availableMoves]);

  // Handle learn method checkbox changes
  const handleMethodToggle = (method: LearnMethod, checked: boolean) => {
    const newEnabledMethods = { ...enabledMethods, [method]: checked };
    setEnabledMethods(newEnabledMethods);

    // When a method is disabled, automatically exclude moves that become unavailable
    if (!checked) {
      const newExcluded = new Set(excludedMoves);

      // Check each move to see if it's still available through other enabled methods
      for (const move of Object.keys(availableMoves[method] || {})) {
        const moveMethods = getMoveLearnMethods(move, availableMoves);
        const hasOtherEnabledMethod = moveMethods.some(m => m !== method && newEnabledMethods[m]);

        // If no other enabled method provides this move, exclude it
        if (!hasOtherEnabledMethod) {
          newExcluded.add(move);
        }
      }

      setExcludedMoves(newExcluded);
    } else {
      // When re-enabling a method, remove exclusions for moves that are now available
      const newExcluded = new Set(excludedMoves);

      for (const move of Object.keys(availableMoves[method] || {})) {
        // Remove from excluded if this move is now available
        newExcluded.delete(move);
      }

      setExcludedMoves(newExcluded);
    }
  };

  return (
    <div className="rse-contest-moves">
      <div className="contest-layout">
        <div className="contest-moves-section">
          <div className="contest-mode-selector">
            <button
              className="nav-arrow nav-arrow-left"
              aria-label="Previous"
              onClick={handlePrevious}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="15,6 9,12 15,18"/>
              </svg>
            </button>
            <NavLink
              to={selectedPokemon ? `/contest-moves/rse?p=${selectedPokemon}` : '/contest-moves/rse'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              RSE
            </NavLink>
            <NavLink
              to={selectedPokemon ? `/contest-moves/dppt?p=${selectedPokemon}` : '/contest-moves/dppt'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              DPPt
            </NavLink>
            <NavLink
              to={selectedPokemon ? `/contest-moves/oras?p=${selectedPokemon}` : '/contest-moves/oras'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              ORAS
            </NavLink>
            <NavLink
              to={selectedPokemon ? `/contest-moves/bdsp?p=${selectedPokemon}` : '/contest-moves/bdsp'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              BDSP
            </NavLink>
            <button
              className="nav-arrow nav-arrow-right"
              aria-label="Next"
              onClick={handleNext}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="9,6 15,12 9,18"/>
              </svg>
            </button>
          </div>
          <div
            className="moves-container"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedMoveIndex(null);
              }
            }}
          >
            {optimalMoves && optimalMoves.length > 0 ? (
              <>
                <div className="moves-list">
                  {optimalMoves.map((contestMove, index) => (
                    <div
                      key={index}
                      className={`move-row move-type-${contestMove.type} ${selectedMoveIndex === index ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMoveIndex(index);
                      }}
                    >
                      <div className="move-type-badge">{contestMove.type.toUpperCase()}</div>
                      <div className="move-name">{contestMove.move.replace(/-/g, ' ')}</div>
                      <div className="move-value">{contestMove.appeal}</div>
                    </div>
                  ))}
                </div>
                {selectedMoveName && selectedMoveEffect && (
                  <div className="move-details" onClick={(e) => e.stopPropagation()}>
                    <div className="move-details-header">
                      <div className="move-details-methods">
                        <span className="move-details-methods-text">{selectedMoveLearnMethods}</span>
                      </div>
                      {selectedMoveEffect.star === 1 && (
                        <div className="move-details-star">
                          <span>⭐</span>
                        </div>
                      )}
                      <div className="move-details-appeal">
                        {Array.from({ length: selectedMoveEffect.appeal ?? selectedMoveDisplay?.appeal ?? 0 }).map((_, i) => (
                          <span key={i}>❤️</span>
                        ))}
                      </div>
                    </div>
                    <div className="move-details-description">
                      {selectedMoveEffect.flavor_text && (
                        <p className="move-details-flavor">{selectedMoveEffect.flavor_text}</p>
                      )}
                      {selectedMoveEffect.effect_description &&
                       selectedMoveEffect.effect_description !== selectedMoveEffect.flavor_text && (
                        <p className="move-details-effect">{selectedMoveEffect.effect_description}</p>
                      )}
                      {matchingEffectMoves.length > 0 && (
                        <p className="move-details-related">
                          {matchingEffectMoves.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-moves">
                {selectedPokemon ? 'No contest moves available' : 'Select a Pokémon'}
              </div>
            )}
          </div>
        </div>

        <div className="pokemon-selector-section">
          <div className="pokemon-selector-bar">
            <div className="pokemon-search-input-wrapper">
              <input
                type="text"
                className="pokemon-search-input"
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
                <ul className="pokemon-search-dropdown">
                  {searchResults.map(result => {
                    const pokemonData = typedPokemonDb[result.key];
                    if (!pokemonData) return null;
                    const iconProps = getPokemonIconProps(result.key, pokemonData, typedPokemonDb);
                    return (
                      <li
                        key={result.key}
                        onMouseDown={() => handleSelect(result.key, result.name)}
                        className="pokemon-search-option"
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
            <div className="contest-type-wrapper">
              <select
                className="contest-type-select"
                value={selectedContestType}
                onChange={e => setSelectedContestType(e.target.value as ContestType)}
              >
                <option value="all">All Contests</option>
                <option value="cool">Cool</option>
                <option value="beauty">Beauty</option>
                <option value="cute">Cute</option>
                <option value="smart">Smart</option>
                <option value="tough">Tough</option>
              </select>
            </div>
          </div>

          <div className="move-filter-container">
            {selectedPokemon && largeImageProps && (
              <img
                className="pokemon-watermark"
                alt={displayName}
                {...largeImageProps}
              />
            )}
            <div className={`learn-methods-grid ${visibleMethodCount === 3 || visibleMethodCount > 4 ? 'three-columns' : 'two-columns'}`}>
              {availableMoves['level-up'] && Object.keys(availableMoves['level-up']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['level-up']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['level-up'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('level-up', e.target.checked)}
                  />
                  <span>Level-Up</span>
                </label>
              )}

              {availableMoves['machine'] && Object.keys(availableMoves['machine']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['machine']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['machine'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('machine', e.target.checked)}
                  />
                  <span>TM/HM</span>
                </label>
              )}

              {availableMoves['tutor'] && Object.keys(availableMoves['tutor']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['tutor']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['tutor'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('tutor', e.target.checked)}
                  />
                  <span>Tutor</span>
                </label>
              )}

              {availableMoves['egg'] && Object.keys(availableMoves['egg']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['egg']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['egg'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('egg', e.target.checked)}
                  />
                  <span>Egg</span>
                </label>
              )}

              {availableMoves['purify'] && Object.keys(availableMoves['purify']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['purify']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['purify'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('purify', e.target.checked)}
                  />
                  <span>Purify</span>
                </label>
              )}

              {availableMoves['pre-evolution'] && Object.keys(availableMoves['pre-evolution']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['pre-evolution']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['pre-evolution'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('pre-evolution', e.target.checked)}
                  />
                  <span>Pre-Evo</span>
                </label>
              )}

              {availableMoves['other'] && Object.keys(availableMoves['other']).length > 0 && (
                <label className="learn-method-checkbox">
                  <input
                    type="checkbox"
                    checked={enabledMethods['other']}
                    ref={(el) => {
                      if (el) el.indeterminate = methodStates['other'] === 'partial';
                    }}
                    onChange={(e) => handleMethodToggle('other', e.target.checked)}
                  />
                  <span>Other</span>
                </label>
              )}
            </div>

            <div className="move-filter-list">
              {selectableMoves.map(move => {
                const methods = getMoveLearnMethods(move, availableMoves);
                // Sort methods in priority order: Level-up, TM/HM, Tutor, Egg, Purify, Pre-evolution, Other
                const methodOrder: LearnMethod[] = ['level-up', 'machine', 'tutor', 'egg', 'purify', 'pre-evolution', 'other'];
                const sortedMethods = methods.sort((a, b) =>
                  methodOrder.indexOf(a) - methodOrder.indexOf(b)
                );

                // Get the actual values for each method
                const methodLabels = sortedMethods.map(m => {
                  const value = availableMoves[m]?.[move];
                  if (!value) return '';

                  if (m === 'level-up') {
                    return `lvl ${value}`;
                  }
                  return value;
                }).filter(Boolean).join(', ');

                return (
                  <label key={move} className="move-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={!excludedMoves.has(move)}
                      onChange={(e) => {
                        const newExcluded = new Set(excludedMoves);
                        if (e.target.checked) {
                          newExcluded.delete(move);
                        } else {
                          newExcluded.add(move);
                        }
                        setExcludedMoves(newExcluded);
                      }}
                    />
                    <span className="move-name-with-methods">
                      {move.replace(/-/g, ' ')}
                      <span className="move-learn-methods"> ({methodLabels})</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
