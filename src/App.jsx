import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import SwitchCompatibility from './switch-compatibility'
import BerryBlending from './berry-blending/BerryBlending'
import Acknowledgements from './components/Acknowledgements'
import ContestMoves from './contest-moves/ContestMoves'
import VisualDecoration from './visual-decoration/VisualDecoration'
import BattleFacilities from './battle-facilities/BattleFacilities'
import Guides from './guides/Guides'
import HomeMerger from './home-merger/HomeMerger'

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
      return [{ name: 'Ribbons.guide', url: 'https://ribbons.guide' }]
    } else if (path.includes('/berry-blending/rse')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/edit?gid=1577996444#gid=1577996444' }]
    } else if (path.includes('/berry-blending/dppt')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/copy' }]
    } else if (path.includes('/berry-blending/oras')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/edit?gid=1577996444#gid=1577996444' }]
    } else if (path.includes('/berry-blending/bdsp')) {
      return [{ name: 'SadisticMystic', url: 'https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/copy' }]
    } else if (path.includes('/visual-decoration/bdsp-ball-stickers')) {
      return [{ name: 'Anubis', url: 'https://x.com/Sibuna_Switch' }]
    } else if (path.startsWith('/battle-facilities/rs')) {
      return [
        { name: 'EisenCalc', url: 'https://eisencalc.com' },
        { name: 'Bulbapedia R/S Battle Tower Trainers', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Ruby_and_Sapphire' },
        { name: 'Bulbapedia R/S Battle Tower Pokemon', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Ruby_and_Sapphire' },
        { name: 'Altissimo RSE Battle Tower Trainers', url: 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-trainers.html' },
        { name: 'Altissimo RSE Battle Tower Pokemon', url: 'https://altissimo1.github.io/Main-Series/RSE/battle-tower-pokemon.html' },
      ]
    } else if (path.startsWith('/battle-facilities/dp')) {
      return [
        { name: 'EisenCalc', url: 'https://eisencalc.com' },
        { name: 'Bulbapedia D/P Battle Tower Trainers', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Diamond_and_Pearl' },
        { name: 'Bulbapedia D/P Battle Tower Pokemon Group 1', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Diamond_and_Pearl/Group_1' },
        { name: 'Bulbapedia D/P Battle Tower Pokemon Group 2', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Diamond_and_Pearl/Group_2' },
        { name: 'Altissimo D/P Battle Tower Pokemon', url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-pokemon.html' },
        { name: 'Altissimo D/P Battle Tower Trainers', url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower-trainers.html' },
        { name: 'Altissimo D/P Battle Tower', url: 'https://altissimo1.github.io/Main-Series/DPPt/battle-tower.html' },
      ]
    } else if (path.startsWith('/battle-facilities/mt-battle')) {
      return [
        { name: 'EisenCalc', url: 'https://eisencalc.com' },
        { name: 'Bulbapedia Mt. Battle', url: 'https://bulbapedia.bulbagarden.net/wiki/Mt._Battle#100-battle_challenge' },
        { name: 'Bulbapedia Mt. Battle Areas 1-10', url: 'https://bulbapedia.bulbagarden.net/wiki/Mt._Battle_Area_1' },
        { name: 'Altissimo Colosseum Story Mode Mt. Battle', url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Story-Mode/mt-battle.html' },
        { name: 'Altissimo Colosseum Battle Mode Singles', url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-singles.html' },
        { name: 'Altissimo Colosseum Battle Mode Doubles', url: 'https://altissimo1.github.io/Supplementary-Series/Orre/Colosseum/Battle-Mode/mt-battle-doubles.html' },
        { name: 'Altissimo XD Mt. Battle', url: 'https://altissimo1.github.io/Supplementary-Series/Orre/XD/mt-battle.html' },
      ]
    } else if (path.startsWith('/battle-facilities/swsh')) {
      return [
        { name: 'EisenCalc', url: 'https://eisencalc.com' },
        { name: 'Bulbapedia Sw/Sh Battle Tower Trainers', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Trainers_in_Pok%C3%A9mon_Sword_and_Shield' },
        { name: 'Bulbapedia Sw/Sh Battle Tower Pokemon', url: 'https://bulbapedia.bulbagarden.net/wiki/List_of_Battle_Tower_Pok%C3%A9mon_in_Pok%C3%A9mon_Sword_and_Shield' },
        { name: 'Altissimo Sw/Sh Battle Tower Trainers', url: 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-trainers.html' },
        { name: 'Altissimo Sw/Sh Battle Tower Pokemon', url: 'https://altissimo1.github.io/Main-Series/SwSh/battle-tower-pokemon.html' },
      ]
    } else if (path.startsWith('/battle-facilities')) {
      return [{ name: 'EisenCalc', url: 'https://eisencalc.com' }]
    }

    return []
  }

  const getAcknowledgementDescription = () => {
    const path = location.pathname
    if (path.startsWith('/guides')) {
      return 'This guide use write-ups and infographics created by Psychic J as references. Their contributions to the Ribbon Master community are greatly appreciated and cannot be understated.'
    } else if (path.startsWith('/battle-facilities')) {
      return 'This calculator is based on the work of Honko, gamut, and Zarel. It was optimized for players in the Pokémon Championship Series by Tapin, Firestorm, and squirrelboy1225, for Battle Spot Singles players by cant say and LegoFigure11, and for Battle Facilities by Eisenherz and SilverstarStream, and refined for obtaining ribbons by MercuryEnigma.'
    }
    return undefined
  }

  const isContestMovesPage = location.pathname.includes('/contest-moves')
  const getNavLinkClassName = modifier => ({ isActive }) =>
    `nav-link nav-link--${modifier}${isActive ? ' active' : ''}`

  return (
    <div className="app">
      <header className="header">
        <div className="header-title-group">
          <img src={`${import.meta.env.BASE_URL}images/ribbons/artist-ribbon.png`} alt="Artist Ribbon" className="navbar-brand-icon" />
          <div className="title">Ribbon Helper</div>
          <div className="subtitle">by MercuryEnigma</div>
        </div>
        <a href="https://ribbons.guide" className="navbar-brand" target="_blank" rel="noopener noreferrer">
                  <div className="subtitle">start tracking ribbons at:</div>
          <img src={`${import.meta.env.BASE_URL}images/ribbons/best-friends-ribbon.png`} alt="Best Friends Ribbon" className="navbar-brand-icon" />
          <span className="navbar-brand-text">Ribbons.Guide</span>
        </a>
        {/* <button className="settings-button" onClick={() => setIsSettingsOpen(true)} aria-label="Open settings">
          ⚙️ Settings
        </button> */}
        <div className="header-actions">
          <nav className="nav">
            <NavLink to="/game-compatibility" className={getNavLinkClassName('pokemon')}>
              Pokémon
            </NavLink>
            <NavLink to="/guides" className={getNavLinkClassName('guides')}>
              Guides
            </NavLink>
            <NavLink to="/battle-facilities" className={getNavLinkClassName('battle-facilities')}>
              Battle Facilities
            </NavLink>
            <NavLink to="/berry-blending" className={getNavLinkClassName('berry-blending')}>
              Berry Blending
            </NavLink>
            <NavLink to="/contest-moves" className={getNavLinkClassName('contest-moves')}>
              Contest Moves
            </NavLink>
            <NavLink to="/visual-decoration" className={getNavLinkClassName('contest-visuals')}>
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
            <Route path="/battle-facilities" element={<Navigate to="/battle-facilities/emerald" replace />} />
            <Route path="/battle-facilities/:game" element={<BattleFacilities />} />
            <Route path="/guides" element={<Navigate to="/guides/footprint-ribbon" replace />} />
            <Route path="/guides/ribbon-checker" element={<HomeMerger />} />
            <Route path="/guides/:guideId" element={<Guides />} />
            <Route path="*" element={<Navigate to="/game-compatibility" replace />} />
          </Routes>

          {isContestMovesPage && (
            <div className="contest-move-list-note">
              Want to see all possible contest moves by effect? Check out{' '}
              <a href="https://armastide.net/celeste/ribbonguide/contest-widget" target="_blank" rel="noopener noreferrer">
                Contest Move List 
              </a>
              &nbsp;by Kiki.
            </div>
          )}

          <Acknowledgements pageSpecific={getAcknowledgements()} pageDescription={getAcknowledgementDescription()} />
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
