# Release validation

- All JavaScript modules passed syntax checks.
- 18 core tests passed: schema checks, Hebrew backup round trip, unsafe input rejection, embedded media round trip, undo/redo, viewport transforms, anchored zoom, queued saves/retries, graph parsing and rotated bounds.
- Browser test runner also exercises IndexedDB reopen, stale-write rejection and asset storage in an isolated database.
- Interactive release verification is recorded after testing the deployed site. The local preview host was inaccessible to the cloud browser in this session.

## Current automated regression coverage (November 14, 2026)

The original 18-test release-validation notes above are historical. The current
[Teaching Board CI workflow](https://github.com/philiparad/philiparad.github.io/actions/workflows/teaching-board-tests.yml)
runs the Node 22 syntax checks and **263 Node tests**, plus real Chromium,
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

Full native OS IME testing, independent inspectable PNG image snapshots, exact
PDF-to-SVG glyph-level pixel equality, and wider device coverage remain open.
