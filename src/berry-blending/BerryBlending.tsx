import { Routes, Route, NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import RSEBlending from './RSEBlending';
import DPPtBlending from './DPPtBlending';
import ORASBlending from './ORASBlending';
import BDSPBlending from './BDSPBlending';
import './berry-blending.css';

type GameSelection = 'rse' | 'dppt' | 'oras' | 'bdsp';

function GameSelector() {
  const navigate = useNavigate();
  const params = useParams();
  const selectedGame = (params['*'] || 'rse') as GameSelection;

  const handlePrevious = () => {
    if (selectedGame === 'rse') navigate('/berry-blending/bdsp');
    else if (selectedGame === 'dppt') navigate('/berry-blending/rse');
    else if (selectedGame === 'oras') navigate('/berry-blending/dppt');
    else if (selectedGame === 'bdsp') navigate('/berry-blending/oras');
  };

  const handleNext = () => {
    if (selectedGame === 'rse') navigate('/berry-blending/dppt');
    else if (selectedGame === 'dppt') navigate('/berry-blending/oras');
    else if (selectedGame === 'oras') navigate('/berry-blending/bdsp');
    else if (selectedGame === 'bdsp') navigate('/berry-blending/rse');
  };

  return (
    <>
      <div className="berry-mode-selector">
        <button
          className="nav-arrow nav-arrow-left"
          aria-label="Previous"
          onClick={handlePrevious}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="15,6 9,12 15,18"/>
          </svg>
        </button>
        <NavLink
          to="/berry-blending/rse"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          RSE
        </NavLink>
        <NavLink
          to="/berry-blending/dppt"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          DPPt
        </NavLink>
        <NavLink
          to="/berry-blending/oras"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          ORAS
        </NavLink>
        <NavLink
          to="/berry-blending/bdsp"
          className={({ isActive }) => isActive ? 'active' : ''}
        >
          BDSP
        </NavLink>
        <button
          className="nav-arrow nav-arrow-right"
          aria-label="Next"
          onClick={handleNext}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="9,6 15,12 9,18"/>
          </svg>
        </button>
      </div>

      <div className="berry-mode-content">
        <Routes>
          <Route path="/" element={<Navigate to="/berry-blending/rse" replace />} />
          <Route path="/rse" element={<RSEBlending />} />
          <Route path="/dppt" element={<DPPtBlending />} />
          <Route path="/oras" element={<ORASBlending />} />
          <Route path="/bdsp" element={<BDSPBlending />} />
        </Routes>
      </div>
    </>
  );
}

export default function BerryBlending() {
  return (
    <div className="berry-blending">
      <GameSelector />
    </div>
  );
}
