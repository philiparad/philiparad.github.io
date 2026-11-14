# LCD Symbol Rendering Audit — November 2026

## Scope

Reviewed the independent LCD renderer in `js/display.js`, the structured expression layout in `js/lcd-viewport.js`, and the status overlay in `js/lcd-indicators.js`. The source uses a **96 × 31 logical positioning grid**, a **192 × 62 output bitmap**, and **7 × 11 character glyphs**, ultimately presented on a browser canvas. These are implementation choices, not measured factory LCD data.

## Implemented refinements

| Component | Previous limitation | Current treatment |
| --- | --- | --- |
| Square root / cube root / nth root | Low-resolution staircase diagonal | Continuous segments rasterized on finer plane |
| Empty field placeholder | Short underline conflated with caret | Hollow rectangle, with separate root-level caret |
| Fraction / mixed fraction bars | Enlarged two-pixel-thick coarse lines | Finer one-pixel lines |
| Repeating decimal overbars | Coarse bars | Finer one-pixel lines in input and results |
| Integrals | Short 7 × 11 bitmap glyph despite large bounds | Taller fine-geometry integral |
| Summation | Short bitmap glyph despite large bounds | Taller fine-geometry sigma |

## Complete category inspection

| Category | Current rendering | Further opportunity |
| --- | --- | --- |
| Digits (0–9) | 7 × 11 high-resolution bitmap font | Compare optical weight and spacing against verified physical-device reference |
| Latin uppercase/lowercase | 7 × 11 atlas with fallback | Per-character spacing and lowercase baseline review |
| Greek letters (π, θ, α, β) | Bitmap atlas | Audit forms and stroke density |
| Operators (+, −, ×, ÷, =, ≠, ≤, ≥, ≈) | Bitmap atlas | Harmonize operator centerlines |
| Integral / summation | New fine-geometry signs for structured input | Test nested expressions and actual device proportions |
| Square / cube / nth root | Finer geometric strokes | Tune nested overbars and index placement |
| Fractions and mixed fractions | Fine horizontal bars | Better vertical metrics for nested fractions |
| Powers and scientific notation | Bitmap glyphs at shifted baselines | Consistent scale for exponents and subscript digits |
| Logarithm with base | Bitmap glyphs plus shifted base | Improve baseline/field alignment |
| Derivative d/dx and evaluation | Bitmap glyphs and thin mark | Consider scalable fraction-like derivative sign |
| Recurring decimal marks | Fine overline | Tune overline offset relative to glyphs |
| Brackets, parentheses, absolute value | Bitmap characters | Stretch to fit tall structured expressions |
| Cursor and input placeholders | Separate caret and outlined slot | Test focus, nested positions and blinking |
| Mode/menu arrows and scroll indicators | Bitmap/legacy raster | Align arrow shapes and point sizes |
| Mode annunciators (S, A, M, Math, D/R/G) | Separate HTML overlay | Test scaling and pixel alignment with canvas |

## Validation

Run:

```bash
node calculator/tests/test_lcd_symbols.cjs
```

The test covers twelve structured node types and verifies deterministic 192 × 62 bitmap output, filled versus empty fields, and the square-root placeholder outline. It is also included in the Windows Tauri build's `npm run check` script.

**Not yet established:** exact resemblance to the manufacturer's LCD, browser screenshot goldens, physical-device key-log parity, and full native Windows installation QA.

## Next engineering steps

1. Add screenshot-golden tests of every mode using fixed calculator states and device pixel ratio.
2. Test nested radicals, long fractions, right-edge clipping and horizontal/vertical scrolling.
3. Introduce height-aware parentheses, brackets and absolute-value delimiters.
4. Audit the 7 × 11 glyph atlas for centerlines, kerning, Greek letters and operator geometry.
5. Validate under Chrome, Edge WebView2/Tauri and Windows display scaling (100%, 125%, 150%).
6. Preserve the existing calculation engine, serializing expressions exactly as before.

Do not assume a larger canvas by itself improves glyph detail. Improve the **source geometry and glyph atlas first**, then test rasterization at each platform's display scale.

## Follow-up: native-style placeholder and LCD image quality (2026-11-14)

- Replaced the coarse outlined placeholder with a fixed 7×11 monochrome LCD bitmap. It shares the high-resolution character renderer with digits and operators and is used for empty structured-input fields.
- Removed the per-subpixel brightness stripe from the 960×310 output image; each underlying 192×62 logical LCD pixel now has a uniform ink/background color.
- Extended `calculator/tests/test_lcd_symbols.cjs` to **322 passing rendering cases**: all 12 structured templates, empty/filled states, MathIO/LineIO, edit/result states, nested expressions, input glyph atlas, eight calculation modes, contrast levels, off state, canvas color consistency, and template insertion/undo through the actual editor APIs.
- The Windows Actions workflow runs this test in `calculator/desktop/package.json` during `npm run check`; edits to the test itself also trigger the workflow.
- The new slot is **reference-inspired, not manufacturer pixel-for-pixel certified**. An exact hardware match still requires a native fx-991ES PLUS 2nd edition screenshot of the empty root slot and browser/Windows image-diff review under matched zoom.
