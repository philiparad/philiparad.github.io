# REA-110 — Stable weighted quadratic regression

## Source defect

The independent calculator's QUAD regression previously solved weighted normal equations using a hard-coded `1e-13` Gaussian pivot threshold. This rejected mathematically valid datasets with uneven spacing, such as `(0,0)`, `(1e-7,1e-14)`, `(1,1)`, which lie on `y=x²`. The previous implementation returned `Math ERROR`; a nearby `1e-6` case yielded inaccurate coefficients.

## Implementation

- Replace quadratic normal equations with a centered, scaled weighted three-column least-squares solver.
- Perform two passes of modified Gram–Schmidt orthogonalization on columns `1`, `u`, and `u²`.
- Check rank against machine precision relative to original column magnitude instead of using the old fixed absolute threshold.
- Scale the dependent values and recover the original `A, B, C` coefficients; enforce the existing finite result bounds.
- Preserve frequency weights and skip zero-frequency entries through the existing observation filter.
- Remove the no-longer-used `gaussian3` helper.
- Preserve linear regression and the REA-109 inverse-quadratic roots code.

## Validation

Direct JavaScript execution of the committed source and tests passed:

| Suite | Assertions |
|---|---:|
| REA-110 weighted QR regression | 53 |
| REA-109 inverse quadratic compatibility | 50 |
| REA-108 stable linear regression | 55 |
| REA-107 paired summary compatibility | 27 |
| **Total** | **185** |

The REA-109 compatibility test was adjusted **only** to accept a floating-point residual around zero in fitted coefficients, using `abs(coefficient) < 1e-12` instead of demanding an exactly-zero fit. Its direct inverse-root expectations remain unchanged.

The same regression module is embedded verbatim in the standalone HTML. The GitHub Actions workflow `.github/workflows/rea110-quadratic-qr.yml` checks source/test syntax, executes the four native suites, and runs the standalone consistency check.

## Remaining limitations

- GitHub Actions completion and browser physical-key traces were not verified in this session.
- True physical CASIO behavior is not established. This corrects the independent implementation, not a verified hardware fault.
- Numerically ill-conditioned datasets can still lose accuracy below IEEE-754 double precision; rank-deficient datasets correctly produce `Math ERROR`.
- Large offsets that require coefficient cancellation, and extreme physical-device-specific numerical behavior, may require additional independent validation.

## Modified files

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-110/test_quadratic_qr.js`
- `calculator/reference/rea-109/test_quadratic_roots.js`
- `.github/workflows/rea110-quadratic-qr.yml`
