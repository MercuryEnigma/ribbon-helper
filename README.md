# Ribbon Helper

Ribbon Helper is a comprehensive React app for Pokémon ribbon hunters. It provides game compatibility lookups, berry-blending calculators, contest move optimizers, and visual decoration tools for contest preparation across multiple Pokémon generations (RSE, DPPt, ORAS, BDSP). Hosted on GitHub Pages for easy access.

## Features

- **Game Compatibility**: Quick way to learn where a Pokémon is playable on Switch, with form-aware icons and accessibility-friendly lists.
  - *Availability by game*: Filter by switch games to see which pokemon are in all games.
  - *Shadow Pokémon by game*: Filter by switch games to see which Shadow pokemon from Colosseum/XD are transferrable.
  - *Lookup by species*: Look up a Pokémon species and get its Switch availability, obtainable ribbons, and forms.

- **Berry Blending**: Pokéblock/Poffin builders that output the best kit for contests.
  - *RSE*: Pokéblock calculator for Ruby/Sapphire/Emerald to optimize the lowest contest score.
  - *DPPt*: Poffin calculator for Diamond/Pearl/Platinum to optimize the lowest contest score.
  - *ORAS*: Details on how Pokéblock blending works in ORAS.
  - *BDSP*: Poffin calculator for Brilliant Diamond / Shining Pearl to optimize poffin making.

- **Contest Moves**: Find the best contest moves for any Pokémon across each generation.
  - *Optimizers*: RSE, DPPt (Super Contest), ORAS (Spectacular), and BDSP (Super Contest Show) calculators that rank the top moves for the chosen contest type.
  - *Filters*: Toggle learn methods (Level-up, TM/HM, Tutor, Egg, Purify, Pre-evo) or exclude specific moves; rankings update instantly.
  - *Move details*: Appeal/hype, effects, conditionals, and the exact learn sources for every suggested move.

- **Contest Visuals**: Visual prep references for the prop portion of Super Contests.
  - *DPPt accessories*: Page-ordered list for each Super Contest theme.
  - *BDSP ball stickers*: Score-ordered grouping for ball stickers for each Super Contest Show type.

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

- **Game Compatibility Data**: [Ribbons.Guide](https://ribbons.guide) for Switch availability data
- **Berry Blending Data**: [SadisticMystic's Berry Blending Spreadsheets](https://docs.google.com/spreadsheets/d/1A61T_0yHWtXVooQLjw6ocmI8Dx7tdGkp9P-X-dL2yOs/) for RSE/ORAS optimal berry calculations and [DPPt/BDSP Poffin Calculator](https://docs.google.com/spreadsheets/d/1U2gGGy9nyGIKQcq9SVtIxKGJDNYAfhicEWr5ykQKM7k/) by SadisticMystic
- **Contest Moves Data**: Contest move effects, appeal values, and optimal move calculations derived from game data and community research
- **Pokémon Icons**: [PkmnShuffleMap](https://github.com/nileplumb/PkmnShuffleMap/) by [@nileplumb](https://github.com/nileplumb)
- **Additional References**: [Bulbapedia](https://bulbapedia.bulbagarden.net/), [PokéSprite](https://github.com/msikma/pokesprite), [PokéAPI](https://pokeapi.co/)

Pokémon and related media are © Nintendo/Creatures Inc./GAME FREAK inc. This is a free, non-commercial fan project not affiliated with Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.

### License

Pokémon and all images © Nintendo/Creatures Inc./Game Freak. This free fan project is not affiliated with Nintendo, Creatures Inc., Game Freak, or The Pokémon Company.

All original content and code is governed by the [GPL-3.0 license](https://opensource.org/license/gpl-3-0/).
