# Release validation

- All JavaScript modules passed syntax checks.
- 18 core tests passed: schema checks, Hebrew backup round trip, unsafe input rejection, embedded media round trip, undo/redo, viewport transforms, anchored zoom, queued saves/retries, graph parsing and rotated bounds.
- Browser test runner also exercises IndexedDB reopen, stale-write rejection and asset storage in an isolated database.
- Interactive release verification is recorded after testing the deployed site. The local preview host was inaccessible to the cloud browser in this session.

## Current automated regression coverage (November 14, 2026)

The original 18-test release-validation notes above are historical. The current
[Teaching Board CI workflow](https://github.com/philiparad/philiparad.github.io/actions/workflows/teaching-board-tests.yml)
runs the Node 22 syntax checks and **277 Node tests**, plus real Chromium,
Firefox, and WebKit browser smoke tests covering rich-text editing,
selection/undo/redo, IME-related input, A4 continuation, IndexedDB reload,
and JSON/SVG export.

A separate browser visual-parity check compares the **board render-cache SVG**
with the **independent SVG export** pixel by pixel for three fixtures per
engine, including bidirectional text, an inline equation, rotated sticky
notes, long Unicode words, and emoji. It also confirms that a deliberate
missing-text regression is detected. The HTML editor has a distinct
layout-height and direction check.

Verified reference run: [GitHub Actions 43559719415](https://github.com/philiparad/philiparad.github.io/actions/runs/43559719415):
all four jobs passed; 263 Node tests passed; nine visual comparisons had
zero differing pixels.

**Golden-pixel regression:** The suite now also enforces nine separately committed
SHA-256 hashes of 720×470 RGBA pixel buffers—three fixtures per browser
engine—in `browser-tests/visual-goldens.json`. The references were captured
from [CI run 43564090574](https://github.com/philiparad/philiparad.github.io/actions/runs/43564090574),
then independently enforced by [CI run 43564213632](https://github.com/philiparad/philiparad.github.io/actions/runs/43564213632)
(all four jobs successful). These checks detect visual changes even if board and
SVG export paths change identically. The review/update workflow is described
in [VISUAL_GOLDENS.md](VISUAL_GOLDENS.md). This stores immutable hash references,
not complete PNG screenshots, and does not establish exact HTML/SVG/PDF glyph-level equivalence.
A separate **Chromium A4 PDF print regression** uses Teaching Board's own
`preparePrintPagesDocument` implementation, Chromium's PDF printer, and
Poppler's independent `pdfinfo` and `pdftoppm` tools. It checks exact page
count, A4 orientation/dimensions, text and graphics presence, no cross-page
bleed, and that printing only page two excludes page one's objects. The
two-page and selected-page tests passed in [GitHub Actions 43560506880](https://github.com/philiparad/philiparad.github.io/actions/runs/43560506880),
alongside all 263 Node tests and three-browser smoke and SVG parity checks.

**Inspectable visual review (current):** Each browser engine now exports three
cached/editor PNGs, three independent SVG-export PNGs, three difference maps,
an offline HTML contact gallery and a JSON hash report. GitHub Actions publishes
a separate `teaching-board-visual-<engine>` ZIP archive for each engine, with a
14-day retention period. The images are dimension-validated before upload;
these short-lived artifacts correspond to the permanently committed visual
hashes but are not themselves checked-in golden PNG files.

[CI run 43565067755](https://github.com/philiparad/philiparad.github.io/actions/runs/43565067755)
passed all four jobs (**269/269 Node tests**, all three real-browser checks and
visual hash comparisons) and published all three inspectable PNG archives.

Full native OS IME testing, permanent committed PNG golden snapshots, exact
PDF-to-SVG glyph-level pixel equality, and wider device coverage remain open.

## Text editor draft recovery verification (November 14, 2026)

Existing text boxes and sticky notes now save their **changed, validated**
rich-text drafts locally under a lesson- and object-scoped key. Reopening the
same object in the same browser profile explicitly offers **Recover saved
draft** or **Discard saved draft**. Invalid intermediate equation markup and
other parse failures retain the latest valid structured snapshot plus a
separately viewable raw-text fallback, without persisting any editor HTML.
A failed save keeps the editor open. Cancel or a successful save clears the
recovery entry; an entry older than 30 days is discarded and purged when read.
Storage access errors must not interrupt editing.

The unit suite covers document metadata validation, mismatched records, quota
and storage errors, expiry/purge, malformed equation recovery, and last-valid
history restoration. The three real-browser suites cover formatted recovery
after reload, malformed equation save repair, and raw invalid draft recovery
after reload without overwriting saved lesson content.

**Verified:** [GitHub Actions 43567045605](https://github.com/philiparad/philiparad.github.io/actions/runs/43567045605)
passed **274/274 Node tests** and the Chromium, Firefox, and WebKit browser
jobs (all four jobs green).

**Additional new-object recovery (November 14, 2026):** Uncommitted new
text boxes and sticky notes now keep their plain, validated rich-text content
and safe geometry/style metadata in lesson- and item-scoped local draft records.
After a reload, the editor toolbar explicitly offers **Recover unsaved text**,
showing a per-object preview and individual review/discard actions. A recovery
opens the editable text overlay; it does not insert an object automatically.
Recovery is schema-validated, excludes object IDs already in the board, and
retains each new draft until the asynchronous IndexedDB board save succeeds.
Explicit Cancel clears it, while editor disposal/navigation preserves it.

Unit tests verify collection discovery, collision exclusion, expiration and
purging without skipping entries, blocked storage and new-editor lifecycle.
The real-browser smoke test restores a brand-new formatted sticky note into an
actual lesson after navigating to it, commits and persists it once, then checks
that reload does not duplicate it. Chromium, Firefox and WebKit pass.

**Limits:** Text recovery does not provide cross-device synchronization,
server backups, or guaranteed persistence when local browser storage is
disabled. Native operating-system IME behavior still requires manual QA.
