# REA-116 — Cancellation-resistant quadratic yHat prediction

## Reproduced defect

The simulator previously evaluated QUAD estimates with the direct floating-point expression `A+B*x+C*x*x`. This is numerically unstable when large terms nearly cancel.

For exactly representable coefficients `A=1e16, B=-2e8, C=1`, the polynomial is `(x-1e8)^2`. At `x=1e8+1`, the mathematically exact value is **1**, but JavaScript's previous evaluation returned **0**. At `A=1e20, B=-2e10, C=1`, a positive square was sometimes reported as **-16384**.

These defects arise in the independently developed web calculator; physical Casio behavior was not tested.

## Implementation

- Introduce a specialized double-double precision quadratic evaluator in `calculator/js/stat-regression.js`.
- Use error-free transformations (TwoSum and Dekker TwoProduct) and Horner's polynomial form to preserve low-order cancellation terms.
- Keep the public `estimateY()` API and its existing range checks unchanged. Only the `QUAD` branch uses the compensated evaluator; the other regression models and all `estimateX()` paths are unchanged.
- Synchronize the full canonical STAT module into `calculator/fx991_fresh_standalone.html`.

## Verification

Direct JavaScript execution of the committed source and regression suites passed:

| Suite | Assertions |
|---|---:|
| REA-116 compensated quadratic prediction | 90 |
| REA-115 compensated sums | 39 |
| REA-114 linear anchor | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 independent STAT result errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 quadratic inverse roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **470** |

The REA-116 test covers multiple cancellation scales and signs, standard coefficients, zero terms, tiny nonzero outputs, error handling, fitted QUAD output and inverse-root compatibility.

The standalone HTML contains the exact updated `stat-regression.js` module source. The workflow `.github/workflows/rea116-quadratic-prediction.yml` configures syntax checks, all ten native suites, and `python3 calculator/tools/build_standalone.py --check`.

## Limitations

- Actual GitHub Actions runs, the standalone builder execution, browser physical-key traces and original/PLUS/PLUS C hardware parity have **not been independently checked** in this session.
- Double-double arithmetic improves rounding of polynomial evaluation but cannot recover coefficient digits already lost at input or fitting time, nor guarantee exact results for all floating-point cases.
- The correction does not change QUAD fitting or inversion and should not be interpreted as physical CASIO firmware equivalence.
