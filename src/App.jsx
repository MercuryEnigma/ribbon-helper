import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import SwitchCompatibility from './switch-compatibility'
import BerryBlending from './berry-blending/BerryBlending'
import Acknowledgements from './components/Acknowledgements'

function ContestMoves() {
  return <p className="coming">Contest move planning functionality coming soon.</p>
}

export default function App() {
  const location = useLocation()

  // Determine acknowledgements based on current route
  const getAcknowledgements = () => {
    const path = location.pathname

    if (path.startsWith('/game-compatibility')) {
      return [{ name: 'SlyAceZeta', url: 'https://ribbons.guide' }]
    } else if (path.includes('/berry-blending/rse')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/edit?gid=1577996444#gid=1577996444' }]
    } else if (path.includes('/berry-blending/dppt')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/copy' }]
    } else if (path.includes('/berry-blending/oras')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/edit?gid=1577996444#gid=1577996444' }]
    } else if (path.includes('/berry-blending/bdsp')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/copy' }]
    }

    return []
  }

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

          <Acknowledgements pageSpecific={getAcknowledgements()} />
        </section>
      </main>
    </div>
  )
}
