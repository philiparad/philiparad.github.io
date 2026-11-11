# REA-109 — Numerically stable quadratic inverse roots

## Source defect

The QUAD-mode `estimateX()` path in `calculator/js/stat-regression.js` previously evaluated both roots with the direct quadratic formula. When `B` is very large compared with the constant term, one numerator subtracts nearly equal floating-point values. For example:

- Fitted model coefficients: `A=1, B=1e90, C=1`.
- Target result: `Y=0`.
- Mathematically valid roots are approximately `-1e90` and `-1e-90`.
- The previous JavaScript implementation returned `0` for the small root due to catastrophic cancellation, even though its magnitude is representable.

This documents a defect in the independently written web calculator; it does not establish that a physical Casio device behaves the same way.

## Fix

For `C !== 0`, compute `d=B*B-4*C*(A-Y)`, `q=-0.5*(B+sign(B)*sqrt(d))`, then recover the roots as `q/C` and `(A-Y)/q`. Return them in the same ordering as the legacy formula, with a double-zero special case when `q=0`.

The previous `C=0` linear fallback, no-real-root check and final `finite()` guards remain intact. QUAD coefficient fitting and other regression modes are not modified.

## Validation

Direct JavaScript execution of the committed modular source and three committed regression suites completed successfully:

| Suite | Assertions |
|---|---:|
| REA-109 quadratic inverse stability | 52 |
| REA-108 linear regression stability | 55 |
| REA-107 paired STAT summary | 27 |
| **Total** | **134** |

The standalone calculator contains the exact same STAT regression module text as the modular source.

`.github/workflows/rea109-quadratic-roots.yml` is configured to run native Node regression suites, JavaScript syntax checks and `python3 calculator/tools/build_standalone.py --check`.

**Not independently verified in this session:** GitHub Actions completion, actual Chromium/browser physical-key traces, or comparison with an original, PLUS or PLUS C Casio calculator. The native assertions are source-level checks, not a hardware parity certificate.

## Files

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-109/test_quadratic_roots.js`
- `.github/workflows/rea109-quadratic-roots.yml`
