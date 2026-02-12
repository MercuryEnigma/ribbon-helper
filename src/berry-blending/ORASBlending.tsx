import React from 'react';

export default function ORASBlending() {
  return (
    <div className="oras-blending">
      <h3><span>Omega Ruby / Alpha Sapphire Pokeblock making</span></h3>

      <div className="oras-info-card">
        <p>
          In ORAS, there is no blending minigame. Simple select 
          up to 4 berries to get the same number of Pokeblocks. 
          Ensure each berry is a different color to get a rainbow 
          pokeblock. Select berries of all the same color to get 
          that color pokeblock. Regular pokeblocks give 2-8 points. 
          Rainbow pokeblocks give 2-8 points in all stats. Pokeblock+ 
          pokeblocks give 16 points.        
        </p>
        <div className="color-mapping-list">
          <div className="color-mapping-item">
            <div className="color-label spicy">Red</div>
            <div className="flavor-label">Spicy</div>
            <div className="stat-label-name">Cool</div>
          </div>
          <div className="color-mapping-item">
            <div className="color-label dry">Blue</div>
            <div className="flavor-label">Dry</div>
            <div className="stat-label-name">Beauty</div>
          </div>
          <div className="color-mapping-item">
            <div className="color-label sweet">Pink</div>
            <div className="flavor-label">Sweet</div>
            <div className="stat-label-name">Cute</div>
          </div>
          <div className="color-mapping-item">
            <div className="color-label bitter">Green</div>
            <div className="flavor-label">Bitter</div>
            <div className="stat-label-name">Clever</div>
          </div>
          <div className="color-mapping-item">
            <div className="color-label sour">Yellow</div>
            <div className="flavor-label">Sour</div>
            <div className="stat-label-name">Tough</div>
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
