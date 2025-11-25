import React, { useState } from 'react'

export default function App() {
  const [sel, setSel] = useState('switch')

  const content = {
    switch: 'Switch Compatibility functionality coming soon.',
    berry: 'Berry blending functionality coming soon.',
    contest: 'Contest move planning functionality coming soon.'
  }

  return (
    <div className="app">
      <header className="header">
        <div className="title">Ribbon Helper</div>
        <nav className="nav">
          <button className={sel === 'switch' ? 'active' : ''} onClick={() => setSel('switch')}>Switch Compatibility</button>
          <button className={sel === 'berry' ? 'active' : ''} onClick={() => setSel('berry')}>Berry blending</button>
          <button className={sel === 'contest' ? 'active' : ''} onClick={() => setSel('contest')}>Contest move planning</button>
        </nav>
      </header>

      <main className="main">
        <section className="panel">
          <p className="coming">{content[sel]}</p>
        </section>
      </main>
    </div>
  )
}
