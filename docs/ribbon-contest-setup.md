# Ribbon Contest setup

This page runs entirely on GitHub Pages. It reads a public Google Sheet CSV,
processes screenshots in the browser, and embeds a prefilled Google Form. Google
Forms writes entries to its linked Submissions tab. No Apps Script, API key,
Google sign-in integration, or backend deployment is needed.

## Publish just the contest information

Keep the spreadsheet's general sharing **Restricted**. In **File → Share → Publish
to web**, select **Contest info**, choose **CSV**, and publish that individual tab.
Do not publish the Submissions tab: it contains participant information.
Google documents individual-tab publishing in its
[publishing guide](https://support.google.com/docs/answer/183965?hl=en).

The supplied published CSV link is already configured in
`src/ribbon-contest/config.ts`. Updating contest rows does not require rebuilding
the website. It reloads the feed every minute; Google may cache published changes
for several minutes. Leave automatic republishing enabled in Sheets.

To replace the feed, change that configuration or set
`VITE_RIBBON_CONTEST_SHEET_URL` in `.env` for local development. For GitHub Pages
builds, the optional Actions variable is `RIBBON_CONTEST_SHEET_URL`.
The loader also supports a publicly readable shared Sheet link, but publishing
only the Contest info tab keeps the rest of the workbook private.

## Contest info columns

Your published tab's shorter layout is supported directly. Use one row per round
with this tab-separated header in A1:

```text
contest number	title	puzzle text	opening time	closing time	reveal time	hint 1 text	hint 1 time	hint 2 text	hint 2 time	hint 3 text	hint 3 time	answer Pokémon	answer Ribbons
```

- **contest number** is the display order and stable round ID. Keep it unique.
  The original 15-column layout also works: **number**, an optional **round ID**,
  **verdict-release time**, and **required ribbon IDs** are accepted aliases.
- Number, title, puzzle text, opening/closing times, answer Pokémon, and answer
  ribbons are required. Keep past rows to display previous puzzles and solutions.
- Readable Pokémon and ribbon names work, for example `Milotic` and
  `Skillful Battler Ribbon, Expert Battler Ribbon, Training Ribbon`.
  [The ID reference](ribbon-contest-ids.md) also provides precise keys, for example
  `pikachu` and `effort-ribbon, best-friends-ribbon`. Use IDs for ambiguous names
  such as Cool Ribbon, which has different versions across generations.
  Shortened names such as `Effort` also work when omitting “Ribbon” or “Mark”
  still identifies exactly one entry.
  Extra ribbons are allowed. A base species accepts its forms; a form-specific
  answer requires that exact form.
- Set the Sheet timezone to **Los Angeles**. Format schedule cells as
  `yyyy-mm-dd hh:mm:ss`. The reader also supports US `M/D/YYYY H:mm:ss` dates
  and ISO timestamps with explicit timezone offsets.
- All dates without an explicit offset are interpreted in
  `America/Los_Angeles`, independent of the participant's timezone. During the
  repeated autumn hour, use an ISO offset if you need the second occurrence.
- Blank hint text omits that hint. A hint with no release time, or with a time
  before opening, appears when the round opens.
- **reveal time** (or **verdict-release time**) remains accepted for compatibility
  with existing Sheets. Answer checking now happens immediately after review,
  regardless of that field. The full solution appears after closing. Opening is
  inclusive and closing is exclusive.

**The entire published tab is public, including answers and future hints.**
Scheduling controls the page display, not access to the source data. Round windows
use the participant's browser clock and answer checks run locally; this is not
tamper-proof contest judging. Organizers use actual Google Form responses and timestamps to
determine eligible entries and first completions.

## Keep the existing Form and response link

The supplied Form is already configured using its public responder URL and
the three existing entry IDs:

| Form question | Entry ID | Prefilled value |
| --- | --- | --- |
| DO NOT EDIT(Contest number) | `350136213` | Contest number, or explicit round ID |
| Species | `911552280` | Pokémon key |
| Ribbons | `2097695600` | Comma-separated ribbon IDs |

Participants fill **Discord handler** themselves, then click **Submit** in the
embedded Form. You can rename the labels without changing these entry IDs; naming
the contest-number question **Round ID** makes its purpose clearer. No submission
reference question is required. A different Form needs its responder URL and
entry IDs configured in `src/ribbon-contest/config.ts`; obtain these from a
**Get pre-filled link** generated in the Form editor.

Keep the Form published and accessible to anyone with its responder link. Leave
email collection and the one-response limit off. Its existing Sheet link writes
native entries to **Submissions**; no extra columns or script triggers are needed.

The puzzle appears above a three-step flow: upload, review/check, and submit.
After image processing, participants review the selections and confirm them.
The page immediately reports whether the Pokémon and required ribbons match.
Only a correct answer unlocks the prefilled Form and its new-tab fallback link.
Changing the Pokémon or ribbons hides the Form and requires review again.
Google Forms provides the submission confirmation. The site cannot inspect or
confirm a cross-origin Form submission.

## Screenshots and answer checking

Screenshots stay in the participant's browser. Only the confirmed Pokémon/ribbon
values are prefilled; no screenshot evidence is stored or sent to Google Forms.
The shared `ScreenshotProcessor` and `ScreenshotUpload` component are used by both
Ribbon Checker and Ribbon Contest. Select 1–12 PNG/JPEG screenshots from one game;
the game is detected automatically. HOME summaries are stitched vertically, while
Switch ribbon panels are consolidated without repeating the fixed summary area.
Overlapping ribbons are deduplicated, and BDSP's partially visible rows are joined.

Species recognition uses OCR only. When a screen shows a nickname or unreadable
text, the Pokémon field stays empty so the participant can select it. No visual
species model or external sprite downloads are required. Review uncertain ribbons
before submitting. A single HOME image needs the complete summary/ribbon section;
otherwise upload its overlapping screenshots together.

The page does not save an answer-check history. A correct answer unlocks submission
for the current reviewed selections; it does not prove that a Form was submitted.
Participants should keep the prefilled Pokémon and ribbons unchanged inside the
Google Form. No screenshot or answer-check data is written to local storage.

## Verify before launch

1. Confirm the published CSV opens without signing in. Keep Submissions private.
2. Add a round and verify its puzzle, hints, dates, and after-close solution.
3. Test actual screenshots from Scarlet/Violet, Sword/Shield, BDSP, and HOME.
   Check recognition accuracy against real screenshots before launch.
4. Review an image and verify all three fields in the embedded and new-tab Forms.
   Submit a test entry and check Google Forms' confirmation and its native Sheet row.
5. Test an incorrect Pokémon and a missing required ribbon: both should show a
   mismatch and keep the Form hidden. Extra ribbons are allowed.
6. Confirm a correct answer: the Form should appear immediately. Editing a selection
   should hide it until the new answer has been reviewed and checked again.

```sh
npm run build
```

For focused verification using the actual files in `home-images`, start Vite and
run `node scripts/verify-screenshot-processing.mjs` with Playwright available.
The runner checks each Switch screenshot, consolidated groups, existing HOME
images, and both uploader flows. It saves consolidated PNGs and a report in the
system temporary directory and does not submit any Google Form responses.

Run `npm run generate:contest-ids` when the site's Pokémon/ribbon datasets change.
