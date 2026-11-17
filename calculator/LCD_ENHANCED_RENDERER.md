# Enhanced LCD renderer — architecture, controls, and verification

## Purpose

`js/lcd-enhanced.js` is a **separate high-resolution Canvas renderer** for structured mathematical expressions. It reuses the existing calculator state, `FreshStructured` expression tree, and `FreshLCD` framebuffer. It does not change calculation logic, button handlers, keyboard shortcuts, or serialization.

- Default view: [calculator-only enhanced LCD](https://philiparad.github.io/calculator/?key=calculator)
- Original LCD comparison: [authentic fallback](https://philiparad.github.io/calculator/?key=calculator&lcd=authentic)

The original display remains in `js/display.js` as a fallback and can be selected with `?lcd=authentic`. The same assets are included in the offline Windows Tauri build.

## Rendering flow

1. `FreshLCD.draw(canvas,state)` paints the established complete LCD background, including menu/result output and bitmap text.
2. When the editor contains a structured expression in MathIO, `FreshEnhancedLCD` measures its tree recursively and redraws the expression region using Canvas paths and high-resolution text. The native-scale 960×310 framebuffer remains the output canvas.
3. Geometric fractions, roots, exponent positions, repeating-decimal bars, logarithms, integrals, summations, and derivatives use measured dimensions rather than just upscaled 96×31 dots.
4. The original renderer retains responsibility for menus, error messages, matrix/vector/stat/table screens, non-structured input, and any unsupported display state.
5. The read-only enlarged LCD and capture functionality continue to read from the same `#lcd` canvas.

The architecture is hybrid by design: the expression renderer is new, but calculator UI and unsupported display states stay on the proven raster path. The HTML status indicator overlay is not replaced in this phase.

## Source integration

- `calculator/index.html` loads `js/lcd-enhanced.js` before `js/app.js`.
- `calculator/js/app.js` uses `FreshEnhancedLCD || FreshLCD` for painting.
- `calculator/desktop/package.json` runs the original and enhanced LCD regression tests before packaging Windows installers.

## Automated tests

From repository root:

```bash
node calculator/tests/test_lcd_symbols.cjs
node calculator/tests/test_lcd_enhanced.cjs
```

Expected results on this implementation: **322** existing LCD cases and **55** enhanced geometry/renderer cases. These check syntax/runtime integration, structured input insertion, finite box measurements, fallback modes, nested expressions, and Canvas drawing calls. They do not verify screenshots, text rasterization in every Windows/Chrome environment, or actual physical-device pixel parity.

## Essential visual acceptance tests (still required)

Capture and visually compare screenshots at exactly matched window sizes and DPR values for:

- Empty and filled square/cube/nth roots, including nested radicals and root index labels
- Empty/filled/mixed/nested fractions, numerator and denominator alignment
- Exponent, logarithm base, repeating decimal bar, `×10^n`
- Integrals, sums, derivatives, and limit placement
- Long expressions, horizontal and vertical scrolling, cursor/selection movement
- Answers on the second line and toggling MathIO/LineIO
- Menus for all eight modes; setup indicators, errors, result capture, enlarged display
- Windows WebView2 100/125/150/200% scaling; Chrome desktop browser

If any semantic error, clipping, or overlap is detected, use `lcd=authentic` until corrected. The enhanced renderer is intentionally an educational presentation mode, not a claim of exact hardware-LCD parity.

## Design follow-ups

- Harmonize the vector font's measured metrics with the controller's horizontal viewport model under long/nested input.
- Add image-golden comparisons from a real browser; automated array tests alone do not establish visual quality.
- Offer a user-facing display mode switch that preserves current editor state.
- Optionally render status annunciators in the same Canvas coordinate system.

## Result-line typography improvement — November 14, 2026

The original enhanced renderer only repainted the **input** expression. Answers such as `4√6` were still drawn with the legacy 7×11 glyph atlas, leaving visible bitmap jaggies. The enhanced renderer now additionally paints short MathIO results with measured Canvas text and vector radicals/lines.

- Supports short decimal and π answers, exact radical text including `4√6` and `√2+3√5`, stacked fractions, mixed fractions, and repeating-decimal overbars.
- Result coordinates remain right-aligned, and a separate clipped lower LCD region protects the input and annunciators.
- Long outputs, horizontally scrolled results, unsupported formats, and other calculator modes continue to use the legacy renderer.
- The calculation engine and result values are unchanged.
- `test_lcd_enhanced.cjs` includes result and fallback fixtures; **66** enhanced test cases pass, alongside **322** legacy LCD regression cases.

These are geometry and Canvas-operation checks, not browser image-diff tests. Verify actual text crispness and root shape on the website and in Windows WebView2 before claiming visual/device parity.

## Follow-up LCD work — 2026-11-15

1. **Nested input caret.** The enhanced renderer now walks the editor's nested path and offset, placing the insertion caret inside fraction numerator/denominator, radicals, limits and exponent fields. The previous enhanced renderer only drew a caret when the editor path was empty.
2. **Vertical expression placement.** When the measured expression fits within the LCD, its baseline is constrained by the available top/bottom margins. For content exceeding available height, the display retains the controller's vertical pan offset.
3. **Horizontal viewport safety.** When the old 96-unit controller viewport has a nonzero horizontal scroll offset, the renderer uses the legacy path instead of applying incompatible offsets to the new variable-width typography.
4. **Matching glyph metrics.** Canvas text was increased from 5.8 to 6.8 layout pixels because the 4.1-unit character advance corresponds more closely to that font size with Consolas/monospace.
5. **Regression.** The legacy suite passes 322 cases and the enhanced suite passes 69 cases, including newly added nested-caret, deep-radical and horizontal-scroll fixtures.

These are logic and Canvas-operation tests, not a complete visual screenshot comparison. Browser/Windows golden screenshots, actual device-pixel-ratio checks, and image-diff verification remain outstanding. The original renderer is still available with `&lcd=authentic`.

## Visual regression workflow — November 15, 2026

### Enlarged-screen rendering
The existing `app.js` now saves the active render mode on `#lcd.dataset.renderer`. When `lcd-large` displays the screen at a different size, **enhanced** mode uses high-quality Canvas resampling, while **authentic** mode deliberately keeps nearest-neighbor pixel scaling. This avoids imposing blurry interpolation on simulated LCD dots and avoids harsh block scaling on vector text.

### Playwright browser screenshot gallery
`calculator/tests/test_lcd_visual.cjs` loads the real LCD renderers inside Chromium and produces **28 PNGs** (seven representative cases × device pixel ratios 1, 1.25, 1.5, and 2), plus a JSON manifest. Scenarios include empty and filled square roots, a fraction, a nested root/fraction, a symbolic radical result (`4√6`), a fractional result, and a decimal result.

Run locally (from `calculator/desktop`):

```powershell
npm install
npx playwright install chromium
npm run test:lcd-visual
```

Output: `calculator/desktop/lcd-screenshots/`.

The GitHub Actions Windows workflow runs screenshot generation before installer packaging and uploads the gallery as the `calculator-lcd-visual-regression` artifact. In the workflow run summary, download this artifact and compare screen captures. The screenshot check verifies that enhanced display ink is present; **there is no approved pixel-perfect golden baseline yet**. Screenshot creation and manual visual review remain different steps. A clean CI run is required before claiming screenshots have been produced successfully in Windows.

This gallery tests Chromium, **not WebView2**. True Windows-app visual parity remains a separate acceptance test.

## LCD continuation — 2026-11-15: fractions and A/B visual verification

- **Fraction clipping corrected.** The enhanced fraction box now accounts for the full offset used to position numerator and denominator glyphs. The lower result strip uses a taller clip region for stacked fractions/mixed fractions so that the upper numerals remain visible.
- **Actual LCD CSS rendering modes.** The calculator canvas has `data-renderer` set by the controller. The authentic path uses `image-rendering:pixelated` to preserve dot structure; enhanced vector text retains normal browser resampling.
- **A/B screenshot captures.** The Chromium visual gallery now writes two files for each scenario and DPR: `*-enhanced-dpr-*.png` and `*-authentic-dpr-*.png`. Seven cases × four DPR levels × two renderers = **56 comparison images**.
- **Regression.** 322 legacy rendering tests and 74 enhanced rendering tests pass. New assertions cover numerator/denominator extents and result clipping boundaries.

Important: source-level tests and JavaScript syntax checks were performed. The **56 Chromium screenshots have not yet been executed and visually reviewed** in this working session. Run the Windows workflow and download `calculator-lcd-visual-regression` to inspect actual pixel output. Browser screenshots are not manufacturer LCD parity evidence.

## Continuation — measured text widths and stronger screenshot checks

### Renderer change
The enhanced result renderer now uses `CanvasRenderingContext2D.measureText()` where available for displayed answer width, fraction centering, recurring-decimal overbars, and radical text placement. A deterministic width approximation remains as a fallback for test/mock contexts without `measureText`. This reduces right-edge and symbol-spacing errors caused by differences between browser font metrics and assumed monospaced character widths. It does **not** yet replace the input expression's existing fixed-width layout model.

### Regression checks
- **322 legacy LCD cases:** passed.
- **75 enhanced renderer cases:** passed, including a test where the browser reports a deliberately different font width and the answer must still align correctly.
- **Chromium screenshot harness:** JavaScript syntax checked. Each enhanced/authentic pair is now compared at the pixel-data level. The manifest records the number and fraction of changed pixels, and errors if the two images are identical.
- **PNG validation:** Each screenshot's PNG signature and image dimensions are checked against the requested DPR (1, 1.25, 1.5, 2) without adding a native image-processing dependency.

The visual workflow is configured to produce 56 images across seven scenarios and four DPI scales. **Actual Chromium execution, manual screenshot inspection, approved golden images, and Windows WebView2 image parity remain unverified** until a successful workflow run has been reviewed.

## Input font measurement continuation — 2026-11-15

The enhanced **input expression layout** now accepts the active Canvas 2D context as an optional parameter to `measure()` and `measureNodes()`. The exact measured glyph advance is propagated recursively through nested fraction/root/exponent fields; subsequent text, vector geometry, and nested caret placement all consume the same measurements. Offline/headless calls without `measureText()` retain the existing deterministic 4.1-unit approximation. Result-line measurement was already implemented independently.

The enhanced tests now include intentionally unequal `W` and `i` glyph widths to verify the next glyph and caret move by actual measured advances. **322 legacy + 78 enhanced automated cases passed.** Windows packaging also syntax-checks the enhanced renderer explicitly.

The old controller still computes its viewport using the original fixed-width model. Thus nonzero horizontal scroll offsets still deliberately fall back to the authentic renderer, avoiding mismatched pan coordinates until that viewport is migrated. Chrome/WebView2 screenshots and font-availability comparisons remain required for visual acceptance.

## Horizontal scrolling compatibility — 2026-11-15

The enhanced display no longer switches to legacy rendering solely because `state.viewport.inputX` is nonzero. The calculator controller continues to own keyboard navigation and its original 96-unit scroll state; the new `scrollOffset(root, legacyX, ctx)` translates that state into measured Canvas positions for the enhanced expression. Translation aligns each top-level node boundary exactly and interpolates within a structured node. The vector renderer recreates overflow cues after clearing the legacy bitmap. If a malformed node prevents a finite mapping, drawing falls back to the original LCD.

The regression suite checks monotone mapping, unequal `W`/`i` character widths, nonzero scroll rendering, and actual glyph movement at successive scroll offsets. **322 legacy LCD cases and 84 enhanced LCD cases passed** through the available JavaScript runtime checks.

Caveat: this is a compatible mapping layer, not yet a complete rewrite of the controller's fixed-width viewport; complex nested-field caret-follow behavior at the far edge should receive visual end-to-end testing. Browser screenshot generation and Windows WebView2 visual acceptance remain outstanding.

## LCD edge-navigation continuation — 2026-11-15

### Automatic nested cursor following
The enhanced renderer now checks the measured insertion-caret coordinates after laying out an expression. When the caret lies beyond the visible left/right safe margins, it adjusts the enhanced scroll offset and redraws the input. This works for nested fraction/root fields, including long radicands, without changing the calculation engine or existing controller viewport representation.

### Preserve SHIFT + arrows manual pan
The controller sets `state.viewport.manualPan=true` for deliberate SHIFT-arrow viewport panning. The enhanced renderer skips automatic caret following while that flag is set. On the next editor synchronization (input editing), `manualPan` returns to false and normal cursor-follow resumes. This prevents the new cursor-follow feature from defeating deliberate panning away from the insertion cursor.

### Regression and screenshot coverage
- **322** legacy LCD cases passed.
- **92** enhanced LCD cases passed, including cursor-follow constraints, long nested radicals, explicit manual panning, and variable-width scroll mapping.
- The Chromium screenshot gallery now includes nested-caret, scrolled-fraction, and manual-pan cases in addition to the earlier seven scenarios: **10 scenarios × four device pixel ratios × two renderers = 80 configured PNGs**.

The visual gallery was syntax checked but **not executed and visually accepted** in this session. Its 80 configured images are not evidence of a completed run. Windows WebView2 parity remains unverified.

## Visual regression usability — 2026-11-15 continuation

A GitHub Actions LCD artifact is now designed for **offline human review**, not just a folder of PNGs:

- `calculator/tests/test_lcd_visual.cjs` writes `lcd-screenshots/index.html`, a self-contained side-by-side comparison page. It supports filtering by expression and device pixel ratio, and displays enhanced/authentic images plus changed-pixel statistics.
- If Chromium fails partway through a run, the harness writes a **partial** manifest and review page in `finally`. Only completed enhanced/authentic pairs appear in the contact sheet, so failures do not leave a gallery with broken image references. The failed workflow still reports failure.
- The gallery has expanded to **20 scenarios × four DPR values × two renderers = 160 configured PNGs**. Besides radicals, fractions and scrolling it now covers cube and indexed roots, exponents, scientific notation, logarithm bases, summation, integration, derivatives, mixed fractions and `π` results.
- A direct JavaScript drawing-path verification confirmed all 20 configured cases select the enhanced renderer. The earlier legacy/enhanced suites still pass **322 + 92 = 414** cases.

**Important:** The 160 PNGs are configured, not confirmed generated or visually accepted. The contact sheet and partial-report logic were syntax-checked and exercised with synthetic manifest data. Actual Chrome/Windows WebView2 screenshots, baseline approval, and physical-device parity remain pending a successful real workflow run and review.

After a successful Windows workflow, open the `calculator-lcd-visual-regression` artifact and load `index.html` from its extracted directory to examine the paired captures locally.

## Symbol boundaries and contrast consistency — November 15, 2026

Two additional renderer defects were addressed:

1. **Cube/indexed root clipping:** root indices previously used fixed baselines close to the radical roof, so part of the index could lie above the renderer's measured glyph box. Root indices now sit below the roof with the correct ascent accounted for. Summation and integral box measurements now cover their actual `y-12` upper and `y+12` lower limit baselines.
2. **Contrast mismatch:** the enhanced renderer used an independent ink-color interpolation, causing vector mathematics to look lighter than legacy LCD text at the same contrast level. It now exactly matches the original renderer's ten contrast-level palette. At contrast 5, both use `rgb(29,40,34)`.

The available regression checks pass **322 legacy cases + 107 enhanced cases = 429 cases**. New checks cover root index positions, calculus limit bounds, and all ten contrast levels. The visual-review harness has **22 scenarios × 4 DPR settings × 2 renderers = 176 configured screenshots**, including low/high contrast examples.

As before, syntax and Canvas-operation verification do not establish real Chromium or Windows WebView2 screenshot parity; the screenshot workflow must run and its produced images be inspected before claiming that.

## High-resolution engineering results — 2026-11-15

Engineering-format results such as `1.23×10^4` were still drawn as plain text with the literal `^` symbol in the enhanced result line. The renderer now separates the mantissa/`×10` base from the exponent and paints the exponent with a smaller 5.1px Canvas font raised above the normal 6.8px baseline. Right alignment uses measured widths from both font sizes. Signed negative exponents and comma decimal separators are supported. Noncanonical formatting stays on the authentic bitmap renderer.

**Verified:** The original LCD suite passes 322 cases; the enhanced LCD suite passes 120 cases. New regression cases verify exponent parsing, separate glyph drawing, smaller font, raised baseline, absence of caret glyphs, and authentic fallback for malformed output. The 24 browser screenshot scenarios each select the enhanced drawing path in mock Canvas verification.

The visual comparison gallery now configures **24 cases × 4 device pixel ratios × 2 renderer modes = 192 browser screenshots**, including signed engineering exponent examples. These images have not yet been executed and reviewed in the browser/Windows workflow in this session. No claim of screenshot-level physical calculator parity is made.

## Complete LCD text resolution pass — 2026-11-17

User-provided LCD screenshots showed low-resolution glyphs in four places: `Ans` input, MODE selection, EQN equation-type selection, and EQN coefficient editing. These were not MathIO expression rendering problems: they were produced by the original bitmap renderer, which was still active for many application screens.

### Architecture

- `FreshLCD.rasterize(state, collect?)` optionally collects every ordinary glyph emitted by the original screen layout, preserving character, logical x/y position, and inverse-digit status. `FreshLCD.draw(canvas, state, collect?)` passes this through **during its existing rasterization**, so there is no duplicate rasterization on every keypress. `FreshLCD.getTextRuns(state)` is also available for tests.
- `FreshEnhancedLCD.draw()` retains original geometry, key selection rectangles, underlines, cursor and navigation marks, then repaints **all ordinary LCD characters** at their existing positions with high-resolution 6.35px Consolas/monospace Canvas typography. Inverted MODE digits retain their dark background and light text.
- The existing vector MathIO renderer and specialized fractional, radical, recurring-decimal and engineering result rendering are retained. The URL parameter `lcd=authentic` still forces the original bitmap renderer.
- This approach covers screens through a **single shared character path** rather than a brittle list of individual menu or equation implementations. It includes the original rasterizer's MODE, SETUP, EQN, STAT, BASE-N, TABLE, MATRIX, VECTOR, memory, contrast, prompt, result, error, and ordinary-input routes. Pure graphical strokes remain geometrical marks, not fonts.

### Verification

- `test_lcd_symbols.cjs`: **322** original LCD cases pass.
- `test_lcd_enhanced.cjs`: **120** high-resolution math and navigation cases pass.
- `test_lcd_all_screens.cjs`: **30** distinct screen classes pass with **638** high-resolution character-drawing calls verified, including inverted MODE digits. This suite is part of the Windows `npm run check`.
- `test_lcd_visual.cjs`: **28** screenshot scenarios are configured, now including the four screens in the user-provided photos. At four device-pixel ratios and two renderers, the gallery expects **224** PNG images if the workflow completes. Source-level drawing checks for these cases pass.

**Limit:** The automated JavaScript draw-call checks do not replace inspection of actual Chrome/WebView2 screenshots. Do not claim pixel-perfect visual or physical-device parity until the browser gallery and Windows desktop build have been run and reviewed. The faceplate and underlying calculation engine are unchanged by this LCD typography pass.

## CAL-006 — preserve natural glyph proportions (2026-11-17)

**Resolved in the enhanced LCD text layer:** `drawTextLayer()` previously used the optional fourth argument of Canvas `fillText(text,x,y,3.65)`, asking the browser to compress any glyph that exceeded 3.65 logical units *horizontally*. That could make letters and digits look unnaturally narrow, especially when the chosen monospace face differs across browsers.

The renderer now **never uses `fillText`'s `maxWidth` argument** for ordinary LCD text. It measures the natural width of each character using the actual Canvas font, draws the glyph at natural aspect ratio, and decreases the entire font size proportionally only when the glyph would exceed the existing 3.65-unit width budget. Characters stay centered within their original four-unit LCD cells. Font measurements are cached per character for each repaint, avoiding repeated measurements for menu labels and tables. The authentic bitmap mode is unchanged.

Automated regression evidence:
- **322** original LCD cases pass.
- **126** enhanced drawing cases pass, including six new checks for natural-width `fillText`, fitting wide glyphs, narrow-glyph alignment, inverse menu digits, and measurement caching.
- **30** calculator screen classes, representing **638** vector character draws, pass the all-screens audit with the requirement that `maxWidth` is **never supplied**.
- The Chromium screenshot harness now hooks native `CanvasRenderingContext2D.fillText` and fails if a fourth compression argument is passed during rendering. Its syntax was checked; live Chromium screenshot execution and Windows WebView2 visual acceptance remain pending.

Other LCD improvement tasks (e.g., CAL-007 text-clearing artifacts) are outside this change.

## CAL-007 — preserve cursor, underline, and mathematical geometry (2026-11-17)

**Resolved in source:** Previously the enhanced text layer first painted the complete legacy LCD bitmap and then covered each legacy character with an opaque `3.85 × 5.8` background rectangle before drawing high-resolution text. That could erase cursor strokes, underlines, menu-selection boundaries, or neighboring mathematical geometry and expose leftover bitmap fragments beyond the clearing rectangle.

The **enhanced** call now passes `{textRuns:[],vectorText:true}` to `FreshLCD.draw()`. The legacy rasterization retains all non-character geometry, cursor/selection strokes, dark inverse-menu backgrounds, and bitmap-only template placeholders; it skips only bitmap items whose `c` character is present. The vector text layer draws uncompressed characters on top **without any `fillRect` clearing**. Inverse menu digits are painted in the background color on their original dark rectangles. The `lcd=authentic` bitmap path remains unchanged because the `vectorText` option is opt-in.

**Regression checks executed against current source (mock Canvas):**
- 322 original LCD cases passed.
- 138 enhanced LCD cases passed, including 12 CAL-007 checks for unchanged authentic rasterization, glyph suppression without leftover text, preserved cursor pixels, inverse-menu backgrounds, TABLE selected-cell underlines, and an absence of cell-clearing rectangles.
- 30 LCD screen classes / 638 high-resolution character draws passed.

Actual Chromium and Windows WebView2 screenshot acceptance is separate from these source-level checks; their pixel-level output has not been independently reviewed as part of this task.

## CAL-009 — consistent LCD font across platforms (2026-11-17)

The enhanced renderer previously used host-installed `Consolas`, `DejaVu Sans Mono`, or browser `monospace`. Because the selected face changed between Chrome, Windows WebView2, and other hosts, the same input could produce different glyph metrics, line spacing, and caret alignment.

**Implementation:** Reuse the existing repository-owned `fonts/Roboto-Medium-webfont.woff`, declared under the private `CalculatorLCD` family with font weight 600 in `calculator/styles.css`. The enhanced LCD renderer now uses `CalculatorLCD` for the main expression, result typography, engineering exponents, and all mode-menu text, continuing to measure actual glyph widths with Canvas. The font file is served on the website from the repository root; Windows staging copies exactly that file into the Tauri frontend and rewrites the CSS path. The standalone builder embeds the same bytes directly as a base64 WOFF data URL, so the *next regenerated* offline HTML can render independently of host fonts.

The controller makes an initial safe authentic-bitmap paint and loads the requested font with `document.fonts.load()`. It repaints with enhanced vector text only after the font is available. `FreshEnhancedLCD.fontReady()` also rejects an undeclared font face even when `FontFaceSet.check()` returns true; this prevents a silent substitution with a host font. The `lcd=authentic` URL setting remains unchanged.

**Checks:** 322 original LCD cases, 145 enhanced LCD cases, and 30 all-screen classes representing 643 vector character draws passed in source-level JavaScript validation. Screenshot harness syntax was checked and updated to load the exact repository font bytes as a browser data URL. Actual Chromium screenshots, Windows visual review, and font coverage for every rare mathematical symbol remain to be verified.

**Known independent release blocker:** CAL-001 (standalone script URL parsing and stale generated HTML) still prevents regenerating/validating the committed standalone artifact; the standalone font embedding is implemented in its builder but the current generated file has not been refreshed.

## CAL-012 — Windows WebView2 versus Chromium scaled screenshot acceptance (2026-11-17)

**Automated cross-engine acceptance implemented and passed.** The Windows Actions
workflow `calculator-tauri-windows.yml` stages a shared eight-case LCD
fixture, captures **32 screenshots with real Microsoft Edge WebView2** and **32
matched Chromium screenshots** across DPR emulation factors **1, 1.25, 1.5,
2**, then checks image dimensions, dark LCD ink coverage, ink intersection
over union, and mean RGB differences. The comparator rejects missing/duplicate
screenshots and produces `report.json`, `index.html`, and difference PNGs.
A comparator self-test injects a corrupted image to ensure failures remain
diagnostic. The test fixture is explicitly excluded from the final installer
assets.

Verification: the 2026-11-17 Windows run
https://github.com/philiparad/philiparad.github.io/actions/runs/44018502404
passed the **Chromium capture, WebView2 native capture, comparator self-test,
and all 32 cross-engine comparisons**. Its
`calculator-lcd-webview2-chromium-parity` artifact includes the screenshot
gallery and per-case metrics.

**Scope:** this uses native WebView2 inside a WinForms test harness with
DevTools *emulated* DPR, loading the same production LCD JavaScript/CSS/font
as Tauri. It does **not** actually change Windows monitor display scaling,
inspect the installed Tauri window, or compare with physical calculator
hardware. Those remain independent manual acceptance requirements.

## CAL-016 — avoid repeated full LCD background expansion (2026-11-17)

The LCD uses 192 × 62 high-resolution logical pixels, expanded to a 960 × 310 RGBA Canvas image (297,600 output pixels / 1,190,400 channel bytes). Previously `FreshLCD.draw()` allocated an `ImageData` and rewrote every channel on **every paint**. Enhanced rendering first paints the bitmap background, then paints Canvas text/math overlays; text-only edits need not reconstruct that underlying background.

**Implementation in `calculator/js/display.js`:**
- Store the last clean background `ImageData`, its logical pixel bits, contrast ink color, dimensions, and context in a `WeakMap` **per canvas**.
- Every paint still computes the legacy 192 × 62 logical raster, so all screen state, cursor marks, arrows, selection strokes, and geometry remain current.
- If the ink color is unchanged, compare logical pixels and rewrite only the changed 5 × 5 output pixel blocks. For a text-only or entirely unchanged background, write **zero RGBA bytes**.
- Reuse the existing `ImageData` allocation after cursor movement or contrast changes; a full pixel refresh is required when contrast changes.
- Always call `putImageData` to restore the clean bitmap background before vector labels/results are repainted; never retain stale text from the preceding frame.
- Canvas size or context changes invalidate the cache. Different canvases have isolated caches. Authentic LCD bitmap rendering remains supported.

**Verification:** Existing suites pass: 322 legacy LCD cases, 145 enhanced LCD cases, and 30 screen classes with 643 high-resolution glyph draws. The added `test_lcd_performance.cjs` checks text-only updates, dirty-cursor pixels, contrast, canvas resize/isolation, image byte equality, unchanged authentic rendering, and continued enhanced vector text repainting. It measures RGBA writes deterministically: an initial frame writes all 1,190,400 channel values, cursor-only changes write fewer than 20% of that amount, and unchanged geometry writes zero. This source-level test is included in the Windows `npm run check` workflow.

**Limitations:** The optimized background is still transferred to Canvas with `putImageData` every frame, and the 192 × 62 legacy geometric raster is still computed on each paint. Real browser/WebView2 latency and frame time remain to be benchmarked on target hardware; the change does not claim a measured FPS improvement.

## CAL-018 — measured nested-caret scrolling in both axes (2026-11-17)

**Implemented:** The enhanced renderer previously painted the complete structured expression once to obtain the Canvas caret coordinates, then sometimes cleared the viewport and drew the expression a second time to bring the caret into view. Vertical correction relied on the separate legacy fixed-width/fixed-height viewport metrics, which could leave deeply nested insertion points outside the visible LCD.

The renderer now resolves the **measured nested insertion location before painting**, using `locateCaret()`, which follows the same positioning for fractions, mixed fractions, roots (including nth-root indices), powers, repeating decimals, logarithms, derivatives, integrals, and sums as the actual vector rendering. It maps the legacy controller's horizontal scroll offset to real Canvas glyph advances via `scrollOffset()`, follows the insertion point horizontally, and adjusts the baseline vertically when the expression exceeds the available screen height through `followCaretVertical()`. The active caret stroke is kept fully visible within the text viewport. `viewport.manualPan` preserves user-controlled SHIFT-arrow scrolling and does not snap to the insertion point. No controller or expression state is mutated by painting.

Unlike the previous speculative two-pass approach, the structured expression is now **drawn once** after the final scroll and baseline positions are known. Overflow cues and the authentic fallback path are retained.

**Verification:** The new `calculator/tests/test_lcd_caret_scroll.cjs` passes **83 cases** covering every supported nested template field, insertion offsets, measured glyph-width differences, long horizontal movement, tall expressions, vertical caret visibility, manual panning, and invalid nested paths. The original **322** LCD symbol/layout tests, **145** enhanced LCD tests, **30** screen-class audit (643 vector draws), and CAL-016 cache tests also pass. Windows `npm run check` now includes CAL-018, and the Windows workflow triggers for its test file.

**Remaining scope:** These source-level deterministic Canvas tests do not themselves prove a particular Windows monitor DPI experience. Existing Chromium/WebView2 screenshot workflows provide further visual-acceptance coverage; installed-Tauri-window manual DPI inspection remains an independent check.
