# REA-072 — LCD glyphs, status annunciators, menu paging and viewport audit

**Status:** Independent WEB renderer improvements implemented and unit-checked. **Authentic CASIO LCD pixel parity remains unverified and is blocked on native evidence.**

## Evidence and physical measurement policy

- [REA-001 reference corpus](../rea-001/README.md): source-defined scenarios, no actual captured CASIO LCD frames.
- [REA-002 native LCD geometry workbench](../rea-002/README.md): native active rectangle and native dot count are **not measured**. Some static emulator assets have dimensions 192×63 and 192×8; these do not establish the hardware matrix.
- [REA-006 web-only golden snapshots](../rea-006/README.md): 96×31 logical raster scaled to a 768×248 PNG. This is a project design choice, **not** CASIO LCD geometry.
- [CASIO original fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf).
- [CASIO PLUS manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf).
- [CASIO PLUS C manual](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/before_using_calculator/getting_started.html).

Never label a CSS screenshot, an independently drawn font, or a tool-generated image as a physical device capture. Do not alter the LCD logical dimensions to match 192×63 merely because a static DLL resource has that size.

## Identified source-level defects and corrections

1. **Uppercase fallback:** `js/display.js` previously used `FONT[c.toUpperCase()]` for lowercase characters without their own glyphs; `sin` and `SIN`, and `e` and `E`, were indistinguishable. Added all 26 distinct lowercase 3×5 patterns and extra punctuation/math symbols. Fonts are original web pixel patterns, **not extracted CASIO ROM bitmaps**.
2. **Original-mode memory view:** STO/RCL screen displayed registers `E` and `F` even on original fx-991ES, contradicting REA-069's model-aware register restrictions. It now draws `A B C D X Y M` on original and `A B C D E F X Y M` on PLUS/PLUS C.
3. **Regression protection:** Added independent bitmap, annunciator and viewport invariants in `calculator/tests/rea072-lcd-fidelity.cjs`; added a browser physical-key sequence regression in `calculator/reference/rea-072/test_lcd_browser.py`.

The existing live upper annunciators and multi-region scrolling were reviewed from `js/lcd-indicators.js` and `js/lcd-viewport.js`. Their source behavior was covered in new regressions; no speculative changes to their geometry were made without native evidence.

## Reproducible checks

From `calculator/`:

```sh
node tests/rea072-lcd-fidelity.cjs
python reference/rea-072/test_lcd_browser.py
```

- 94 deterministic JavaScript checks passed in a JavaScript execution harness: glyph coverage and visual distinctness, web matrix bounds, original/PLUS STO/RCL grid, all-off pixels, MODE page-arrow pixels, M/STO and history/menu flags, and viewport/flow windows.
- Browser test checks lowercase glyphs in live UI, model switching, calculator key controls, pending STO/RCL overlay and grid, MODE page arrows and OFF/ON indicator behavior. **Committed, not executed in this environment.**
- Real-device pixel comparison is **not possible** with current native-evidence corpus; do not claim it was done.

### Golden image reapproval gate

REA-006 pins *web-only* screenshots from an earlier font. **Intentional glyph changes will alter captured RGB pixels.** Do not regenerate the baseline automatically as evidence of matching old output. After running the browser test, generate a candidate via:

```sh
python calculator/reference/rea-006/lcd_golden.py --capture-only --out /tmp/rea072-candidate
```

Compare old and candidate screenshots, manually inspect every changed frame and its state, explicitly review/approve expected changes and only then replace the old pinned `web-golden.json` in a separate reviewed action. CI may report pixel differences before this approval; that is **expected and must not be suppressed**.

## Outstanding physical parity items

1. Capture original model-specific LCD screen photographs/emulator PNGs for digits, all glyphs, MathIO nested structures, edit cursor, result, full MODE/SETUP pages, STO/RCL, SCI/FIX, A/S/M, and arrows at each scroll boundary.
2. Use [REA-002](../rea-002/README.md) to measure the actual CASIO matrix, annunciator rectangle and dot pitch with calibrated native images.
3. Align authentic native and web image crops by edition, compare individual pixels and glyphs, and record parity results using [REA-004](../rea-004/README.md).
4. Verify animation, blink timing, long fraction and nested root layout, and mode-specific multi-page output behavior on hardware.
5. Accept/reject web-only golden candidate snapshots explicitly; browser execution, photographic review and real-hardware parity remain unverified.

This task does not implement REA-073 (structured templates). The standalone HTML synchronization belongs to REA-100.
