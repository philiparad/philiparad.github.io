# REA-118 — Compensated quadratic inverse discriminant

## Reproduced defect

The independent calculator's QUAD inverse estimation used `d = B*B-4*C*(A-y)`. Because the terms were rounded separately, it sometimes lost the entire difference between two large nearly equal values.

For `A=1e16`, `B=-2e8`, `C=1` and `y=1`, the equation `(x-1e8)^2=1` has distinct roots `99999999` and `100000001`. Previously, `estimateX()` returned `[100000000, 100000000]`, treating the small positive discriminant as zero. The same issue appears for higher offsets.

This is a verified defect in the independent simulator, not evidence about a genuine CASIO calculator.

## Implementation

- Reuse the double-double addition and product machinery introduced in REA-116 and REA-117, now lifted to shared `ddAdd`, `ddProduct`, and `ddTimes` functions.
- Evaluate `A-y` without discarding its low-order residual.
- Compute `B² - 4C(A-y)` using compensated operations, retaining the residual of large-term cancellation.
- Keep REA-109's stable `q`-based root formula, root ordering, repeated-root cases, C=0 fallback, and `finite()` output checks.
- Preserve all other regression estimation and fitting modes.
- Synchronize the canonical module in `calculator/fx991_fresh_standalone.html`.

## Validation

Direct JavaScript execution of the committed source and test suites passed:

| Test suite | Assertions |
|---|---:|
| REA-118 inverse discriminant | 100 |
| REA-117 LIN predictions | 176 |
| REA-116 QUAD predictions | 90 |
| REA-115 compensated sums | 39 |
| REA-114 anchored LIN regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 per-value errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 quadratic inverse roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired STAT | 28 |
| **Total** | **746** |

The new tests cover nearby distinct roots at different offsets, repeated roots, no-real-root errors, extreme coefficients, weighted fits, and the prior compensated prediction behavior.

The standalone HTML has been checked to contain the exact full canonical STAT module. A GitHub Actions workflow in `.github/workflows/rea118-quadratic-discriminant.yml` is configured for JavaScript syntax checks, all 12 test suites, and `python3 calculator/tools/build_standalone.py --check`.

## Validation limits

- GitHub Actions execution, standalone build-script execution, browser physical-key interaction, and real CASIO comparison were not independently verified in this session.
- IEEE-754 representation still limits coefficient and input precision. This fix retains more arithmetic residuals but cannot recover digits lost during original input rounding.
- Correct source-level tests do not establish firmware or hardware equivalence.
