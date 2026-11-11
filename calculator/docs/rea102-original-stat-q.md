# REA-102 — Original fx-991ES STAT Q(t)

Issue: https://github.com/philiparad/philiparad.github.io/issues/56
Parent audit: REA-084 / issue #34

## Manufacturer reference and mathematical definition

Original fx-991ES manual, printed **E-49** (PDF page 50): **SHIFT → 1 (STAT) → 7 (Distr) → 2 (Q()**.
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The reference diagram shades the segment between 0 and t. The signed integral convention is independently stated in the official CASIO graphics calculator manual:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-CG50_Soft_v360_EN.pdf

`Q(t) = (1/sqrt(2π)) * integral[0,t] exp(-u²/2) du`.

For negative t the integral reverses direction, so `Q(-1)` is **negative**; the shaded physical area is its absolute value. The function should not be labeled a nonnegative probability for negative t.

`P(t) = 0.5 + Q(t)`, `R(t) = 0.5 - Q(t)` and `Q(-t) = -Q(t)` mathematically.

## Changes implemented

1. `calculator/js/math-engine.js`: added `Q(` to the recognized function names and a `q` call case. Calls are routed to the existing independent `FreshStatNormal.calculate('Q',t)`, which already evaluates the signed Gaussian area through adaptive Simpson integration.
2. The evaluator accepts `Q(t)` **only in original fx-991ES STAT 1-VAR context**, with exactly one argument and an explicitly enabled `statOriginalDistr` flag. COMP, CMPLX, TABLE, other STAT subtypes, PLUS and PLUS C must reject the operation with `Argument ERROR`.
3. `calculator/js/app.js`: original STAT Distr option 2 now inserts `Q(` directly into the editable calculator expression rather than opening a custom prompt. This supports `Q(Ans)`, normal `=`, cursor editing and arithmetic composition, consistent with REA-101 P(t).
4. `calculator/fx991_fresh_standalone.html` was regenerated with the updated canonical math engine and app controller. No changes were made to PLUS C's separate DIST mode or to REA-103 R(t) and REA-104 normalized t routes.

## Numerical examples

| Expression | Expected signed result |
| --- | ---: |
| `Q(0)` | 0 |
| `Q(1)` | 0.341344746068543 |
| `Q(-1)` | -0.341344746068543 |
| `Q(2)` | 0.477249868051821 |
| `Q(-2)` | -0.477249868051821 |
| `Q(3)` | 0.498650101968370 |
| `Q(-3)` | -0.498650101968370 |
| `Q(8)` | approximately 0.5 |
| `Q(-8)` | approximately -0.5 |

All values above derive from independently established standard-normal CDF values, not from physical CASIO capture.

## Regression

```bash
node calculator/tests/rea102-stat-normal-q.cjs
```

**115 isolated JavaScript checks passed** against the committed source, including independent reference values, odd symmetry, `P(t)-0.5`, `P(t)+R(t)=1`, normal-range bounds, error inputs, `Q(Ans)`, arithmetic composition, 3 model profiles × 4 modes × 2 context flags, and actual mocked execution of the original menu action.

Browser key-sequence smoke test (committed, **not executed here**):

```bash
python3 calculator/tests/rea102_browser_stat_q.py
```

Its intended sequence is original model → MODE 3 (STAT) → 1 (1-VAR) → SHIFT 1 (STAT) → 7 (Distr) → 2 (Q() → argument → ) → =, comparing modular versus standalone and negative/positive inputs.

REA-100-style direct source inspection confirmed the standalone's canonical markup, CSS, 46-script order, manifest, and updated `math-engine.js` and `app.js` modules. This was not a native Python `--check` execution.

## Remaining before issue closure

- Run the committed test file with native Node.js and browser script with actual Playwright/Chromium in a checked-out repository.
- Verify LCD expression rendering, display rounding (Norm1/Norm2, Fix, MathIO/LineIO), `Ans`, parentheses, errors/cancel and cursor editing with browser key traces.
- Capture and independently compare physical original fx-991ES behavior and model-specific key sequence, including `Q(-1)` and boundary cases.
- Record actual reference-device evidence under REA-099. Source tests, manual graphs and independent probability tables **do not constitute hardware parity evidence**.

Issue #56 remains open pending native/browser/device verification. REA-103 has not been started.
