import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import SwitchCompatibility from './switch-compatibility'
import BerryBlending from './berry-blending/BerryBlending'
import Acknowledgements from './components/Acknowledgements'
import ContestMoves from './contest-moves/ContestMoves'
import VisualDecoration from './visual-decoration/VisualDecoration'

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [themePreference, setThemePreference] = useState(() => {
    if (typeof localStorage === 'undefined') return 'auto'
    return localStorage.getItem('theme-preference') || 'auto'
  })
  const location = useLocation()

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    if (themePreference === 'dark') {
      root.classList.add('theme-dark')
      root.style.colorScheme = 'dark'
    } else if (themePreference === 'light') {
      root.classList.add('theme-light')
      root.style.colorScheme = 'light'
    } else {
      root.style.colorScheme = ''
    }

    try {
      localStorage.setItem('theme-preference', themePreference)
    } catch (err) {
      console.warn('Unable to persist theme preference', err)
    }
  }, [themePreference])

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
        <button className="settings-button" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
          ⚙️ Settings
        </button>
        <div className="header-actions">
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
            <NavLink to="/visual-decoration" className={({ isActive }) => isActive ? 'active' : ''}>
              Contest Visuals
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="panel">
          <Routes>
            <Route path="/" element={<Navigate to="/game-compatibility" replace />} />
            <Route path="/game-compatibility/*" element={<SwitchCompatibility />} />
            <Route path="/berry-blending/*" element={<BerryBlending />} />
            <Route path="/contest-moves/*" element={<ContestMoves />} />
            <Route path="/visual-decoration/*" element={<VisualDecoration />} />
            <Route path="*" element={<Navigate to="/game-compatibility" replace />} />
          </Routes>

          <Acknowledgements pageSpecific={getAcknowledgements()} />
        </section>
      </main>

      {isSettingsOpen && (
        <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Appearance settings" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3>Appearance</h3>
              <button className="settings-close" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">✕</button>
            </div>
            <p className="settings-description">Choose how Ribbon Helper uses dark mode.</p>
            <div className="settings-options">
              <label>
                Theme
                <select
                  value={themePreference}
                  onChange={e => setThemePreference(e.target.value)}
                  aria-label="Theme preference"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (follow system)</option>
                </select>
              </label>
            </div>
            <div className="settings-footer">
              <button className="settings-save" onClick={() => setIsSettingsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
