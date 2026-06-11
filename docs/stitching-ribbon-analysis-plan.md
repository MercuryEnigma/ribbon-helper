# Stitching Ribbon Analysis Plan

## Implementation Status

Implemented on June 10, 2026:

- Client-side English OCR with locally served Tesseract worker, core, and
  language assets.
- Pokemon/Dex matching, level extraction, origin phrase parsing, and manual
  Pokemon/form/origin correction controls.
- Complete-section validation, seven-column ribbon-grid detection, reference
  icon matching, fixed Pokémon HOME order inference, and optional per-cell
  correction controls.
- BySpecies eligibility reuse with corrected Sword game IDs, inherited form
  data, and Footprint Ribbon level behavior.
- Memory Ribbon normalization and owned/still-obtainable/missed/special-extra
  classification.
- Automatic National Ribbon shadow inference and result recalculation.

Verification:

- 35 focused unit tests pass.
- Production build passes.
- Ribbondol browser fixture: Claydol, Gen 3, and all 40 cells automatically
  resolved, including the close Alert/Shock icons.
- Odyx browser fixture: Heracross, Gen 3, and all 45 normally obtainable cells
  automatically resolved, including Itemfinder, Partner, and Gourmand Marks.
- Full upload -> merge -> analyze browser workflow passes without requiring
  ribbon confirmation.

## Goal

Extend `/guides/stitching` so that, after merging English Pokemon HOME mobile
screenshots, it:

1. Identifies the Pokemon and its origin.
2. Detects the ribbons and marks visible in the merged summary.
3. Reuses the BySpecies eligibility calculation.
4. Reports owned, missed, still-obtainable, and special-extra ribbons.

All processing should remain client-side.

## Resolved Product Decisions

- Version 1 supports English Pokemon HOME screenshots only.
- Pokemon identity should be inferred from the top summary row using:
  - National Dex number.
  - Species name.
  - Displayed types.
- The UI will include a form selector beside the level input. It defaults to
  `Auto` and lets the user correct an ambiguous or incorrect form.
- Level is entered by the user.
- Origin is inferred from the English Trainer Notes text. The user can correct
  it when OCR is uncertain.
- Shadow status is automatic when the National Ribbon is detected.
- Results must distinguish:
  - Ribbons that were missed and can no longer be obtained.
  - Remaining ribbons that are still obtainable after transfer to HOME.
- Detected event ribbons, marks, and other ribbons outside the normal
  obtainable set must be shown as special extras.
- Jumbo and Mini Marks are always shown as special extras and are not included
  in Remaining.
- Memory Ribbons use the existing BySpecies calculation:
  - Use the `Transfer` group returned by `getAvailableRibbons()`.
  - Ignore the underlying merged Gen 3 and Gen 4 contest/battle ribbons because
    Pokemon HOME does not display them individually.
  - Compare the visible Memory Ribbon against the expected `Transfer` result.
  - A gold Memory Ribbon satisfies a standard Memory Ribbon expectation.
  - A standard Memory Ribbon does not satisfy a gold expectation.
  - An expected but absent Memory Ribbon is missed because it cannot be earned
    after transfer.

## Current Code to Reuse

- Stitching workflow:
  - `src/home-merger/HomeMerger.tsx`
  - `src/home-merger/ocrMerge.ts`
  - `src/home-merger/overlapMatcher.ts`
  - `src/home-merger/imageUtils.ts`
- Eligibility calculation:
  - `src/switch-compatibility/ribbonUtils.ts`
  - `getAvailableRibbons(pokemonKey, level, generation, isShadow, pokemonDb)`
- Pokemon and ribbon data:
  - `src/data/pokemon.json`
  - `src/data/ribbons.json`
  - `public/images/ribbons/*.png`
- Existing image fixtures:
  - `home-images/ribbondol/*.PNG`
  - `home-images/ribbondol-home.PNG`
  - `home-images/odyx/*.PNG`
  - `home-images/odyx-home.PNG`

## Proposed Architecture

Add a separate analysis pipeline under `src/home-merger/` rather than putting
recognition logic in the React component.

Suggested modules:

- `homeAnalysis.ts`
  - Coordinates all analysis stages and returns a typed result.
- `homeOcr.ts`
  - Loads and runs browser OCR.
  - Extracts identity and Trainer Notes text from targeted crops.
- `pokemonIdentity.ts`
  - Matches OCR output to a Pokemon/form using Dex number, name, and types.
- `originParser.ts`
  - Maps normalized English Trainer Notes phrases to BySpecies generation IDs.
- `ribbonGrid.ts`
  - Finds the Ribbons heading, grid bounds, rows, columns, and occupied cells.
- `ribbonMatcher.ts`
  - Compares grid cells against ribbon reference images and returns ranked
    matches with confidence.
- `ribbonAnalysis.ts`
  - Normalizes eligibility and classifies detected and missing ribbons.
- `homeAnalysisTypes.ts`
  - Shared result, confidence, correction, and progress types.

The exact filenames may change to match implementation needs, but recognition,
eligibility, and UI state should remain separate.

## Analysis Pipeline

### 1. Validate the merged summary

- Confirm that the merged canvas contains:
  - The top identity row.
  - Trainer Notes.
  - The Ribbons heading.
  - The bottom of the ribbon grid or the following `Date deposited` heading.
- If the ribbon section is incomplete, stop ribbon comparison and explain that
  another screenshot is required. Never interpret an incomplete grid as
  missing ribbons.

### 2. Read Pokemon identity

- Crop the top summary row.
- OCR the National Dex number, species name, and type labels.
- Match candidates in this order:
  1. Exact Dex number and normalized species name.
  2. Dex number plus types.
  3. Fuzzy species-name match plus types.
- Build or generate a compact Pokemon identity index that includes current
  types for supported forms.
- Default the form control to `Auto`.
- If several forms remain valid, select the highest-confidence candidate but
  visibly request confirmation.
- Any user form correction triggers eligibility recalculation without rerunning
  image recognition.

### 3. Read origin

- OCR only the Trainer Notes region.
- Normalize case, punctuation, whitespace, and common OCR substitutions.
- Map known English phrases to the generation IDs accepted by BySpecies.
- Confirmed examples:
  - `a distant land` -> `Gen 3`
  - `the Kanto region in the good old days` -> `VC`
- Before implementation is complete, build and verify a fixture-backed mapping
  for Gen 4, Gen 5, Gen 6, Gen 7, GO, Switch, and PLZA text.
- Unknown or low-confidence text defaults to an explicit correction control,
  not a silent generation guess.

### 4. Detect ribbon grid cells

- Locate the `Ribbons` heading using OCR or HOME section-header color/layout.
- HOME uses a regular seven-column ribbon grid in the current fixtures.
- Detect row centers and occupied cells from foreground pixels rather than
  assuming a fixed image height.
- Crop each occupied cell with enough padding for large ribbon/mark artwork.
- Retain the source crop and cell coordinates for correction UI and tests.

### 5. Match ribbon icons

- Preload `public/images/ribbons/*.png` as reference material.
- Normalize each reference and cell:
  - Composite transparency on the HOME background color.
  - Resize through a small scale range.
  - Allow a few pixels of translation.
  - Compare color and silhouette features.
- Return ranked visual matches for every cell.
- Resolve the complete grid against the fixed Pokémon HOME display order.
- Use Odyx's 45-cell set as the canonical normally obtainable sequence.
- Infer visually similar ribbons, such as Alert and Shock, from their
  neighboring cells and sequence positions.
- Allow event ribbons, size marks, and other special extras outside the normal
  sequence when their direct icon match is strong.

### 6. Calculate eligibility

- Call `getAvailableRibbons()` with:
  - Confirmed Pokemon/form key.
  - User-entered level.
  - Confirmed origin generation.
  - `isShadow = detectedRibbons.has('national-ribbon')`.
  - The existing Pokemon database.
- Refactor `ribbonUtils.ts` only as needed to expose reusable normalized
  eligibility data. Keep the BySpecies output behavior stable.
- Fix and cover any currently failing eligibility rules before treating this
  result as authoritative, especially level-dependent Footprint Ribbon logic.

### 7. Normalize expected ribbons

- Flatten eligible ribbons across game groups into one expected set, retaining
  the game groups where each ribbon can be earned.
- Remove every ribbon with `merge: "battle"` or `merge: "contest"` from direct
  comparison.
- Use only the Memory Ribbon entries generated in the `Transfer` group for
  those legacy families.
- Apply Memory Ribbon satisfaction rules:
  - `battle-memory-ribbon-gold` satisfies `battle-memory-ribbon`.
  - `contest-memory-ribbon-gold` satisfies `contest-memory-ribbon`.
  - Standard does not satisfy gold.

### 8. Classify results

#### Owned

Detected ribbons that are in the normalized expected set.

#### Remaining

Expected but absent ribbons that can be earned in at least one compatible
HOME-era destination game for the selected Pokemon/form.

- Preserve the eligible game group(s) in the result.
- If a ribbon was available historically and is also available now, classify it
  as still obtainable.

#### Missed

Expected but absent ribbons with no compatible HOME-era acquisition path.

- Expected but absent Memory Ribbons are missed.
- Legacy merged component ribbons never appear here individually.

#### Special extras

Detected ribbons or marks outside the normalized expected set, including:

- Event and distribution ribbons.
- Marks such as Titan Mark.
- Jumbo and Mini size marks.
- Other ribbons with no standard obtainable path in `ribbons.json`.

## UI Plan

After a successful merge:

1. Keep the merged preview and download button.
2. Show an `Analyzing summary...` progress state.
3. Display a detected identity panel with:
   - Pokemon name.
   - Dex number and types.
   - `Level` input.
   - `Form` selector beside Level, defaulting to `Auto`.
   - Origin selector.
   - Shadow indicator derived from National Ribbon.
   - Confidence/warning text when applicable.
4. Display ribbon results in sections:
   - Owned.
   - Remaining, grouped by game.
   - Missed.
   - Special extras.
5. Show ribbon names, images, and existing descriptions/tooltips.
6. Provide an optional `Edit detected ribbons` control for unusual screenshots.
7. Recalculate immediately when level, form, origin, or ribbon corrections
   change.

## OCR Dependency

The browser implementation needs OCR for identity and Trainer Notes. The
previous stitching attempt removed `tesseract.js`, but this feature should
re-evaluate it with tightly cropped regions:

- Load OCR lazily only after merge.
- OCR small identity and Trainer Notes crops rather than the full image.
- Cache the English worker for both crops.
- Keep OCR isolated behind `homeOcr.ts` so another engine can replace it.
- Measure bundle/download and mobile runtime before finalizing the dependency.

## Test Plan

### Unit tests

- Origin phrase normalization and mapping.
- Pokemon candidate matching from Dex/name/types.
- Form ambiguity and manual override behavior.
- Ribbon-grid row/column detection.
- Ribbon template ranking and confidence thresholds.
- Eligibility flattening and classification.
- Memory Ribbon normalization and gold/standard satisfaction.
- Event ribbon and mark classification as extras.
- Incomplete ribbon-section rejection.

### Fixture tests

- Ribbondol:
  - Detect Claydol.
  - Detect Ground/Psychic.
  - Detect `a distant land` as Gen 3.
  - Detect its visible ribbon set.
- Odyx:
  - Detect Heracross.
  - Detect its origin and visible ribbon set.
- Add focused crops for:
  - National Ribbon/Shadow inference.
  - Standard and gold Memory Ribbons.
  - Event ribbons.
  - Titan Mark.
  - Similar-looking contest and daily ribbons.
  - Ambiguous forms.

### Integration tests

- Merge screenshots, analyze, edit Level/Form/Origin, and verify recalculation.
- Confirm fixed-order inference resolves visually similar normal ribbons.
- Confirm incomplete uploads cannot produce a missing-ribbon report.
- Confirm no image data leaves the browser.

## Implementation Phases

### Phase 1: Eligibility and classification foundation

- Extract reusable eligibility normalization.
- Implement Memory Ribbon rules.
- Implement owned/still-obtainable/missed/extras classification.
- Add unit tests before image recognition.

### Phase 2: Ribbon-grid and icon recognition

- Detect the ribbon section and cells.
- Build reference loading and template matching.
- Validate against Ribbondol and Odyx.
- Add correction data structures and fixed-order sequence inference.

### Phase 3: OCR identity and origin

- Add lazy English OCR.
- Implement identity matching and origin parsing.
- Build the origin phrase fixture set.
- Add `Auto` form and origin correction controls.

### Phase 4: Results UI

- Add analysis progress and error states.
- Add identity controls and categorized ribbon sections.
- Add optional detected-ribbon editing.
- Preserve merged-image preview and download behavior.

### Phase 5: Hardening

- Test on multiple phone resolutions and display scales.
- Test empty, partial, and very large ribbon grids.
- Measure mobile memory, OCR load time, and recognition latency.
- Tune thresholds using fixtures without adding device-specific constants where
  normalized coordinates or detected layout can be used.

## Definition of Done

- English Pokemon HOME screenshots can be merged and analyzed entirely in the
  browser.
- Species/form, origin, ribbons, and marks are detected with visible confidence
  and correction controls.
- Level and `Form: Auto` appear together.
- Shadow status follows National Ribbon detection.
- Results correctly separate owned, still-obtainable, missed, and special
  extras.
- Legacy Gen 3/4 merged ribbons are ignored individually and represented only
  by the BySpecies-generated Memory Ribbon expectation.
- Incomplete screenshots never produce authoritative false missing-ribbon
  claims.
- Ribbondol and Odyx fixtures pass automated recognition tests.
