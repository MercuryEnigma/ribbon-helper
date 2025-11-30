# Ribbon Helper

Ribbon Helper is a React app for Pokémon ribbon hunters. It includes Switch game compatibility lookups and berry-blending calculators for contest prep, with GitHub Pages hosting.

## Features

- **Game Compatibility**: Filter by Switch titles or search by species to see where a Pokémon is available. Handles regional/special forms, shows icons, and keeps accessibility in mind. Also includes filtering for Shadow pokemon from Colosseum and XD: Gale of Darkeness. 
- **Berry Blending Calculators**: Optimal kits for Pokéblocks (RSE), Poffins (DPPt), ORAS, and Poffins (BDSP) with toggles for player count, special berries, event/GameCube sources, Battle Frontier, and nature targeting.
- **Contest Moves**: Planner coming soon.

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

- [Ribbons.Guide](https://github.com/SlyAceZeta/Ribbons.Guide) by [@SlyAceZeta](https://github.com/SlyAceZeta) for Switch availability data
- [PkmnShuffleMap](https://github.com/nileplumb/PkmnShuffleMap/) by [@nileplumb](https://github.com/nileplumb) for Pokémon icons
- Additional reference: [Bulbapedia](https://bulbapedia.bulbagarden.net/), [PokéSprite](https://github.com/msikma/pokesprite), [PokéAPI](https://pokeapi.co/)

Pokémon and related media are © Nintendo/Creatures Inc./GAME FREAK inc. This is a free, non-commercial fan project not affiliated with Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.
