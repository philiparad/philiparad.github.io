# REA-034 — Logarithm base, nth-root and cube-root templates

## Scope

One backlog item: structure and render nested log-base, nth-root and cube-root expressions, including cursor navigation, correct calculation and domain errors.

## Manufacturer references

CASIO fx-991ES PLUS C (2nd edition) [User's Guide](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf), function calculations and MathIO/Natural Display. Examples include logarithms with a specified base, cube roots and nth roots. The independent web simulator implements a comparable learning-oriented editor, not CASIO ROM.

## Code changes

- `js/structured-editor.js`: `logBase` template has editable `base` and `argument`; `nthRoot` now serializes as `nthroot(index,radicand)` rather than power-of-1/index, and `cubeRoot` continues to serialize as `cbrt(radicand)`. LEFT/RIGHT/UP/DOWN navigate both slots.
- `js/lcd-viewport.js` and `js/display.js`: layout and rasterize base subscript and logarithm argument, nth-root index and radicand, and cube-root mark; preserve scrolling/cursor placement in the existing 96 × 31 project LCD.
- `js/math-engine.js`: dedicated real nth-root calculation, including negative radicands for odd integer indices and valid negative indices. Reject zero root index, even or noninteger negative-radicand roots, invalid logarithmic base 0/1/negative, and nonpositive log arguments with `Math ERROR`.
- `js/app.js`: `LOGBASE` opens the two-field `logBase` template, rather than plain `log(`. SHIFT+LOGBASE still opens SUM, SHIFT+POWER opens nthRoot, and SHIFT+SQRT opens cubeRoot.
- Modular and standalone versions are synchronized.

## Tests

```sh
node calculator/reference/rea-034/test_log_roots.js
python3 calculator/reference/rea-034/test_browser.py
```

The browser test requires Playwright and Chromium. The calculation and template tests were executed through an in-memory JavaScript harness; hardware LCD parity, exact native key combinations and all extreme numeric corner cases remain unverified. REA-035 is out of scope.
