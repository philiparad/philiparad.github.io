# REA-016 — Model- and state-faithful LCD annunciators

**Acceptance target:** All mode, format, SHIFT/ALPHA, M, STO/RCL, statistics and history indicators correspond to reference. **Current status:** documented indicator semantics and live web interactions implemented; physical LCD geometry / pixel behavior unverified pending REA-002 and genuine CASIO frame captures.

## Reference

CASIO documents the indicator meanings in the [fx-991ES PLUS C Getting Started manual](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/before_using_calculator/getting_started.html) and [fx-570ES PLUS / fx-991ES PLUS User's Guide (Reading the Display)](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991ES_PLUS_EN.pdf).

## Implemented

A single pure function `FreshIndicators.derive(state)` computes the following flags from the active calculator state, and `FreshIndicators.render(state, lookup)` writes them to ten LCD annunciator spans:

| Visible indicator | When it lights in this independent application |
|---|---|
| S | SHIFT modifier pending |
| A | ALPHA modifier pending |
| M | Independent memory register M contains a nonzero finite value |
| STO | Menu awaiting memory-variable selection after SHIFT + RCL |
| RCL | Menu awaiting memory-variable selection after RCL |
| STAT, CMPLX, MAT, VCT | Corresponding calculation mode |
| D, R, G | Active angle setting (degrees, radians, grads) |
| FIX, SCI | Fixed decimal / scientific display setting |
| Math | Natural mathematical input mode, except modes using linear data entry |
| ▲, ▼ | Menu page / multi-line output continuation, or available calculation-history replay |
| Disp | Intermediate-result state (reserved: current calculation engine has no multi-statement intermediate screen) |

Switching mode or SETUP changes the annunciators immediately. Canceling STO/RCL clears its standby indicator. Clearing independent memory extinguishes M. Power-off clears every flag. The screen's existing numeric LCD renderer and mathematical engine are unchanged.

The standby menu is currently an **educational adaptation** and does not reproduce the native single-key variable-register selection. Likewise, replay indicators are semantically derived from available history/pages but exact firmware timing and native icon positions are unverified. A nonzero M register is a simplified storage indicator. Do not interpret these tests as manufacturer hardware parity.

The display overlay uses these new DOM IDs: `lcd-pending`, `lcd-replay`, `lcd-disp`, alongside the existing shift, alpha, memory, mode, angle, format and math spans.

## Code and verification

- `calculator/js/lcd-indicators.js`: centralized pure semantics and DOM bindings.
- `calculator/js/app.js`: status rendering through the derived state.
- `calculator/index.html` and `calculator/styles.css`: indicator slots and layout.
- `calculator/fx991_fresh_standalone.html`: identical offline integration.
- `calculator/reference/rea-016/test_indicators_browser.py`: Chromium physical-key sequence verification for both modular and standalone HTML, plus synthetic continuation state checks.
- `.github/workflows/rea016-indicators.yml`: CI browser verification and JSON evidence upload.

Run locally:

```sh
python -m pip install playwright==1.56.0
python -m playwright install chromium
python calculator/reference/rea-016/test_indicators_browser.py
```

## Remaining manufacturer acceptance work

1. Capture real CASIO screenshot/key sequences for all mode transitions, memory and STO/RCL, FIX/SCI, history, menus and intermediate multi-statement displays.
2. Confirm accurate pixel positions and timing against measured LCD rectangle and emulator versions via REA-002, REA-004 and REA-006.
3. Implement native variable-store UI and true intermediate calculation workflow before claiming exact STO/RCL/Disp parity.

This task is limited to REA-016. **REA-017 has not been started.**
