# REA-119 — Prevent intermediate overflow/underflow in regression predictions

## Reproduced defect

In the independent calculator's STAT regression module, `estimateY()` previously multiplied an amplitude by an exponential or power computed separately. That intermediate factor can be Infinity or zero even when the final product is finite and within the calculator's supported numerical range.

Examples with valid finite coefficient/input values:

| Regression | A | B | X | Previous outcome | Correct outcome |
|---|---:|---:|---:|---|---|
| EXP, A·e^(B·X) | 1e-300 | 1 | 800 | Math ERROR | ≈2.726374572e47 |
| EXP, A·e^(B·X) | 1e99 | -1 | 800 | 0 | ≈3.667874584e-249 |
| ABEXP, A·B^X | 1e-300 | e | 800 | Math ERROR | ≈2.726374572e47 |
| POWER, A·X^B | 1e-300 | 4 | 1e90 | Math ERROR | 1e60 |

These cases concern the web simulator. No physical CASIO hardware behavior is asserted.

## Implementation

- Introduce `scaledFactor(A,factor,logFactor)` to use the existing direct calculation in ordinary cases, preserving normal rounding as far as possible.
- When a factor's intermediate computation leads to an infinite or incorrectly zero product, combine the amplitude and factor in logarithmic form, including the sign of A.
- Apply the fallback to `EXP`, `ABEXP` with positive base, and `POWER` with the existing positive-X domain check.
- Preserve zero amplitudes, negative-base ABEXP direct behavior, supported result range checks, fitting algorithms, and other regression predictions/inversions.
- Synchronize `calculator/fx991_fresh_standalone.html` with the exact canonical STAT module.

## Verification

Direct JavaScript execution of committed source passed the following suites:

| Suite | Assertions |
|---|---:|
| REA-119 scaled regression predictions | 44 |
| REA-118 compensated discriminant | 100 |
| REA-117 LIN prediction | 176 |
| REA-116 QUAD prediction | 90 |
| REA-115 STAT compensated sums | 39 |
| REA-114 anchored LIN regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT precision | 25 |
| REA-111 per-value result errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 inverse roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **790** |

The REA-119 tests cover positive/negative amplitudes, large and tiny representable outputs, ordinary predictions, zero amplitudes, negative-base ABEXP values, existing domain/range checks, other regression types, and fitted exponential models.

The GitHub Actions workflow `.github/workflows/rea119-scaled-predictions.yml` is committed to run JavaScript syntax checks, all 13 native Node test suites, and `python3 calculator/tools/build_standalone.py --check`.

## Validation limits

The tests were executed in a direct JavaScript harness, not confirmed through GitHub Actions. GitHub Actions execution, the standalone generator check, browser/DOM key interaction, and real CASIO hardware comparison remain unverified. The log-domain fallback cannot recover input coefficient digits already lost to IEEE-754 rounding.
