# Ribbons.guide JSON Export Plan

## Goal

Extend the Ribbon Checker so its detected Pokemon metadata can be reviewed and
exported as a standalone Ribbons.Guide file-version 5 backup.

Metadata remains visible and editable for every user. The JSON download control
is only rendered when the page URL contains `?json=true`.

## Extraction

- Keep the existing ribbon, shiny, and Poke Ball detectors.
- OCR nickname, language, Original Trainer, and ID No. from independent,
  fixed-layout crops instead of relying on Tesseract to place them on one line.
- Detect the gender badge independently from OCR.
- Prefer species/form data for male-only, female-only, and genderless Pokemon;
  only use the visual badge for species that can have either gender.
- Parse nature and broad origin from the existing Trainer Notes OCR.
- Do not extract encounter date/location or inspect the game-context badge.
- Preserve confidence values and candidate matches so every detected field can
  be corrected in the UI.

## UI And Export

- Keep nickname, gender, language, shiny type, Poke Ball, nature, OT, and ID No.
  editable for all Ribbon Checker users.
- Represent shiny state as Normal, Star Shiny, or Square Shiny. HOME detections
  default to Star Shiny because HOME does not expose the original sparkle type.
- Map HOME language tags to Ribbons.Guide IDs; map `SPA` to `es-es`.
- When a Strange Ball is detected, require the user to choose the original ball
  before exporting.
- With `?json=true`, provide a download named
  `RibbonBackup-{nickname-or-species}.json`.
- Generate a standalone backup containing one Pokemon and no boxes. Set current
  game to HOME and leave met level, date, and location empty.
- Derive Shadow from the National Ribbon and Scale from Mini, Jumbo, Titan, or
  Alpha marks.
- Populate origin marks/game families only when the Trainer Notes wording makes
  that value safe; otherwise leave the specific origin game unset.

## JSON Contract

- Add typed backup, Pokemon-record, and export-draft interfaces.
- Keep mapping, validation, and serialization independent of React.
- Validate species support, ball, level, gender, language, Trainer ID, nature,
  and ribbon IDs before enabling download.
- Use Ribbons.Guide's current file-version 5 settings and string-valued toggle
  fields.

## Verification

- Use captured OCR output and the checked-in Ribbondol/Odyx screenshots as
  regressions.
- Ribbondol must resolve Ribbondol, genderless, ENG, Premier Ball, Bashful,
  Gale, and `07071`.
- Odyx must resolve Odyx, female, shiny, ENG, Premier Ball, Jolly, Cole, and
  `41641`.
- Cover fixed/genderless fallbacks, language mapping, leading-zero IDs, Strange
  Balls, ambiguous origins, species/form mappings, v5 serialization, and the
  `json=true` gate.
- Run the complete Vitest suite, production build, and browser fixture checks.
