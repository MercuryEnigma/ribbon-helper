import React, { useState, useMemo } from 'react';
import { calculateOptimalBDSPPoffinKit } from './bdspPoffinCalculator';
import natures from '../data/natures.json';
import { getBerryImageUrl } from './berryImageHelper';

export default function BDSPBlending() {
  const [useRare, setUseRare] = useState(true);
  const [maxFriendship, setMaxFriendship] = useState(true);
  const [nature, setNature] = useState<string>('');

  const poffinKit = useMemo(() => {
    return calculateOptimalBDSPPoffinKit(
      !useRare, // only common when rare are not allowed
      maxFriendship,
      nature || null
    );
  }, [useRare, maxFriendship, nature]);

  const natureOptions = Object.keys(natures).sort();

  // Group poffins into cycles (each cycle = 5 poffins for a complete set)
  const poffinCycles = useMemo(() => {
    if (!poffinKit) return [];

    const cycles: Array<{ set: string; poffins: Array<{ name: string; berries: string }> }> = [];
    const poffinsPerSet = 5; // Each set has 5 poffins

    for (let i = 0; i < poffinKit.poffins.length; i += poffinsPerSet) {
      const cycleItems = poffinKit.poffins.slice(i, i + poffinsPerSet);

      // Extract set letter from first poffin in cycle
      if (cycleItems.length > 0) {
        const setMatch = cycleItems[0].name.match(/Set ([A-F])-/);
        const setLetter = setMatch ? setMatch[1] : 'Unknown';

        cycles.push({
          set: setLetter,
          poffins: cycleItems
        });
      }
    }

    return cycles;
  }, [poffinKit]);

  return (
    <div className="bdsp-blending">
      <h3><span>Brilliant Diamond / Shining Pearl Poffin making</span></h3>

      <div className="blending-options">
        <div className="option-row">
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
                checked={maxFriendship}
                onChange={(e) => setMaxFriendship(e.target.checked)}
              />
              <span className="toggle-label">Use 6 max friendship Pokémon in Amity Square</span>
              <span className="toggle-track" aria-hidden="true">
                {maxFriendship && <span className="toggle-check">✓</span>}
              </span>
            </label>

            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={useRare}
                onChange={(e) => setUseRare(e.target.checked)}
              />
              <span className="toggle-label">Use rare berries</span>
              <span className="toggle-track" aria-hidden="true">
                {useRare && <span className="toggle-check">✓</span>}
              </span>
            </label>
        </div>
      </div>

      {poffinKit ? (
        <div className="berry-kit">
          <h4>Optimal Poffin Kit:</h4>

          <div className="kit-blocks bdsp-kit-blocks">
            {poffinCycles.map((cycle, cycleIndex) => (
              <div key={cycleIndex} className="bdsp-set-group-wrapper">
                <div className="bdsp-set-label">Set {cycle.set}</div>
                <div className="bdsp-set-items">
                  {cycle.poffins.map((poffin, index) => {
                    const imageUrl = getBerryImageUrl(poffin.berries);
                    return (
                      <div key={index} className="block-item">
                        <div className="block-header">
                          {imageUrl && (
                            <img src={imageUrl} alt={poffin.berries} title={poffin.berries} className="berry-icon" />
                          )}
                          <div className="block-name">{poffin.name}</div>
                        </div>
                        <div className="block-berry">{poffin.berries}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="kit-stats">
            <div className="stat-row">
              <span className="stat-label">Total Stats:</span>
              <div className="stats">
                <span className="stat spicy">Spicy: {poffinKit.totalStats.spicy}</span>
                <span className="stat dry">Dry: {poffinKit.totalStats.dry}</span>
                <span className="stat sweet">Sweet: {poffinKit.totalStats.sweet}</span>
                <span className="stat bitter">Bitter: {poffinKit.totalStats.bitter}</span>
                <span className="stat sour">Sour: {poffinKit.totalStats.sour}</span>
                <span className="stat sheen">Sheen: {poffinKit.totalSheen}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Average Stat:</span>
              <span>{poffinKit.averageStat.toFixed(1)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="no-results">No poffin sets available for this configuration.</p>
      )}
    </div>
  );
}
