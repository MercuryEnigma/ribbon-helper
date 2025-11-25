# Ribbon Helper

A React web app to help Pokémon players with ribbon collecting, berry blending, contests, and game compatibility across Nintendo Switch titles.

## Features

### Switch Compatibility ✅

The **Switch Compatibility** tool helps you plan which Pokémon are available across Nintendo Switch games:

- **Filter by Games**: Select one or more Switch games (Let's Go Pikachu/Eevee, Sword/Shield, Brilliant Diamond/Shining Pearl, Legends: Arceus, Scarlet/Violet) to see which Pokémon are available in ALL selected games
- **Search by Species**: Type a Pokémon name to instantly see which Switch games that Pokémon appears in
- **Form Support**: Properly displays regional forms (Alolan, Galarian, Hisuian, Paldean) and special forms
- **Visual Icons**: Displays Pokémon icons for easy identification
- **Accessibility**: WCAG AA compliant with high contrast ratios and keyboard navigation support

### Berry Blending (Coming Soon)

Tools for planning berry blending strategies.

### Contest Move Planning (Coming Soon)

Tools for planning Pokémon contest move combinations.

## Quick Commands

Install dependencies:
```bash
npm install
```

Run development server:
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

Deploy to GitHub Pages (uses `gh-pages`):
```bash
npm run deploy
```

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Vitest + React Testing Library for testing
- CSS for styling (WCAG AA compliant)

## Data Sources & Credits

This project builds upon and credits the following amazing community resources:

- **Pokémon Data**: Based on data from [Ribbons.Guide](https://github.com/SlyAceZeta/Ribbons.Guide) by [@SlyAceZeta](https://github.com/SlyAceZeta) - A comprehensive guide for Pokémon ribbon collecting
- **Pokémon Icons**: Icons from [PkmnShuffleMap](https://github.com/nileplumb/PkmnShuffleMap/tree/master) by [@nileplumb](https://github.com/nileplumb) - Pokémon Shuffle icon sprites

Special thanks to these projects for making their data available to the community!

## License

Pokémon and all related images, names, and characters are © Nintendo/Creatures Inc./GAME FREAK inc.

This is a free, non-commercial fan project and is not affiliated with or endorsed by Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.
