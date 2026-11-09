# REA-033 — Rectangular/polar coordinate conversion

Implements the single REA-033 backlog item: `Pol(x,y)` and `Rec(r,θ)` input, angle mode handling, X/Y register assignments, and both results on the LCD.

## Manufacturer references
- [CASIO fx-991ES PLUS C (2nd edition) guide, Pol/Rec](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf), examples on E-21 and related operation examples.
- [CASIO Rectangular-Polar Coordinate Conversion](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/coordinate_conversion.html).

**Key sequence:** SHIFT + ADD → `Pol(`; SHIFT + SUB → `Rec(`. A separating comma is entered with SHIFT + RP.

**Results:** `Pol(sqrt(2),sqrt(2))` in DEG produces `r=2 θ=45`; `Rec(sqrt(2),45)` produces `X=1 Y=1`. First component is stored in register X and second in Y, accessible via ALPHA keys. The first component is the primary result and Ans. Polar theta is normalized to `(-180°, 180°]`, equivalently `(-π,π]` in RAD or `(-200,200]` in GRAD.

## Implementation
- `calculator/js/coordinates.js` parses a full top-level `Pol(...,...)` / `Rec(...,...)` expression, respecting nested math parentheses, computes both components using `Math.hypot`, `Math.atan2`, `Math.sin` and `Math.cos`, and interprets the active angle unit.
- `calculator/js/app.js` evaluates argument expressions using the existing mathematics engine, commits results to X/Y **only after** valid conversion, stores the first component in Ans, and displays both labeled components. An invalid expression cannot overwrite X/Y. SHIFT+ADD/SUB key mapping is corrected.
- The calculator's existing LCD text rendering and horizontal result scrolling are used. Both modular and standalone builds include the coordinates module. Result-form changes via S⇔D are disabled for multi-value coordinate output.
- Test programs include valid quadrants, negative axes, three angle units, nested arguments, key sequences, X/Y retention, and invalid syntax.

## Tests
```sh
node calculator/reference/rea-033/test_coordinates.js
python3 calculator/reference/rea-033/test_browser.py
```

The Playwright browser test requires Chromium. During development, an in-memory DOM calculator harness was also exercised. This does **not** constitute firmware parity or physical LCD verification; fine-grained display precision and native hardware UI details remain open for later device-side comparison. REA-034 is outside this increment.
