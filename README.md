# Ribbon Helper

Ribbon Helper is a comprehensive React app for Pokémon ribbon hunters. It provides game compatibility lookups, berry-blending calculators, contest move optimizers, and visual decoration tools for contest preparation across multiple Pokémon generations (RSE, DPPt, ORAS, BDSP). Hosted on GitHub Pages for easy access.

## Features

- **Game Compatibility**: Filter by Switch titles or search by species to see where a Pokémon is available. Handles regional/special forms, shows icons, and keeps accessibility in mind. Also includes filtering for Shadow Pokémon from Colosseum and XD: Gale of Darkness.
- **Berry Blending Calculators**: Optimal berry kits for Pokéblocks (RSE), Poffins (DPPt), Pokéblocks (ORAS), and Poffins (BDSP) with toggles for player count, special berries, event/GameCube sources, Battle Frontier, and nature targeting.
- **Contest Moves**: Optimal move calculators for contest competitions across RSE, DPPt, ORAS, and BDSP. Features include:
  - Pokémon-specific move filtering by learn method (Level-up, TM/HM, Tutor, Egg, Purify, Pre-evolution)
  - Contest type filtering (Cool, Beauty, Cute, Smart, Tough)
  - Move details with appeal values, effects, and descriptions
  - Individual move toggle for custom strategies
- **Visual Decoration**: Contest visual guides and decoration tools for DPPt accessories and other contest preparation.

## Getting Started

Install dependencies:
```bash
npm install
```

Run the dev server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Build for production:
```bash
npm run build
```

## Deployment (GitHub Pages)

- Hosted at `https://MercuryEnigma.github.io/ribbon-helper/` (Vite `base` + `homepage` configured).
- Manual: `npm run deploy` builds and publishes `dist` to the `gh-pages` branch.
- Auto: `.github/workflows/deploy.yml` builds on pushes to `main` and deploys with `gh-pages`. Ensure Pages is set to the `gh-pages` branch in repo settings.

## Tech Stack

- React 18 (TypeScript via Vite)
- Vite for dev/build
- Vitest + React Testing Library

## Data Sources & Credits

- **Game Compatibility Data**: [Ribbons.Guide](https://github.com/SlyAceZeta/Ribbons.Guide) by [@SlyAceZeta](https://github.com/SlyAceZeta) for Switch availability data
- **Berry Blending Data**: [SadisticMystic's Berry Blending Spreadsheets](https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/) for RSE/ORAS optimal berry calculations and [DPPt/BDSP Poffin Calculator](https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/) by SadisticMystic
- **Contest Moves Data**: Contest move effects, appeal values, and optimal move calculations derived from game data and community research
- **Pokémon Icons**: [PkmnShuffleMap](https://github.com/nileplumb/PkmnShuffleMap/) by [@nileplumb](https://github.com/nileplumb)
- **Additional References**: [Bulbapedia](https://bulbapedia.bulbagarden.net/), [PokéSprite](https://github.com/msikma/pokesprite), [PokéAPI](https://pokeapi.co/)

Pokémon and related media are © Nintendo/Creatures Inc./GAME FREAK inc. This is a free, non-commercial fan project not affiliated with Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.

### License

Pokémon and all images © Nintendo/Creatures Inc./Game Freak. This free fan project is not affiliated with Nintendo, Creatures Inc., Game Freak, or The Pokémon Company.

All original content and code is governed by the [GPL-3.0 license](https://opensource.org/license/gpl-3-0/).
