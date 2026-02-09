import React, { useState, useMemo } from 'react';
import {
  calculateOptimalPoffinBakingCombo,
  filterPoffins,
  type Poffin,
  type Nature,
  type PoffinFilters
} from './poffinBaking';
import allPoffinsData from '../data/poffins.json';
import naturesData from '../data/natures.json';
import { getBerryImageUrl } from './berryImageHelper';

// Poffin with name field for display
type NamedPoffin = Poffin & { name: string };

const allPoffins: NamedPoffin[] = Object.entries(allPoffinsData).map(([name, data]) => ({
  ...(data as Poffin),
  name,
}));

const natures = naturesData as Record<string, Nature>;
const natureOptions = Object.keys(natures).sort();

export default function DPPtBlending() {
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4>(1);
  const [withPlatinum, setWithPlatinum] = useState(true);
  const [withMild, setWithMild] = useState(true);
  const [withPDR, setWithPDR] = useState(false);
  const [withFrontier, setWithFrontier] = useState(false);
  const [withEvent, setWithEvent] = useState(false);
  const [nature, setNature] = useState<string>('');

  // Filter available poffins based on user options
  const availablePoffins = useMemo(() => {
    const filters: PoffinFilters = {
      num_players: playerCount,
      platinum: withPlatinum,
      mild: withMild,
      pdr: withPDR,
      frontier: withFrontier,
      event: withEvent,
    };
    return filterPoffins(allPoffins, filters) as NamedPoffin[];
  }, [playerCount, withPlatinum, withMild, withPDR, withFrontier, withEvent]);

  // Convert nature string to Nature interface
  const selectedNature = useMemo(() => natures[nature] ?? {}, [nature]);

  // Calculate optimal poffin kit
  const poffinKit = useMemo(() => {
    if (availablePoffins.length === 0) {
      return null;
    }

    const result = calculateOptimalPoffinBakingCombo(availablePoffins, selectedNature);

    const contestStats = {
      cool: result.finalStats.spicy + 0.5 * result.finalStats.dry + 0.5 * result.finalStats.sour,
      beauty: result.finalStats.dry + 0.5 * result.finalStats.spicy + 0.5 * result.finalStats.sweet,
      cute: result.finalStats.sweet + 0.5 * result.finalStats.dry + 0.5 * result.finalStats.bitter,
      smart: result.finalStats.bitter + 0.5 * result.finalStats.sweet + 0.5 * result.finalStats.sour,
      tough: result.finalStats.sour + 0.5 * result.finalStats.bitter + 0.5 * result.finalStats.spicy,
    };

    const contestStatValues = Object.values(contestStats).map(Math.floor);
    const contestMin = Math.min(...contestStatValues);
    const contestAverage =
      contestStatValues.reduce((sum, value) => sum + value, 0) / contestStatValues.length;

    return {
      poffins: result.poffins as NamedPoffin[],
      totalStats: {
        spicy: result.finalStats.spicy,
        dry: result.finalStats.dry,
        sweet: result.finalStats.sweet,
        bitter: result.finalStats.bitter,
        sour: result.finalStats.sour,
      },
      totalFeel: result.finalStats.feel,
      averageStat:
        (result.finalStats.spicy +
          result.finalStats.dry +
          result.finalStats.sweet +
          result.finalStats.bitter +
          result.finalStats.sour) /
        5,
      contestStats: Object.fromEntries(
        Object.entries(contestStats).map(([key, value]) => [key, Math.floor(value)])
      ) as Record<'cool' | 'beauty' | 'cute' | 'smart' | 'tough', number>,
      contestMin,
      contestAverage,
    };
  }, [availablePoffins, selectedNature]);

  return (
    <div className="dppt-blending">
      <h3><span>Diamond / Pearl / Platinum Poffin making</span></h3>

      <div className="blending-options">
        <div className="option-row">
          <div className="option-group inline">
            <label>Players:</label>
            <div className="player-buttons">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  className={playerCount === count ? 'active' : ''}
                  onClick={() => setPlayerCount(count as 1 | 2 | 3 | 4)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group inline">
            <label>Nature:</label>
            <select value={nature} onChange={(e) => setNature(e.target.value)} autoComplete="off">
              <option value="">None (neutral nature)</option>
              {natureOptions.map((nat) => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="option-group">
          <label>Berry options:</label>
        </div>
          <div className="option-row">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={withPlatinum}
                onChange={(e) => setWithPlatinum(e.target.checked)}
              />
              <span className="toggle-label">Veilstone Dept. store poffins (Platinum only)</span>
              <span className="toggle-track" aria-hidden="true">
                {withPlatinum && <span className="toggle-check">✓</span>}
              </span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={withMild}
                onChange={(e) => setWithMild(e.target.checked)}
              />
              <span className="toggle-label">Include Mild poffin gift</span>
              <span className="toggle-track" aria-hidden="true">
                {withMild && <span className="toggle-check">✓</span>}
              </span>
            </label>
        </div>

        <div className="option-row">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={withFrontier}
                onChange={(e) => setWithFrontier(e.target.checked)}
              />
              <span className="toggle-label">Battle Frontier (Pt/HG/SS)</span>
              <span className="toggle-track" aria-hidden="true">
                {withFrontier && <span className="toggle-check">✓</span>}
              </span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={withPDR}
                onChange={(e) => setWithPDR(e.target.checked)}
              />
              <span className="toggle-label">Pokémon Battle Revolution</span>
              <span className="toggle-track" aria-hidden="true">
                {withPDR && <span className="toggle-check">✓</span>}
              </span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={withEvent}
                onChange={(e) => setWithEvent(e.target.checked)}
              />
              <span className="toggle-label">Event-only berries</span>
              <span className="toggle-track" aria-hidden="true">
                {withEvent && <span className="toggle-check">✓</span>}
              </span>
            </label>
        </div>
      </div>

      {poffinKit ? (
        <div className="berry-kit">
          <h4>Optimal Poffins:</h4>
          <div className="kit-blocks">
            {poffinKit.poffins.map((poffin, index) => {
              const imageUrl = getBerryImageUrl(poffin.berries);
              const playersLabel =
                poffin.platinum || poffin.mild
                  ? '-'
                  : `${poffin.players}P`;
              let berryDescription = poffin.berries;

              if (poffin.mild) {
                berryDescription += ' poffin (1 per save file)';
              } else if (poffin.platinum) {
                berryDescription += ' poffin (buy from Veilstone Dept. Store)';
              }

              return (
                <div key={index} className="block-item">
                  <div className="block-players">{playersLabel}</div>
                  <div className="block-header">
                    {imageUrl && (
                      <img src={imageUrl} alt={poffin.berries} title={poffin.berries} className="berry-icon" />
                    )}
                    <div className="block-name">{poffin.name}</div>
                  </div>
                  <div className="block-berry">{berryDescription}</div>
                  <div className="block-time">@ {poffin.time ? `${poffin.time} sec` : '-'}</div>
                </div>
              );
            })}
          </div>

          <div className="kit-stats">
            <div className="stat-row">
              <span className="stat-label">Pokemon Stats:</span>
              <div className="stats">
                <span className="stat spicy">Cool: {poffinKit.totalStats.spicy}</span>
                <span className="stat dry">Beauty: {poffinKit.totalStats.dry}</span>
                <span className="stat sweet">Cute: {poffinKit.totalStats.sweet}</span>
                <span className="stat bitter">Smart: {poffinKit.totalStats.bitter}</span>
                <span className="stat sour">Tough: {poffinKit.totalStats.sour}</span>
                <span className="stat sheen">Sheen: {poffinKit.totalFeel}</span>
                <span className="stat avg">Avg: {poffinKit.averageStat.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="kit-stats">
            <div className="stat-row">
              <span className="stat-label">Contest Stats:</span>
              <div className="stats">
                <span className="stat spicy">Cool: {poffinKit.contestStats.cool}</span>
                <span className="stat dry">Beauty: {poffinKit.contestStats.beauty}</span>
                <span className="stat sweet">Cute: {poffinKit.contestStats.cute}</span>
                <span className="stat bitter">Smart: {poffinKit.contestStats.smart}</span>
                <span className="stat sour">Tough: {poffinKit.contestStats.tough}</span>
                <span className="stat sheen">Min: {poffinKit.contestMin}</span>
                <span className="stat avg">Avg: {poffinKit.contestAverage.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="no-results">No poffin kits available for this configuration.</p>
      )}
    </div>
  );
}
