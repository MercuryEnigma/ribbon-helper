import React, { useState } from 'react';
import RSEBlending from './RSEBlending';
import DPPtBlending from './DPPtBlending';
import ORASBlending from './ORASBlending';
import BDSPBlending from './BDSPBlending';
import './berry-blending.css';

type GameSelection = 'rse' | 'dppt' | 'oras' | 'bdsp';

export default function BerryBlending() {
  const [selectedGame, setSelectedGame] = useState<GameSelection>('rse');

  return (
    <div className="berry-blending">
      <div className="berry-mode-selector">
        <button
          className={selectedGame === 'rse' ? 'active' : ''}
          onClick={() => setSelectedGame('rse')}
        >
          RSE
        </button>
        <button
          className={selectedGame === 'dppt' ? 'active' : ''}
          onClick={() => setSelectedGame('dppt')}
        >
          DPPt
        </button>
        <button
          className={selectedGame === 'oras' ? 'active' : ''}
          onClick={() => setSelectedGame('oras')}
        >
          ORAS
        </button>
        <button
          className={selectedGame === 'bdsp' ? 'active' : ''}
          onClick={() => setSelectedGame('bdsp')}
        >
          BDSP
        </button>
      </div>

      <div className="berry-mode-content">
        {!selectedGame && (
          <p className="hint berry-hint">Choose a game above to see berry blending options.</p>
        )}

        {selectedGame === 'rse' && <RSEBlending />}

        {selectedGame === 'dppt' && <DPPtBlending />}

        {selectedGame === 'oras' && <ORASBlending />}

        {selectedGame === 'bdsp' && <BDSPBlending />}
      </div>
    </div>
  );
}
