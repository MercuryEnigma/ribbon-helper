# FireRed / LeafGreen on Switch

The Switch releases use separate `fr-switch`, `lg-switch`, and `frlg-switch`
identifiers. The original `fr`, `lg`, and `frlg` identifiers still mean GBA.

The roster contains 215 species obtainable through the two Switch games,
including breeding, trade evolutions, and the unlocked ticket encounters.
Version exclusives are available in either game through local trading. Unown's
punctuation forms also have explicit availability, but remain collapsed in the
species list. Mew, Celebi, Jirachi, and Pokémon requiring imports from other GBA
games are excluded. A HOME reward is not an FRLG-native encounter.

FRLG uses the existing game availability and generation tables and is classified
as Generation 8. Its origin label is part of `GENERATION_ORDER`, before the
generic modern Switch origin. Species with `fr-switch` or `lg-switch` availability
receive that origin option because its Master Rank eligibility differs from other
Switch origins. One-way transfer behavior is informational, matching LGPE; there
is no transfer-direction metadata or special Shadow filtering.

As elsewhere on the site, the species page uses the selected species' game
availability. It does not infer past opportunities through evolution. The Ribbon
Checker also accepts a manually selected FRLG origin. An absent Champion Ribbon
is missed once in HOME. Existing Footprint level rules still apply.

FRLG Switch origins can only earn the Master Rank Ribbon in Sword / Shield,
not Scarlet / Violet. SwSh is marked as the last opportunity; species that cannot
enter SwSh have no Master Rank Ribbon in their route. Other origins keep their
existing eligibility. This also applies to the Ribbon Checker's remaining ribbons.
See the [reported FRLG Switch restriction](https://x.com/SirToastyToes/status/2114496011490173389)
provided on October 28, 2026.

HOME's Kanto and “a distant land” text is ambiguous. Users can manually choose
FRLG (Switch); OCR only selects it when distinguishing text is present. No new
origin-mark image recognition is implemented.

Sources checked on October 27, 2026:

- [Nintendo HOME transfer rules](https://en-americas-support.nintendo.com/app/answers/detail/p/856/a_id/48802): transfers out of FRLG are one-way.
- [Native non-Kanto encounters](https://www.reddit.com/r/pokemon/comments/1xbr8sw/all_nonkanto_pokemon_obtainable_in_frlg/): encounters, gifts, breeding, and evolution methods.
- [Ribbons.Guide Pokémon data](https://ribbons.guide/data/pokemon.json): cross-checked all 215 species and the two explicit Unown forms; the FRLG Switch roster matches.
- [Ribbons.Guide game IDs](https://ribbons.guide/data/games.json) and [origin IDs](https://ribbons.guide/data/origins.json): exports use `frlg-switch` and origin mark `gba`.

No new battle calculator, contest, or berry-blending modes are needed. Champions
uses the shared game selector but keeps FRLG unchecked by default; its regulation
membership does not change.

Links from the FRLG filter use the same `?p=species` URL and callback as the
other games. The origin dropdown works the same way as other generation choices.
