import React, { useState, useMemo } from 'react';
import { calculateOptimalPoffinKit } from './poffinCalculator';
import natures from '../data/natures.json';
import { getBerryImageUrl } from './berryImageHelper';

export default function DPPtBlending() {
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4>(1);
  const [withPlatinum, setWithPlatinum] = useState(true);
  const [withMild, setWithMild] = useState(true);
  const [withPDR, setWithPDR] = useState(false);
  const [withFrontier, setWithFrontier] = useState(false);
  const [withEvent, setWithEvent] = useState(false);
  const [nature, setNature] = useState<string>('');

  const poffinKit = useMemo(() => {
    return calculateOptimalPoffinKit(
      playerCount,
      withPlatinum,
      withMild,
      withPDR,
      withFrontier,
      withEvent,
      nature || null
    );
  }, [playerCount, withPlatinum, withMild, withPDR, withFrontier, withEvent, nature]);

  const natureOptions = Object.keys(natures).sort();

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
          <h4>Optimal Poffin Kit:</h4>
          <div className="kit-blocks">
            {poffinKit.poffins.map((poffin, index) => {
              const imageUrl = getBerryImageUrl(poffin.berries);
              let berryDescription = poffin.berries;

              if (poffin.mild) {
                berryDescription += ' poffin (1 per save file)';
              } else if (poffin.platinum) {
                berryDescription += ' poffin (buy from Veilstone Dept. Store)';
              }

              return (
                <div key={index} className="block-item">
                  <div className="block-header">
                    {imageUrl && (
                      <img src={imageUrl} alt={poffin.berries} title={poffin.berries} className="berry-icon" />
                    )}
                    <div className="block-name">{poffin.name}</div>
                  </div>
                  <div className="block-meta">{poffin.players}-player</div>
                  <div className="block-berry">{berryDescription}</div>
                </div>
              );
            })}
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
                <span className="stat sheen">Sheen: {poffinKit.totalFeel}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Average Stat:</span>
              <span>{poffinKit.averageStat.toFixed(1)}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="no-results">No poffin kits available for this configuration.</p>
      )}
    </div>
  );
}
