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
