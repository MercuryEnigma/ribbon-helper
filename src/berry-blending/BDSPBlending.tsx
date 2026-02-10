import React, { useState, useMemo } from 'react';
import {
  calculateOptimalPoffinBakingCombo,
  convertBDSPPoffinData,
  filterPoffins,
  type Poffin,
  type Nature,
  type PoffinFilters
} from './poffinBakingBDSP';
import allPoffinsData from '../data/poffins_bdsp.json';
import naturesData from '../data/natures.json';
import { getBerryImageUrl } from './berryImageHelper';

// Poffin with name field for display
type NamedPoffin = Poffin & { name: string };

const natures = naturesData as Record<string, Nature>;
const natureOptions = Object.keys(natures).sort();

export default function BDSPBlending() {
  const [useDamage, setUseDamage] = useState(true);
  const [usePinch, setUsePinch] = useState(true);
  const [useMild, setUseMild] = useState(true);
  const [bestBuddies, setBestBuddies] = useState<number>(6);
  const [nature, setNature] = useState<string>('');

  const allPoffins: NamedPoffin[] = useMemo(
    () => convertBDSPPoffinData(allPoffinsData as any, bestBuddies),
    [bestBuddies]
  );

  // Filter available poffins based on user options
  const availablePoffins = useMemo(() => {
    const filters: PoffinFilters = {
      platinum: false,
      mild: useMild,
      damage: useDamage,
      pdr: usePinch,
    };
    return filterPoffins(allPoffins, filters) as NamedPoffin[];
  }, [allPoffins, usePinch, useMild, useDamage]);

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
    <div className="bdsp-blending">
      <h3><span>Brilliant Diamond / Shining Pearl Poffin making</span></h3>

      <div className="blending-options">
        <div className="option-row">
          <div className="option-group inline">
            <label>Best buddies:</label>
            <div className="player-buttons">
              {[0, 1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  className={bestBuddies === count ? 'active' : ''}
                  onClick={() => setBestBuddies(count)}
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
                checked={useDamage}
                onChange={(e) => setUseDamage(e.target.checked)}
              />
              <span className="toggle-label">Use damage-reducing berries</span>
              <span className="toggle-track" aria-hidden="true">
                {useDamage && <span className="toggle-check">✓</span>}
              </span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={usePinch}
                onChange={(e) => setUsePinch(e.target.checked)}
              />
              <span className="toggle-label">Use pinch berries</span>
              <span className="toggle-track" aria-hidden="true">
                {usePinch && <span className="toggle-check">✓</span>}
              </span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={useMild}
                onChange={(e) => setUseMild(e.target.checked)}
              />
              <span className="toggle-label">Use mild poffin</span>
              <span className="toggle-track" aria-hidden="true">
                {useMild && <span className="toggle-check">✓</span>}
              </span>
            </label>
        </div>
      </div>

      {poffinKit ? (
        <div className="berry-kit">
          <h4>Optimal Poffins:</h4>
          <div className="kit-blocks">
            {(() => {
              const all = poffinKit.poffins;
              const last = all[all.length - 1];
              const rest = all.slice(0, -1);

              // Group the non-final poffins by type
              const groups: { poffin: NamedPoffin; count: number }[] = [];
              for (const p of rest) {
                const existing = groups.find(g => g.poffin.berries === p.berries);
                if (existing) {
                  existing.count++;
                } else {
                  groups.push({ poffin: p, count: 1 });
                }
              }

              return (
                <>
                  {groups.map((group, index) => {
                    const imageUrl = getBerryImageUrl(group.poffin.berries);
                    return (
                      <div key={index} className="block-item">
                        <div className="block-players">{group.count}x</div>
                        <div className="block-header">
                          {imageUrl && (
                            <img src={imageUrl} alt={group.poffin.berries} title={group.poffin.berries} className="berry-icon" />
                          )}
                          <div className="block-name">{group.poffin.name}</div>
                        </div>
                        <div className="block-berry">{group.poffin.berries}</div>
                      </div>
                    );
                  })}
                  {last && (() => {
                    const imageUrl = getBerryImageUrl(last.berries);
                    return (
                      <div className="block-item">
                        <div className="block-players">1x</div>
                        <div className="block-header">
                          {imageUrl && (
                            <img src={imageUrl} alt={last.berries} title={last.berries} className="berry-icon" />
                          )}
                          <div className="block-name">{last.name}</div>
                        </div>
                        <div className="block-berry">{last.berries}</div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
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
