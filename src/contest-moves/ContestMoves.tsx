import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import RSEMoves from './RSEMoves';
import DPPtMoves from './DPPtMoves';
import ORASMoves from './ORASMoves';
import BDSPMoves from './BDSPMoves';
import './contest-moves.css';

export default function ContestMoves() {
  const navigate = useNavigate();

  return (
    <div className="contest-moves">
      <Routes>
        <Route path="/" element={<Navigate to="/contest-moves/rse" replace />} />
        <Route path="/rse" element={<RSEMoves selectedGame="rse" onNavigate={navigate} />} />
        <Route path="/rse/:pokemonKey" element={<RSEMoves selectedGame="rse" onNavigate={navigate} />} />
        <Route path="/dppt" element={<DPPtMoves selectedGame="dppt" onNavigate={navigate} />} />
        <Route path="/dppt/:pokemonKey" element={<DPPtMoves selectedGame="dppt" onNavigate={navigate} />} />
        <Route path="/oras" element={<ORASMoves selectedGame="oras" onNavigate={navigate} />} />
        <Route path="/oras/:pokemonKey" element={<ORASMoves selectedGame="oras" onNavigate={navigate} />} />
        <Route path="/bdsp" element={<BDSPMoves selectedGame="bdsp" onNavigate={navigate} />} />
        <Route path="/bdsp/:pokemonKey" element={<BDSPMoves selectedGame="bdsp" onNavigate={navigate} />} />
      </Routes>
    </div>
  );
}
