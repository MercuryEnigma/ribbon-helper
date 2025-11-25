# Switch Compatibility Module

This module provides functionality to help players find which Pokémon are available across Nintendo Switch games.

## Components

### SwitchCompatibility
Main component that provides two modes:
- **Filter by Games**: Select games to see which Pokémon are available in all of them
- **Lookup by Species**: Search for a Pokémon to see which Switch games it's available in

### AvailablePokemon
Displays a list of Pokémon available in all selected Switch games.

**Features:**
- Multi-select checkboxes for game selection
- Real-time filtering
- Sorted results by National Dex number
- Handles different forms separately (e.g., Alolan variants, Cap Pikachus)

### BySpecies
Search and lookup which Switch games a specific Pokémon is available in.

**Features:**
- Type-ahead search with dropdown
- Supports partial name matching
- Case-insensitive search
- Groups results by game pairs (e.g., Sword/Shield shown as one entry)

### ErrorBoundary
React error boundary component that catches and displays errors gracefully.

**Features:**
- Prevents entire app crashes
- Shows user-friendly error messages
- Includes error details in expandable section
- Provides "Try again" button to recover

## Utilities

### utils.ts
Core utility functions for filtering and searching Pokémon data.

**Functions:**
- `getPokemonDisplayName()` - Get display name handling forms
- `filterPokemonByGames()` - Filter Pokémon by game availability
- `getGamesForPokemon()` - Get Switch games for a Pokémon
- `getGameGroupNames()` - Convert game IDs to display names
- `searchPokemonByName()` - Search Pokémon by name

All functions include:
- Input validation
- Error handling
- Safe fallbacks
- Console warnings for debugging

## Types

### types.ts
TypeScript type definitions for the Pokémon database structure.

## Testing

### Running Tests
```bash
npm test              # Run tests in watch mode
npm test -- --run     # Run tests once
npm test:coverage     # Run with coverage report
```

### Test Files
- `utils.test.ts` - Unit tests for utility functions (27 tests)
- `AvailablePokemon.test.tsx` - Component tests (9 tests)
- `BySpecies.test.tsx` - Component tests (11 tests)

**Total: 47 tests, all passing**

## Error Handling

The module is designed to be error-safe:

1. **Input Validation**: All functions validate inputs before processing
2. **Try-Catch Blocks**: Critical operations wrapped in error handlers
3. **Error Boundaries**: React errors caught at component level
4. **Graceful Degradation**: Returns empty arrays/safe defaults on errors
5. **Console Logging**: Warnings and errors logged for debugging

## Supported Games

- Let's Go Pikachu / Eevee (lgp, lge)
- Sword / Shield (sw, sh)
- Brilliant Diamond / Shining Pearl (bd, sp)
- Legends: Arceus (la)
- Scarlet / Violet (scar, vio)

## Data Structure

The module expects Pokémon data in the following format:

```typescript
{
  "pokemon-id": {
    "names": { "en": "English Name", ... },
    "forms": { "en": "Form Name", ... }, // Optional
    "data-source": "base-pokemon-id",     // For forms only
    "gender": "both" | "male" | "female",
    "natdex": 123,
    "games": ["sw", "sh", "bd", ...],
    "sort": 1                             // For forms only
  }
}
```

## Performance Considerations

- `useMemo` hooks prevent unnecessary recalculations
- Search results limited to 50 entries
- Single JSON load, passed as props
- No API calls or external dependencies
- Efficient array operations

## Browser Compatibility

Built with React 18 and modern JavaScript. Supports all modern browsers with ES6+ support.
