# REA-114 — Linear regression centered without rounded absolute means

## Reproduced bug

For paired values `X=[1e16,1e16+2]`, `Y=[0,2]`, the true regression line is `y=x-1e16`, with **A=-1e16**, **B=1**, **r=1**. The prior independent simulator returned `B=0.5` and `r≈0.7071067811865475`. Both input X values are exactly representable; the mathematical midpoint `1e16+1` is not. The REA-108 implementation rounded the absolute mean before calculating X residuals, biasing weighted covariance and variance.

This is a defect in the educational web simulator, not a claim about actual CASIO firmware.

## Implementation

- Anchor each X and Y at its first observed value.
- Normalize observation offsets by the maximum absolute span in each dimension before computing weighted mean offsets.
- Compute weighted centered deviations directly in normalized coordinates, retaining sub-ULP offsets that are lost when forming an absolute mean.
- Derive the slope from normalized covariance and variance and restore units with `spanY/spanX`.
- Derive intercept from the anchor and normalized mean offsets instead of subtracting two separately rounded absolute means.
- Preserve the prior error for zero X variation, bounded final A/B, constant-Y null correlation, FREQ weights, skipped zero-frequency values, negative slopes, original regression transform modes and shared STAT results.
- Update `calculator/fx991_fresh_standalone.html` to embed the exact new regression module.

## Validation

Direct JavaScript execution of the committed source and all eight native regression suites passed:

| Suite | Assertions |
|---|---:|
| REA-114 anchor-centered linear regression | 61 |
| REA-113 anchor-relative variance | 45 |
| REA-112 precision-preserving STAT Ans | 25 |
| REA-111 per-result STAT errors | 24 |
| REA-110 weighted quadratic QR | 53 |
| REA-109 quadratic inverse roots | 50 |
| REA-108 scaled linear regression | 55 |
| REA-107 paired STAT | 28 |
| **Total** | **341** |

The standalone HTML was source-compared with the complete updated `calculator/js/stat-regression.js` module, which is embedded verbatim.

`.github/workflows/rea114-linear-anchor.yml` runs all eight Node test suites, JavaScript syntax checks, and `python3 calculator/tools/build_standalone.py --check` on relevant changes.

## Limitations

- GitHub Actions execution and the actual standalone build-script check were **not** independently confirmed in this session.
- Browser/DOM physical-key tests and comparison with genuine CASIO hardware were not executed.
- IEEE-754 double precision remains a limitation. Fixing this one regression defect does not establish that all extreme numerical cases or manufacturer-specific rounding are equivalent to original hardware.

## Changed files

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-114/test_linear_anchor.js`
- `calculator/reference/rea-114/README.md`
- `.github/workflows/rea114-linear-anchor.yml`
