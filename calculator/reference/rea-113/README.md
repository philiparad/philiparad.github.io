# REA-113 — Weighted variance independent of rounded STAT mean

## Reproduced failure

For the exactly representable sample X = [10000000000000000, 10000000000000002], the simulator returned population sigma approximately **1.4142135623730951**, instead of **1**. The exact midpoint (10000000000000001) cannot be represented by an IEEE-754 double, so the previous approach rounded the reported mean to 10000000000000000 before calculating residual squares, distorting the variance. The correct standard deviation is representable and should not be lost.

This is a source defect in the independently developed simulator, not an observation from physical CASIO hardware.

## Implementation

- Keep original sum and squared-sum values for their explicitly selected STAT menu entries, subject to existing range guards.
- Anchor each weighted sample at the first observed value.
- Normalize individual offsets by their maximum absolute difference from that anchor and obtain the weighted offset mean from normalized values.
- Compute the population variance in those normalized coordinates, independently of rounding the displayed or internally stored mean.
- Rescale the square-root variance back to native units.
- Preserve sample sigma scaling by n/(n-1), frequency weights, zero-weight skips, REA-111 per-entry errors, and REA-112 full-precision Ans selection.
- Use the same shared 1-VAR routine for paired X and Y statistics.

## Validation

Direct execution of committed source and regression tests passed:

| Suite | Assertions |
|---|---:|
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 independent STAT menu errors | 24 |
| REA-110 weighted quadratic QR | 53 |
| REA-109 quadratic inverse roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **280** |

The standalone HTML contains the exact updated `calculator/js/stat-regression.js` source. The GitHub Actions workflow `.github/workflows/rea113-anchor-variance.yml` is configured to run all seven native suites, syntax checks and standalone build synchronization validation.

## Remaining limitations

Execution of the GitHub Actions workflow, actual browser key sequences, deterministic standalone build-script check, and physical-device comparison were not independently verified in this session. Values outside the representable IEEE-754 range and cases requiring exact rounding beyond double-precision still need separate numerical assessment. This fix does not certify physical CASIO parity.
