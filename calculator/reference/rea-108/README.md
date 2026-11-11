# REA-108 — Scaled linear regression correlation

## Defect

Previously `linear()` accumulated raw second moments `xx`, `yy` and `xy`, and formed `r = xy / sqrt(xx * yy)`. With paired samples `(-1e90,-1e90)` and `(1e90,1e90)`, JavaScript evaluates `xx*yy` as `Infinity`; the displayed correlation was incorrectly `0` rather than `1`. This is a **web implementation defect**, not a verified observation on Casio hardware.

## Fix

- Compute each weighted mean relative to an observed anchor and the maximum absolute offset. This avoids unnecessary cancellation and large unscaled weighted mean sums.
- Divide residual X and Y by their own maximum deviations before forming the weighted covariance and variance moments.
- Recover the dimensional slope using `B = (xy / xx) * (scaleY / scaleX)`; compute the correlation directly from scaled moments.
- Preserve existing `Math ERROR` on zero X variance and unrepresentable final A or B; preserve `r = null` for constant Y.
- The same helper is used for LIN and the transformed linear-fit modes (LOG, EXP, ABEXP, POWER, INV).
- The modular source and generated standalone contain identical STAT regression module text.

## Test evidence

Direct JavaScript execution of the committed module and committed test source passed **55 assertions**, covering enormous positive and negative correlations, ordinary data, frequency weights and skipped zero-frequency rows, zero variance and result range errors, logarithmic and inverse transformation regression, and a 100000-row input.

`calculator/reference/rea-108/test_linear_regression.js` is the native test entrypoint.

`.github/workflows/rea108-linear-regression.yml` runs the REA-108 test suite, previous REA-107 regression suite, JavaScript syntax checks and `python3 calculator/tools/build_standalone.py --check`.

## Limits

The in-session direct checks do not prove that GitHub Actions has completed, that browser key traces pass or that Casio physical hardware behaves identically. No broader quadratic-regression stability fix is claimed. Additional browser/hardware verification remains open.
