# REA-010 — LCD typography, glyphs and status indicators

**Status: WEB DISPLAY IMPROVED; NATIVE CASIO PIXEL EQUIVALENCE UNVERIFIED.**

The original task requests pixel-accurate native CASIO glyphs and rendering. That cannot be certified yet: REA-001 has no genuine LCD reference captures, and REA-002 has not measured the native active pixel matrix. No manufacturer pixels, ROM font, emulator binary or copyrighted bitmap are embedded here.

## Changes implemented

- Extended `calculator/js/display.js` with a compact 3×5 mathematical glyph set: θ, α, β, Σ, ∑, ∫, ∞, ≠, ≤, ≥, ≈, prime, double prime, directional indicators, √, ×, and multiplication dot.
- Kept the independent project-defined **96×31 logical LCD**, rendered on a **768×248 image** with integer (8×) pixels, and deterministic geometry for structured root strokes. These are **not asserted to be CASIO's native dimensions**.
- Corrected the meaning of the top LCD indicators in `js/app.js` and the corresponding visible HTML overlay: S (SHIFT), A (ALPHA), M (independent memory nonzero), STAT / CMPLX / MAT / VCT (selected calculation modes), D/R/G (angle), FIX/SCI (numerical display format), and Math (natural display selection).
- For power-off, every indicator becomes blank. The existing calculator buttons still control these states and the formula editor remains LCD-only.
- Updated the same changes in `fx991_fresh_standalone.html` (no external script dependencies).
- Updated only two old REA-006 baseline **semantic annunciator expectations** for STAT prompt/result: formerly the fourth annotation was incorrectly `STAT`, now it correctly represents `Math`. All 13 golden-frame RGB arrays, hashes and reference screenshots are unchanged.

**Manufacturer documentation basis:** [CASIO fx-570ES PLUS / fx-991ES PLUS User's Guide, “Reading the Display”](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991ES_PLUS_EN.pdf), describing S, A, M, STO/RCL, mode, D/R/G, FIX/SCI, Math and history indicators.

Only the **documented meaning** of some indicators is used as a guide; their true CASIO positions, shapes, timing and native glyph bitmaps are not verified by real device observation. The independent M annunciator currently appears when `M !== 0`, which is a simplification of storage semantics. STO/RCL annunciators and native replay arrows need further controller support.

## Browser acceptance tests

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-010/test_lcd_browser.py
```

Checks both modular `index.html` and standalone HTML, 50 physical keys, >18 independent glyph patterns, the S/A keys, memory M, D/R angle setup, FIX/SCI digits, STAT and MAT modes, power-off clearing, and no JavaScript exceptions.

GitHub Actions: `.github/workflows/rea010-display.yml`. The existing REA-006 golden workflow checks the committed web-only screenshots and warns if their pixels change unintentionally.

## Remaining REA-010 acceptance requirements

1. Capture original manufacturer LCD images of every glyph, cursor, fraction, exponent, root, degree symbol and annunciator for the **exact C 2nd edition**.
2. Measure native active pixel grid, segments and size via REA-002; preserve DPI and display scaling.
3. Rebuild native pixel-accurate fonts and compare rendered frames against true device captures, with tolerances, using REA-004 / REA-006.
4. Verify indicator states including STO/RCL, history, scroll cues, error and power conditions against a running original emulator.
5. Review a comprehensive golden-image corpus before marking pixel parity as hardware-verified.

Do not mark the hardware fidelity portion complete while the genuine reference set is absent.
