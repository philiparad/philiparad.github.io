# REA-122 — Compensated logarithmic regression predictions

## Reproduced defect

The independent STAT simulator evaluated logarithmic regression predictions with the ordinary floating-point expression `A+B*Math.log(x)`. When the product is large and nearly cancels A, rounding the multiplication before the addition can eliminate a small valid result.

With representable inputs `A=-6931471805599453`, `B=1e16`, and `x=2`, the old simulator returned exactly **0**. Compensated multiplication of the represented `Math.log(2)` and B, followed by A, gives approximately **-0.1377323601700482**. Other values of x exhibit the same loss of low-order precision.

This issue concerns the independently developed web calculator; the behavior of actual CASIO hardware has not been verified.

## Implementation

- Replace the LOG branch of `estimateY()` with `quadraticPrediction(A,B,0,Math.log(x))`, reusing the double-double Horner evaluator already used for LIN and QUAD predictions.
- Preserve the preexisting `x>0` domain condition, `finite()` result range limits, model coefficients and public API.
- Keep all other regression models, fitted coefficients and inverse-estimate behavior unchanged.
- Synchronize `calculator/fx991_fresh_standalone.html` so it embeds the exact canonical `calculator/js/stat-regression.js` source.

## Regression checks

Direct in-session JavaScript execution of committed source and tests passed:

| Suite | Assertions |
|---|---:|
| REA-122 compensated LOG predictions | 72 |
| REA-121 inverse model predictions | 78 |
| REA-120 inverse ratios | 50 |
| REA-119 scaled predictions | 44 |
| REA-118 quadratic discriminant | 100 |
| REA-117 linear predictions | 176 |
| REA-116 quadratic predictions | 90 |
| REA-115 compensated sums | 39 |
| REA-114 anchored regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT result precision | 25 |
| REA-111 result-specific errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **990** |

The new tests include cancellation residuals at several positive x values and opposing coefficient signs, ordinary LOG predictions, zero coefficients, invalid x values and range errors, fitted LOG regression, inverse LOG, and compensated LIN/QUAD compatibility.

`.github/workflows/rea122-log-prediction.yml` configures syntax checks, all 16 native Node suites and the `python3 calculator/tools/build_standalone.py --check` consistency check.

## Verification limits

- The direct JavaScript regression checks and standalone source comparison passed.
- GitHub Actions execution, the standalone build-script command itself, browser key interactions and comparison against real CASIO hardware were **not independently confirmed** in this session.
- The compensated evaluator improves arithmetic with the already represented inputs and logarithm; it cannot recover rounding errors introduced by JavaScript's transcendental function or by originally entering numbers as IEEE-754 values.

## Files changed

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-122/test_log_prediction.js`
- `calculator/reference/rea-122/README.md`
- `.github/workflows/rea122-log-prediction.yml`
