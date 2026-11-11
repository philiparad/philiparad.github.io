# REA-120 — Safe inverse ratios in exponential and power STAT regression

## Reproduced defect

The web calculator computes inverse estimates for exponential and power regression models by forming the ratio `y/A`. That intermediate ratio can overflow to Infinity or underflow to zero even when the final inverse X is finite, valid and representable.

Examples:

| Model | A | B | Y | Old result | Expected X |
|---|---:|---:|---:|---|---|
| EXP | 1e-300 | 1 | 1e99 | Math ERROR | ≈ 918.731452 |
| EXP | 1e99 | 1 | 1e-300 | Math ERROR | ≈ -918.731452 |
| ABEXP | 1e-300 | e | 1e99 | Math ERROR | ≈ 918.731452 |
| POWER | 1e99 | 5 | 1e-300 | 0 | ≈ 1.584893192e-80 |

This concerns the independent educational calculator, not original CASIO firmware.

## Implementation

- Add `logPositiveRatio(y,A)`: it uses `Math.log(y/A)` when the ratio is positive and finite, preserving the established ordinary case. Otherwise it computes `Math.log(y)-Math.log(A)` without forming an unrepresentable intermediate ratio.
- Use the helper in EXP and ABEXP inverse regression.
- For POWER, retain the existing `Math.pow(y/A,1/B)` when the ratio is valid and finite; otherwise use `Math.exp(logPositiveRatio(y,A)/B)`.
- Preserve all domain/zero-parameter checks, calculator numeric result limits, other inverse modes, prediction behavior, and the q-method for quadratic roots.
- Synchronize the full updated `calculator/js/stat-regression.js` source verbatim into `calculator/fx991_fresh_standalone.html`.

## Verification

The current committed JavaScript source and all relevant native regression suite content passed direct in-session JavaScript execution:

| Suite | Assertions passed |
|---|---:|
| REA-120 inverse ratio stability | 50 |
| REA-119 scaled exponential/power predictions | 44 |
| REA-118 quadratic inverse discriminant | 100 |
| REA-117 LIN prediction | 176 |
| REA-116 QUAD prediction | 90 |
| REA-115 compensated STAT sums | 39 |
| REA-114 anchored regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 result-error isolation | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **840** |

The REA-120 test checks six extreme models, ordinary inverse cases, positive/negative exponents, invalid parameter/data inputs, correct out-of-range failure, and earlier regression prediction, fit, and root paths.

The GitHub Actions workflow `.github/workflows/rea120-inverse-ratios.yml` is committed to run JavaScript syntax checks, all 14 native Node suites, and the standalone consistency command `python3 calculator/tools/build_standalone.py --check`.

## Validation limits

- The direct JavaScript checks and exact-source standalone embedding check passed; GitHub Actions execution, the standalone build script, browser key interactions and comparison with physical CASIO hardware have **not** been independently verified.
- IEEE-754 precision limits still apply to coefficients, inputs and final results. This change specifically addresses intermediate ratio overflow/underflow; it is not a comprehensive numerical equivalence guarantee.

## Files changed

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-120/test_inverse_ratios.js`
- `calculator/reference/rea-120/README.md`
- `.github/workflows/rea120-inverse-ratios.yml`
