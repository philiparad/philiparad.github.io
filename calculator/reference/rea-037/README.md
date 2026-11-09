# REA-037 — Finite product Π

One task only: calculation and keyboard access for `Prod(expression,lower,upper[,step])`.

## Manufacturer reference
[CASIO fx-115ES PLUS / fx-991ES PLUS C 2nd edition — ∏ Calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/pi_calculations.html).

The documented product is `∏(f(X),a,b)`, evaluated as `f(a) × f(a+1) × … × f(b)`. CASIO's example `∏(X+1,1,5)=720`. Integer lower/upper bounds must be less than 10¹⁰ with `a ≤ b`. Product nesting and the functions Pol/Rec/÷R, Σ/Π/∫/d/dx in the prohibited fields are rejected.

## Implementation
- `js/math-engine.js`: recognizes `Prod(f(X),a,b)`, as well as `Product` and unicode `Π`, with nested-parenthesis-aware splitting; evaluates X at each integer index and retains all other variable registers. Numeric errors are surfaced; overflows past the calculator's numerical range fail.
- Optional **fourth argument `step` is a web-only teaching extension**, not a claim about native CASIO input. It must be a positive integer; omitted step defaults to 1. E.g. `Prod(X,2,8,2)=384`.
- Browser performance safety bound: **20,000 product terms**. This is a deliberate implementation safeguard, not a device-specified CASIO threshold.
- `js/app.js`: ALPHA+INTEGRAL inserts `Prod(` in the existing expression editor; ALPHA+LOGBASE opens a Π prompt with expression, lower, upper, and step fields. These are **web application shortcuts**, not verified manufacturer key codes. Existing SHIFT+LOGBASE finite sum is preserved.
- `calculator/fx991_fresh_standalone.html`: synchronized with modular implementation. The existing input/MathIO result displays remain in place; a pixel-accurate native ∏ glyph has not been certified.

## Test
```sh
node calculator/reference/rea-037/test_product.js
python3 calculator/reference/rea-037/test_browser.py
```
Browser tests require Playwright and Chromium. Core engine and simulated DOM interactions are validated in development, plus prior REA-021–REA-036 regression suites. The physical device's exact key and LCD layout and edge-case rounding remain unverified.

REA-038 is **not** included.
