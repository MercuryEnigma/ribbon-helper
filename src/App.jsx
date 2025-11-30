import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import SwitchCompatibility from './switch-compatibility'
import BerryBlending from './berry-blending/BerryBlending'

function ContestMoves() {
  return <p className="coming">Contest move planning functionality coming soon.</p>
}

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="title">Ribbon Helper</div>
        <nav className="nav">
          <NavLink to="/game-compatibility" className={({ isActive }) => isActive ? 'active' : ''}>
            Game Compatibility
          </NavLink>
          <NavLink to="/berry-blending" className={({ isActive }) => isActive ? 'active' : ''}>
            Berry blending
          </NavLink>
          <NavLink to="/contest-moves" className={({ isActive }) => isActive ? 'active' : ''}>
            Contest Moves
          </NavLink>
        </nav>
      </header>

      <main className="main">
        <section className="panel">
          <Routes>
            <Route path="/" element={<Navigate to="/game-compatibility" replace />} />
            <Route path="/game-compatibility/*" element={<SwitchCompatibility />} />
            <Route path="/berry-blending/*" element={<BerryBlending />} />
            <Route path="/contest-moves" element={<ContestMoves />} />
            <Route path="*" element={<Navigate to="/game-compatibility" replace />} />
          </Routes>
        </section>
      </main>
    </div>
  )
}
