# REA-032 — Trigonometric, inverse, hyperbolic and inverse-hyperbolic edge cases

## Scope
Implements only the REA-032 task from the calculator development backlog. The calculator is an independent browser-side educational simulator, not CASIO firmware.

## Official, model-specific reference
[CASIO fx-115ES PLUS / fx-991ES PLUS C (2nd edition), Calculation Ranges, Number of Digits and Precision](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/calculation_ranges.html).

[Trigonometric Functions](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/trigonometric_functions.html) and [Hyperbolic Functions](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/hyperbolic_functions.html).

The official limits include:
- sin/cos/tan input magnitude strictly below **9×10⁹** in degrees, **157079632.7** in radians, and **10¹⁰** in grads. Tangent is undefined at odd quarter-turns.
- asin/acos input from **−1 through 1**; atan up to **9.999999999×10⁹⁹** in magnitude.
- sinh/cosh magnitudes at most **230.2585092**, while tanh allows magnitude up to **9.999999999×10⁹⁹**.
- asinh absolute input up to **4.999999999×10⁹⁹**, acosh input from **1 to 4.999999999×10⁹⁹**, atanh absolute input no greater than **0.9999999999**.
- Hyperbolic functions do not depend on angle mode.

## Changes
- Replaced unconditional JavaScript trig dispatch with range and domain-checked functions returning `Math ERROR` on forbidden inputs.
- Detects quadrantal angles for exact zero, ±1 results and tangent singularities; the tolerance is bounded so nearby legitimate angles are not broadly classified as singular.
- Removes an old unconditional suppression of results smaller than `1e-13`, preserving valid very small trigonometric values.
- `HYP` then `SHIFT + SIN/COS/TAN` now inserts `asinh(`, `acosh(`, or `atanh(`; existing plain `HYP + SIN/COS/TAN` continues to enter `sinh(`, `cosh(`, and `tanh(`.
- Both modular and standalone HTML contain the same controller and mathematical engine.

## Tests
```sh
node calculator/reference/rea-032/test_trig.js
node calculator/reference/rea-031/test_combinatorics.js
```
The new suite checks all three angular modes, cardinal angles, inverse edge values, singularities, domain errors, hyperbolic limits and unit independence. Previously committed REA-021–REA-031 suites are used for regression.

### Limitations
The functions use JavaScript's floating-point transcendental algorithms and are **not bit-for-bit verified against actual CASIO firmware**. Exact error-triggering tolerances near tangent poles, final-digit rounding, physical LCD positions and real Chromium end-to-end execution require genuine device/browser testing. REA-033 is not part of this change.
