import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RseMoves from './RseMoves';
import DPPtMoves from './DPPtMoves';
import ORASMoves from './ORASMoves';
import BDSPMoves from './BDSPMoves';
import './contest-moves.css';

export default function ContestMoves() {
  return (
    <div className="contest-moves">
      <Routes>
        <Route path="/" element={<Navigate to="/contest-moves/rse" replace />} />
        <Route path="/rse" element={<RseMoves />} />
        <Route path="/rse/:pokemonKey" element={<RseMoves />} />
        <Route path="/dppt" element={<DPPtMoves />} />
        <Route path="/oras" element={<ORASMoves />} />
        <Route path="/bdsp" element={<BDSPMoves />} />
        <Route path="*" element={<Navigate to="/contest-moves/rse" replace />} />
      </Routes>
    </div>
  );
}
