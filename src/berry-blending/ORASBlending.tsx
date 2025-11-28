import React from 'react';

export default function ORASBlending() {
  return (
    <div className="oras-blending">
      <h3>Omega Ruby / Alpha Sapphire Pokeblock Making</h3>

      <div className="oras-info-card">
        <p>
          In ORAS, there is no blending minigame. Simply select 4 berries of the same color
          to generate 4 Pokeblocks of that flavor.
        </p>

        <div className="color-mapping-list">
          <div className="color-mapping-item">
            <span className="color-label spicy">Red</span>
            <span className="flavor-label">Spicy</span>
            <span className="stat-label-name">Cool</span>
          </div>
          <div className="color-mapping-item">
            <span className="color-label dry">Blue</span>
            <span className="flavor-label">Dry</span>
            <span className="stat-label-name">Beauty</span>
          </div>
          <div className="color-mapping-item">
            <span className="color-label sweet">Pink</span>
            <span className="flavor-label">Sweet</span>
            <span className="stat-label-name">Cute</span>
          </div>
          <div className="color-mapping-item">
            <span className="color-label bitter">Green</span>
            <span className="flavor-label">Bitter</span>
            <span className="stat-label-name">Clever</span>
          </div>
          <div className="color-mapping-item">
            <span className="color-label sour">Yellow</span>
            <span className="flavor-label">Sour</span>
            <span className="stat-label-name">Tough</span>
          </div>
        </div>

        <p>
          Feed your Pokémon Pokeblocks of each color until all Contest stats are maxed out.
          There is no sheen or feel limit—you can feed as many Pokeblocks as needed.
        </p>
      </div>
    </div>
  );
}
