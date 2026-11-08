# REA-011 — Natural calculation-result formatting

**Task:** Support natural results including fractions, mixed fractions, irrational/root and π expressions, decimals, fixed/scientific notation and engineering notation.

**Current status:** Implemented and tested in the independent web calculator. **Native CASIO model-equivalence remains unverified** because the REA-001/002 manufacturer LCD reference corpus is incomplete.

## New components

- `js/result-format.js`: pure calculation-result formatter with explicit `kind` and textual/structural metadata, including reduced fractions, mixed fractions, simple π coefficients, simplified square roots, decimal, FIX, SCI and engineering representations.
- `js/app.js`: the calculator maintains a typed `resultPresentation` for LCD rendering; the existing S⇔D key toggles supported fractions, surds and π results with decimal, and SHIFT + S⇔D toggles improper/mixed fractions.
- `js/display.js`: stacked numerator/bar/denominator for fraction results; mixed-number integer alongside fraction, and mathematical text glyphs for π, roots and engineering output.
- `fx991_fresh_standalone.html`: inlined equivalent functionality. All mathematical interaction stays on the physical web calculator keys and LCD.

Examples of actual button sequences:

| Physical buttons | Expected output |
|---|---|
| `2 FRAC 3 =` | stacked 2/3 |
| `3 FRAC 2 = SHIFT SD` | mixed 1 1/2 |
| `SQRT 2 RIGHT =` | √2, then S⇔D for decimal |
| `SHIFT EXP ÷ 6 =` | 1/6π, then S⇔D for decimal |
| `1 ÷ 2 = ENG` | 500×10^-3 |
| `SHIFT MODE` → set LineIO, then `1 ÷ 5 = SD` | 0.2 → 1/5 |

The formatter is **conservative**: it only emits a π / root form for source expressions it recognizes. Approximate fractions derived from JavaScript `Number` are **not exact rational arithmetic**, even when the screen reduces their numerator and denominator. See REA-021/022 for decimal numeric fidelity and an exact rational engine.

## Tests and reviewed snapshot change

`reference/rea-011/test_natural_results_browser.py` performs real DOM button sequences and checks representations in **both modular and standalone HTML** using Chromium. CI: `.github/workflows/rea011-results.yml`.

The new stacked result intentionally changes a previously pinned *web-only* LCD golden image in REA-006. The one-time review script `approve_fraction_golden.py` and workflow `.github/workflows/rea011-fraction-golden.yml` strictly permit changes to **fraction_result only**, assert that all 12 other RGB goldens and all semantic states remain identical, and recheck the complete 13-frame suite before committing the updated reference.

## Manufacturer reference

The official [CASIO fx-991ES PLUS C 2nd edition manual: Toggling Calculation Results](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/toggling_calculation.html) describes switching between fraction, decimal, √ and π displays. The [fraction calculation documentation](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/fraction_calculations.html) describes reduced fractions and improper/mixed conversion; [setup documentation](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/configuring_calculator.html) describes MathO, LineO, Norm, Fix and Sci settings.

This implementation does **not** claim full CASIO representation equivalence for mixed decimal calculations, complex results, symbolic sums of radicals, recurring decimals, precision edge cases or display overflow. Manufacturer exact display conditions still need genuine original device screenshots.

**Do not start REA-012 until this task is accepted.**
