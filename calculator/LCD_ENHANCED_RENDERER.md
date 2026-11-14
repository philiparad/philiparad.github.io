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
