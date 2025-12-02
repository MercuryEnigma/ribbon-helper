import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import pokemonData from '../data/pokemon.json';
import pokemonMovesRse from '../data/pokemon_moves_rse.json';
import { getPokemonDisplayName, searchPokemonByName } from '../switch-compatibility/utils';
import { getPokemonIconProps } from '../switch-compatibility/iconUtils';
import type { PokemonDatabase, PokemonData } from '../switch-compatibility/types';
import ContestTabs from './ContestTabs';
import type { ContestType } from './types';
import { getRseContestMoves, type ContestMove } from './contestCalculator';

const TYPE_FILTERS: Array<{ value: 'all' | ContestType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'cool', label: 'Cool' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'cute', label: 'Sweet' },
  { value: 'smart', label: 'Smart' },
  { value: 'tough', label: 'Tough' },
];

type OptionFilter = 'level-up' | 'TM/HM' | 'Tutor' | 'Egg' | 'Purify' | 'Other';
type MoveFilterState = Record<OptionFilter, boolean>;

const OPTION_FILTERS: Array<{ key: OptionFilter; label: string }> = [
  { key: 'level-up', label: 'level-up' },
  { key: 'TM/HM', label: 'TM/HM' },
  { key: 'Tutor', label: 'Tutor' },
  { key: 'Egg', label: 'Egg' },
  { key: 'Purify', label: 'Purify' },
  { key: 'Other', label: 'Other' },
];

function getDisplayNameForPokemon(
  key: string,
  data: PokemonData | undefined,
  pokemonDb: PokemonDatabase
): string {
  if (!data) return key;
  if (data['data-source']) {
    const source = pokemonDb[data['data-source']];
    return getPokemonDisplayName(key, { ...data, names: source?.names });
  }
  return getPokemonDisplayName(key, data);
}

export default function RseMoves() {
  const { pokemonKey } = useParams<{ pokemonKey?: string }>();
  const navigate = useNavigate();
  const pokemonDb = pokemonData as PokemonDatabase;

  const availablePokemonKeys = useMemo(
    () => Object.keys(pokemonMovesRse as Record<string, unknown>),
    []
  );

  const pokemonOptions = useMemo(() => {
    return availablePokemonKeys
      .reduce<Array<{ key: string; name: string; natdex: number; data: PokemonData }>>((list, key) => {
        const data = pokemonDb[key];
        if (!data) return list;
        const displayName = getDisplayNameForPokemon(key, data, pokemonDb);
        const natdex = data.natdex || (data['data-source'] ? pokemonDb[data['data-source']]?.natdex : undefined);
        list.push({ key, name: displayName, natdex: natdex ?? Number.MAX_SAFE_INTEGER, data });
        return list;
      }, [])
      .sort((a, b) => a.natdex - b.natdex || a.name.localeCompare(b.name));
  }, [availablePokemonKeys, pokemonDb]);

  const defaultPokemonKey = pokemonOptions[0]?.key || '';
  const defaultPokemonName = pokemonOptions[0]?.name || '';

  const allowedPokemonKeys = useMemo(() => new Set(availablePokemonKeys), [availablePokemonKeys]);

  const selectedKey = (pokemonKey && allowedPokemonKeys.has(pokemonKey)) ? pokemonKey : '';

  const [selectedPokemon, setSelectedPokemon] = useState<string>(selectedKey);
  const [searchTerm, setSearchTerm] = useState<string>(selectedKey ? getDisplayNameForPokemon(selectedKey, pokemonDb[selectedKey], pokemonDb) : '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | ContestType>('all');
  const [showOptions, setShowOptions] = useState(false);
  const [optionFilters, setOptionFilters] = useState<MoveFilterState>(() => {
    return OPTION_FILTERS.reduce((acc, opt) => {
      acc[opt.key] = true;
      return acc;
    }, {} as MoveFilterState);
  });
  const optionFiltersKey = useMemo(() => JSON.stringify(optionFilters), [optionFilters]);

  useEffect(() => {
    if (pokemonKey && allowedPokemonKeys.has(pokemonKey)) {
      setSelectedPokemon(pokemonKey);
      const displayName = getDisplayNameForPokemon(pokemonKey, pokemonDb[pokemonKey], pokemonDb);
      setSearchTerm(displayName);
    } else {
      setSelectedPokemon('');
      setSearchTerm('');
    }
  }, [allowedPokemonKeys, pokemonDb, pokemonKey]);

  const searchResults = useMemo(() => {
    if (searchTerm.trim().length < 2) {
      return pokemonOptions.slice(0, 12);
    }
    return searchPokemonByName(pokemonDb, searchTerm)
      .filter(result => allowedPokemonKeys.has(result.key))
      .slice(0, 25)
      .map(result => {
        const data = pokemonDb[result.key];
        if (!data) return null;
        return {
          key: result.key,
          name: getDisplayNameForPokemon(result.key, data, pokemonDb),
          data,
        };
      })
      .filter(Boolean) as Array<{ key: string; name: string; data: PokemonData }>;
  }, [allowedPokemonKeys, pokemonDb, pokemonOptions, searchTerm]);

  const selectedPokemonData = selectedPokemon ? pokemonDb[selectedPokemon] : undefined;
  const selectedDisplayName = selectedPokemonData
    ? getDisplayNameForPokemon(selectedPokemon, selectedPokemonData, pokemonDb)
    : '';
  const largeIconProps = selectedPokemonData
    ? getPokemonIconProps(selectedPokemon, selectedPokemonData, pokemonDb)
    : null;

  const availableMoves = useMemo(() => {
    if (!selectedPokemon) return [];
    const data = (pokemonMovesRse as any)[selectedPokemon];
    if (!data) return [];

    const moveSet = new Set<string>();
    for (const [methodKey, entry] of Object.entries<any>(data)) {
      if (methodKey.startsWith('level-up-') && !optionFilters['level-up']) continue;
      if (methodKey.startsWith('machine-') && !optionFilters['TM/HM']) continue;
      if (methodKey.startsWith('tutor-') && !optionFilters['Tutor']) continue;
      if (methodKey.startsWith('egg-') && !optionFilters['Egg']) continue;
      if (methodKey.startsWith('purification') && !optionFilters['Purify']) continue;
      if (methodKey.startsWith('light-ball-egg-') && !optionFilters['Other']) continue;

      const moves = (entry as any)?.moves;
      if (Array.isArray(moves)) {
        moves.forEach((m: string) => moveSet.add(m));
      } else if (moves && typeof moves === 'object') {
        Object.keys(moves).forEach(m => moveSet.add(m));
      }
    }
    return Array.from(moveSet);
  }, [optionFiltersKey, selectedPokemon]);

  const filteredMoves = useMemo(() => {
    if (!selectedPokemon) return [];
    return getRseContestMoves(availableMoves, typeFilter);
  }, [availableMoves, selectedPokemon, typeFilter]);

  return (
    <div className="contest-layout">
      <div className="moves-stack">
        <ContestTabs />
        <div className="moves-column">
          <div className="moves-panel">
              <div className="move-list">
                {!selectedPokemon && (
                  <div className="move-empty">Start typing a Pokémon name to see contest moves.</div>
                )}
                {selectedPokemon && filteredMoves.map(move => (
                  <div className="move-row" key={`${move.move}-${move.appeal}-${move.type}`}>
                    <div className={`type-pill type-${move.type}`}>{TYPE_FILTERS.find(t => t.value === move.type)?.label || move.type}</div>
                    <div className="move-name">{move.move}</div>
                    <div className="move-appeal">{move.appeal}</div>
                  </div>
                ))}
                {selectedPokemon && filteredMoves.length === 0 && (
                  <div className="move-empty">No moves for this contest type yet.</div>
                )}
              </div>
            </div>
          </div>
      </div>

      <div className="viewer-column">
        <div className="viewer-header-wrap">
          <div className={`viewer-header${showOptions ? ' options-open' : ''}`}>
            <div className="header-right">
              <div className="header-row">
                <div className="pokemon-select">
                  <div className="combobox-shell">
                  <input
                    id="pokemon-combobox"
                    type="text"
                    className="combobox-input"
                    placeholder="Search Pokémon..."
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    aria-expanded={showDropdown}
                    aria-controls="pokemon-results"
                    aria-autocomplete="list"
                    role="combobox"
                  />
                  {showDropdown && (
                    <ul className="combobox-dropdown" id="pokemon-results" role="listbox">
                      {searchResults.map(option => (
                        <li
                          key={option.key}
                          className="combobox-option"
                          onMouseDown={() => {
                            setSelectedPokemon(option.key);
                            setSearchTerm(option.name);
                            setShowDropdown(false);
                            navigate(`/contest-moves/rse/${option.key}`);
                          }}
                          role="option"
                          aria-selected={option.key === selectedPokemon}
                        >
                          <img
                            alt={option.name}
                            className="pokemon-icon-small"
                            {...getPokemonIconProps(option.key, option.data as PokemonData, pokemonDb)}
                          />
                          <span>{option.name}</span>
                        </li>
                      ))}
                      {searchResults.length === 0 && (
                        <li className="combobox-empty" aria-live="polite">No matches</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className="type-select">
                <select
                  id="contest-type"
                  aria-label="Contest type"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
                >
                  {TYPE_FILTERS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`language-toggle${showOptions ? ' open' : ''}`}
                onClick={() => setShowOptions(prev => !prev)}
                aria-label={showOptions ? 'Hide options' : 'Show options'}
              >
                {showOptions ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

          {showOptions && (
            <div className="viewer-options">
              <div className="option-grid">
                {OPTION_FILTERS.map(option => {
                  const isOn = optionFilters[option.key];
                  return (
                    <label key={option.key} className={`option-toggle ${isOn ? 'on' : 'off'}`}>
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() =>
                          setOptionFilters(prev => ({
                            ...prev,
                            [option.key]: !prev[option.key],
                          }))
                        }
                      />
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                      <span className="option-label">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="viewer-body">
          <div className="pokemon-plate">
            {largeIconProps ? (
              <img
                className="pokemon-hero"
                alt={selectedDisplayName}
                {...largeIconProps}
              />
            ) : (
              <div className="pokemon-placeholder">Select a Pokémon</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
