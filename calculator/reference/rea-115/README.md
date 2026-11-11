# REA-115 — Compensated STAT aggregation and cancellation-safe mean

## Reproduced source defect

The simulator's STAT aggregation previously used ordinary JavaScript floating-point addition, which can discard small observations when they are added between very large positive and negative values.

For X = [1e90, 1, -1e90], the correct sum is **1**, but the previous implementation reported **0**. Simply reordering the same data to [1e90, -1e90, 1] previously returned the correct result, indicating an order-dependent numerical defect. The mean was similarly lost, although the correct result is 1/3.

This issue concerns the independent web calculator; it is **not** a verified fault in physical CASIO hardware.

## Implementation

- Add reusable **Neumaier compensated summation** over weighted STAT observations.
- Apply it to 1-VAR Sum X and Sum X² and paired Sum X, Sum Y, Sum XY, Sum X³, Sum X²Y and Sum X⁴ (through the existing common weighted sum helper).
- Compute displayed 1-VAR and paired means using compensated Sum X / n and Sum Y / n instead of the anchor-relative absolute-mean reconstruction, which could lose representable small means through cancellation.
- Retain REA-113's **separately anchored and normalized variance computation**, so rounding the mean does not corrupt standard deviations for [1e16,1e16+2].
- Preserve existing FREQ weights, zero-frequency skips, result limits, per-item Math ERROR, and full-precision Ans behavior.
- Synchronize `calculator/fx991_fresh_standalone.html` to embed the exact updated `calculator/js/stat-regression.js` source.

## Test evidence

Native test code and current modular source were executed directly in a JavaScript harness:

| Test suite | Assertions passed |
|---|---:|
| REA-115 compensated sums | 39 |
| REA-114 anchor-centered regression | 61 |
| REA-113 anchored variance | 45 |
| REA-112 STAT Ans precision | 25 |
| REA-111 per-value STAT errors | 24 |
| REA-110 quadratic QR | 53 |
| REA-109 quadratic roots | 50 |
| REA-108 linear regression | 55 |
| REA-107 paired statistics | 28 |
| **Total** | **380** |

The REA-115 tests cover changing observation order, weighted cancellation, paired sums, large cross products, out-of-range results, anchored variance, conventional small data, and a 100000-observation case.

The workflow `.github/workflows/rea115-compensated-sums.yml` configures Node test execution, JavaScript syntax checks and `python3 calculator/tools/build_standalone.py --check`.

## Verification limits

- GitHub Actions execution, standalone builder execution, browser/DOM key traces and physical CASIO comparisons **have not been independently completed** in this authoring session.
- Although compensation substantially improves order stability, IEEE-754 numerical limits still apply. Aggregates genuinely exceeding the supported result range retain the existing Math ERROR semantics.
- The regression test harness uses committed JavaScript source and a test substitute for Node imports; CI will execute the native Node files.

## Relevant files

- `calculator/js/stat-regression.js`
- `calculator/fx991_fresh_standalone.html`
- `calculator/reference/rea-115/test_compensated_sums.js`
- `calculator/reference/rea-115/README.md`
- `.github/workflows/rea115-compensated-sums.yml`
