import React, { useState } from 'react'
import SwitchCompatibility from './switch-compatibility'
import BerryBlending from './berry-blending/BerryBlending'

export default function App() {
  const [sel, setSel] = useState('switch')

  const content = {
    contest: 'Contest move planning functionality coming soon.'
  }

  return (
    <div className="app">
      <header className="header">
        <div className="title">Ribbon Helper</div>
        <nav className="nav">
          <button className={sel === 'switch' ? 'active' : ''} onClick={() => setSel('switch')}>Game Compatibility</button>
          <button className={sel === 'berry' ? 'active' : ''} onClick={() => setSel('berry')}>Berry blending</button>
          <button className={sel === 'contest' ? 'active' : ''} onClick={() => setSel('contest')}>Contest Moves</button>
        </nav>
      </header>

      <main className="main">
        <section className="panel">
          {sel === 'switch' && <SwitchCompatibility />}
          {sel === 'berry' && <BerryBlending />}
          {sel === 'contest' && <p className="coming">{content[sel]}</p>}
        </section>
      </main>
    </div>
  )
}
