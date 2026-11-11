# REA-121 — Compensated inverse-regression predictions

## Reproduced defect

The independent web calculator previously evaluated an inverse regression model as `yHat = A + B/x`. For large `A` and `B/x` that nearly cancel, binary64 division rounded the quotient before the final addition, destroying a valid small residual.

Examples with exactly representable parameters:

| A | B | X | Previous result | Correct result |
|---|---:|---:|---:|---:|
| -3333333333333333 | 1e16 | 3 | 0.5 | 1/3 |
| -3333333333333333.5 | 1e16 | 3 | 0 | -1/6 |
| -3333333333333334 | 1e16 | 3 | -0.5 | -2/3 |

The defect is in the standalone simulator; behavior on physical CASIO hardware was not established.

## Implementation

- Replace the `INV` prediction expression with the mathematically equivalent `(A*x+B)/x` evaluated using the double-double product and addition helpers introduced in REA-116–118.
- Specifically, preserve low-order multiplication residuals in `A*x`, compensate the addition of `B`, then divide the combined numerator by `x`.
- Preserve `x=0` rejection, final numeric bounds, other STAT regression predictions, and the separate inverse-X path.
- Synchronize the full canonical `calculator/js/stat-regression.js` source verbatim into `calculator/fx991_fresh_standalone.html`.

## Test evidence

Committed source and test-suite content were executed directly in a JavaScript harness. All suites passed:

| Suite | Assertions |
|---|---:|
| REA-121 inverse-model prediction | 78 |
| REA-120 inverse ratio stability | 50 |
| REA-119 exponential/power scaling | 44 |
| REA-118 quadratic discriminant | 100 |
| REA-117 linear prediction | 176 |
| REA-116 quadratic prediction | 90 |
| REA-115 compensated sums | 39 |
| REA-114 anchored linear fit | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 per-result errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 inverse quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **918** |

REA-121 tests cover cancellation with positive and negative signs, ordinary and zero-coefficient models, very small inputs, overflow errors, regression fitting, inverse-X compatibility, and prior LIN/QUAD compensated predictions.

The GitHub Actions workflow `.github/workflows/rea121-inverse-prediction.yml` is committed to run JavaScript syntax checks, all 15 native test suites, and `python3 calculator/tools/build_standalone.py --check`.

## Validation limits

Direct source-based JavaScript tests and verbatim standalone source comparison passed. GitHub Actions execution, standalone builder execution, browser key interaction, and comparisons with physical CASIO hardware were **not independently verified**. Double-double compensation improves certain cancellation cases but does not provide arbitrary-precision or guarantee firmware equivalence.
