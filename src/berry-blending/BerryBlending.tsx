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
          className="nav-arrow nav-arrow-left"
          aria-label="Previous"
          onClick={() => {
            if (selectedGame === 'rse') setSelectedGame('bdsp');
            else if (selectedGame === 'dppt') setSelectedGame('rse');
            else if (selectedGame === 'oras') setSelectedGame('dppt');
            else if (selectedGame === 'bdsp') setSelectedGame('oras');
          }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
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
        <button
          className="nav-arrow nav-arrow-right"
          aria-label="Next"
          onClick={() => {
            if (selectedGame === 'rse') setSelectedGame('dppt');
            else if (selectedGame === 'dppt') setSelectedGame('oras');
            else if (selectedGame === 'oras') setSelectedGame('bdsp');
            else if (selectedGame === 'bdsp') setSelectedGame('rse');
          }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
