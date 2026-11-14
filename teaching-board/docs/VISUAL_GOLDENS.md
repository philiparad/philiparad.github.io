# Teaching Board: versioned pixel-reference workflow

The SVG visual suite performs **two independent checks** in Chromium, Firefox,
and WebKit:

1. The SVG exported from a lesson has exactly the same rendered RGBA pixels as
   the editor's render cache (for the same viewport).
2. That rendered image matches a separately committed, engine-specific
   **SHA-256 image fingerprint** in
   [`browser-tests/visual-goldens.json`](../browser-tests/visual-goldens.json).

The references represent raw 720 × 470, 8-bit RGBA pixel buffers, not SVG
markup hashes. Thus, changes to text shapes, placement, color, emoji, background
and equation images are detected even when both rendering paths change together.

The three fixtures cover mixed Hebrew/English + an equation, a rotated numbered
sticky note, and Unicode/emoji wrapping with background shapes. The golden
manifest stores three fixture hashes for each of three browser engines: nine
references. The workflow uses Playwright 1.56.1 on Ubuntu 24.04, a fresh browser
profile, device scale factor 1, and waits for `document.fonts.ready`.

## Normal verification

Run the normal workflow on any push or pull request touching Teaching Board.
The browser CI reads the committed references. It **must not regenerate or
accept new reference hashes automatically**.

To reproduce locally, serve the repository root at
`http://127.0.0.1:8765/`, install Playwright 1.56.1 and its browsers, then run:

```sh
TEACHING_BOARD_BROWSER=chromium node teaching-board/browser-tests/visual-parity.browser.mjs
TEACHING_BOARD_BROWSER=firefox node teaching-board/browser-tests/visual-parity.browser.mjs
TEACHING_BOARD_BROWSER=webkit node teaching-board/browser-tests/visual-parity.browser.mjs
```

Pixel hashes can depend on OS fonts, browser binaries and graphics stack.
Use the pinned GitHub runner to adjudicate differences from local machines.

## Inspectable PNG review artifacts

Each browser CI job now uploads a separate downloadable ZIP artifact:
`teaching-board-visual-chromium`, `teaching-board-visual-firefox`, or
`teaching-board-visual-webkit`. They are retained for **14 days**.

Open the [Teaching Board Actions workflow](https://github.com/philiparad/philiparad.github.io/actions/workflows/teaching-board-tests.yml),
choose a run, and download the appropriate entry under **Artifacts**. Unzip
it and open `<browser>-gallery.html` in your browser. The offline gallery
shows three images for each fixture:

- **Editor render:** PNG rasterization of the actual cached board SVG.
- **SVG export:** PNG rasterization of the independent SVG-export path.
- **Pixel difference:** A pale-gray reference with mismatching pixels in
  magenta (normally no magenta).

Each ZIP also includes `<browser>-visual-artifacts.json` with fixture labels,
captured pixel SHA-256 values, committed expected values and match status.
All PNGs are validated for the expected 720 × 470 dimensions before upload.
A broken PNG or missing viewport fails the job rather than silently producing
an unusable review artifact.

**The permanent baseline is the checked-in SHA-256 manifest, not the
14-day image archive.** Historical PNG files are available only while their
corresponding CI artifacts are retained. To make long-term visual review
possible, archive approved CI artifacts outside the repository or separately
commit reviewed binary screenshots.

## Intentional visual changes

1. Review the actual UI and exported SVG for correctness, especially RTL,
   numbered lists, equations, Unicode wrapping and rotation. Do not treat a
   change in hash as automatically acceptable.
2. On the pinned runner, run the **explicit recording mode**:
   `TEACHING_BOARD_GOLDEN_RECORD=1`. The script prints `GOLDEN` lines with
   browser engine, fixture name and rendered SHA-256.
3. Compare the new output to the old result. Update only the affected entries
   in `visual-goldens.json`, include an explanation and relevant screenshots
   with the pull request, and request a visual review.
4. Disable recording mode. Re-run the standard, enforcing CI workflow and
   confirm all three engines and the full Node suite pass.

Recording mode is an opt-in maintenance operation. It is **not enabled by CI**.

## Limitations

SHA-256 references do **not** store permanently versioned PNG snapshots in Git. Each CI run now publishes inspectable temporary PNG artifacts and an offline HTML gallery.
The suite does not compare two different OS/browser engines to each other.
It does not establish pixel-identical HTML contenteditable glyph rendering,
print/PDF raster equivalence, or correctness of every possible font, Unicode
sequence, equation and screen size. Separate A4 PDF raster tests cover page
geometry and object isolation; native operating-system IME QA remains manual.

## TXT-051: Hebrew and English SVG anchor correction (November 14, 2026)

The browser geometry regression exposed an actual SVG positioning defect:
right-to-left text tokens used an anchor that extended their glyphs beyond
right-aligned boxes; Hebrew words could overlap neighboring English tokens,
and rotated sticky-note content could exceed its shape. The renderer now
chooses an SVG text anchor from **both the visual line direction and each
token's own script direction**, including mixed RTL/LTR paragraphs.

The change intentionally alters all nine image fingerprints. The new
renderings were generated by the pinned three-engine workflow
[43572387008](https://github.com/philiparad/philiparad.github.io/actions/runs/43572387008).
The actual exported PNGs were inspected in Chromium, Firefox and WebKit,
including before/after comparison with the previous passing Chromium
captures. Hebrew no longer overlaps other tokens or extends past note
boundaries in these fixtures. Cached/editor versus exported SVG pixels
still match exactly, and browser tests measure HTML/SVG anchors and native
wrapped-glyph bounds independently.

All nine hashes were then explicitly updated in the committed reference
manifest. These are reviewed references for the intentional fix, not
automatically accepted baselines. Font differences on other OS/browser
stacks are still outside this pinned golden contract.
