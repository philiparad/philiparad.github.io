# REA-117 — Cancellation-resistant linear regression predictions

## Reproduced defect

The web calculator previously evaluated the LIN-mode prediction `yHat = A+B*x` using ordinary binary64 multiplication and addition. When the product is large and almost cancels `A`, its rounding error can dominate the small final result.

For exactly representable inputs `A=3e16`, `B=-3`, `x=1e16+2`, the mathematically correct answer is **-6**, but the previous evaluator returned **-8**. Similar discrepancies occur with `B=-5` and `B=-7`.

This is a verified defect in the independent web simulator—not a measurement of genuine CASIO hardware.

## Implementation

- The `LIN` branch of `estimateY()` now uses the compensated double-double Horner polynomial evaluator already implemented and tested for `QUAD` in REA-116.
- The LIN invocation passes a zero quadratic coefficient, retaining the previous LIN and QUAD result shape and `finite()` output bounds.
- All other regression types, the fitting algorithms, and `estimateX()` are unchanged.
- The standalone HTML embeds the updated canonical `stat-regression.js` source verbatim.

## Verification

The new test suite exercises positive and negative slopes, multiple base magnitudes, rounding-dependent input offsets, ordinary linear expressions, zero slope and intercept, out-of-range errors, fitted regression, inverse estimation and REA-116 quadratic predictions.

In-session direct JavaScript execution against the committed source passed:

| Suite | Assertions |
|---|---:|
| REA-117 compensated LIN predictions | 176 |
| REA-116 compensated QUAD predictions | 90 |
| REA-115 compensated STAT sums | 39 |
| REA-114 anchored linear regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT precision | 25 |
| REA-111 result error isolation | 24 |
| REA-110 quadratic QR fitting | 53 |
| REA-109 quadratic inverse roots | 50 |
| REA-108 stable regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **646** |

`.github/workflows/rea117-linear-prediction.yml` adds a CI gate for JavaScript syntax, all 11 native Node test suites and the deterministic standalone builder check.

## Validation limits

The direct JavaScript tests and source-embedding check passed. GitHub Actions completion, the standalone build script's actual execution, browser physical-key interaction tests and comparison with genuine CASIO calculator hardware were **not independently verified**. Double-double arithmetic does not recover digits already lost when a coefficient or input number is first represented in binary64.
