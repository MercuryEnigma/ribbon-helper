import React from 'react';
import ContestTabs from './ContestTabs';
import './contest-moves.css';

export default function BDSPMoves() {
  return (
    <div className="contest-layout">
      <div className="moves-stack">
        <ContestTabs />
        <div className="moves-column">
          <div className="moves-panel">
            <div className="move-empty">BDSP contest moves coming soon.</div>
          </div>
        </div>
      </div>
      <div className="viewer-column">
        <div className="viewer-body">
          <div className="pokemon-plate">
            <div className="pokemon-placeholder">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  );
}
