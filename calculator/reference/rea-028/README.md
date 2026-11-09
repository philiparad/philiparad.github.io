# REA-028 — DMS / sexagesimal calculations

**Scope:** Degree–minute–second input, decimal-degree arithmetic, and DMS ↔ decimal result conversion. The implementation follows the manufacturer examples but **native firmware/LCD equivalence has not been certified**.

## Official source

[CASIO fx-991ES PLUS C User's Guide — Degree, Minute, Second (Sexagesimal) Calculations](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf), printed page E-15:
- Sexagesimal input follows degrees, minutes and seconds, entered using °′″.
- Degrees and minutes must be entered even if zero.
- `2°20′30″+0°39′30″=3°0′0″`.
- `2°15′18″ = 2.255` decimal degrees.
- Adding/subtracting DMS values or multiplying/dividing DMS and decimal values produces a DMS display.

## Implementation

- `calculator/js/sexagesimal.js` validates DMS fields, translates complete DMS literals to decimal degrees, formats signed results with normalized base-60 carries, and chooses the next input separator.
- `math-engine.js` normalizes complete DMS expressions before the existing precedence evaluator. The legacy degree postfix for functions such as `sin(30°)` remains supported.
- `app.js` maps successive DMS presses to ° then ′ then ″ while typing a value. A result computed from DMS input initially displays in sexagesimal form. Pressing DMS switches to decimal and back without modifying Ans or the source expression.
- SHIFT+DMS acts as the same display conversion when a result is showing. It does not change the stored numeric result.
- `index.html` and `fx991_fresh_standalone.html` contain the new module in the appropriate script-loading order.

## Verification

```sh
node calculator/reference/rea-028/test_sexagesimal.js
python3 calculator/reference/rea-028/test_browser.py
```

The Python browser test requires optional Playwright and Chromium; source and simulated-controller checks were run during development, but **physical CASIO traces and live browser execution remain pending**. The decimal-degree intermediate uses the existing 15-significant-digit numeric engine; formatting rounds displayed seconds to six decimal places, and very large magnitudes may not be displayable as DMS. REA-029 is outside this increment.
