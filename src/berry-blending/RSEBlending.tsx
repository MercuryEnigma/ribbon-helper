import React, { useState, useMemo } from 'react';
import { calculateOptimalPokeblockKit } from './pokeblockCalculator';
import natures from '../data/natures.json';
import { getBerryImageUrl } from './berryImageHelper';

export default function RSEBlending() {
  const [playerCount, setPlayerCount] = useState<1 | 2 | 3 | 4>(1);
  const [withGamecube, setWithGamecube] = useState(true);
  const [withMirageIsland, setWithMirageIsland] = useState(false);
  const [withBerryMaster, setWithBerryMaster] = useState(false);
  const [nature, setNature] = useState<string>('');

  const berryKit = useMemo(() => {
    return calculateOptimalPokeblockKit(
      playerCount,
      withGamecube,
      withMirageIsland,
      withBerryMaster,
      nature || null
    );
  }, [playerCount, withGamecube, withMirageIsland, withBerryMaster, nature]);

  const natureOptions = Object.keys(natures).sort();

  return (
    <div className="rse-blending">
      <h3><span>Ruby / Sapphire / Emerald Pokeblock Blending</span></h3>

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
            <select value={nature} onChange={(e) => setNature(e.target.value)}>
              <option value="">None (maximize all stats)</option>
              {natureOptions.map((nat) => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="option-row">
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={withGamecube}
              onChange={(e) => setWithGamecube(e.target.checked)}
            />
            <span>Pinch berries (Gamecube)</span>
          </label>

          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={withMirageIsland}
              onChange={(e) => setWithMirageIsland(e.target.checked)}
            />
            <span>Liechi (Mirage Island)</span>
          </label>

          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={withBerryMaster}
              onChange={(e) => setWithBerryMaster(e.target.checked)}
            />
            <span>Blend Master (Emerald)</span>
          </label>
        </div>
      </div>

      {berryKit ? (
        <div className="berry-kit">
          <h4>Optimal Berry Kit:</h4>
          <div className="kit-blocks">
            {berryKit.blocks.map((block, index) => {
              const imageUrl = getBerryImageUrl(block.berry);
              return (
                <div key={index} className="block-item">
                  {imageUrl && (
                    <img src={imageUrl} alt={block.berry} title={block.berry} className="berry-icon" />
                  )}
                  <div className="block-content">
                    <div className="block-name">{block.name}</div>
                    <div className="block-meta">
                      {block.npc > 0 ? `${block.npc} NPC` : `${block.players}-player`}
                    </div>
                    <div className="block-berry">{block.berry}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="kit-stats">
            <div className="stat-row">
              <span className="stat-label">Total Stats:</span>
              <div className="stats">
                <span className="stat spicy">Spicy: {berryKit.totalStats.spicy}</span>
                <span className="stat dry">Dry: {berryKit.totalStats.dry}</span>
                <span className="stat sweet">Sweet: {berryKit.totalStats.sweet}</span>
                <span className="stat bitter">Bitter: {berryKit.totalStats.bitter}</span>
                <span className="stat sour">Sour: {berryKit.totalStats.sour}</span>
                <span className="stat sheen">Sheen: {berryKit.totalFeel}</span>
              </div>
            </div>

            <div className="stat-row">
              <span className="stat-label">Average Stat:</span>
              <span>{berryKit.averageStat.toFixed(1)}</span>
              <span className="stat-label">(at 85+ PRM)</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="no-results">No berry kits available for this configuration.</p>
      )}
    </div>
  );
}
