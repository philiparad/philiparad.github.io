# REA-101 — Original fx-991ES STAT P(t), normal lower-tail probability

GitHub issue: https://github.com/philiparad/philiparad.github.io/issues/55
Parent: REA-084, issue #34.

## Status

**Original-model STAT → 7 Distr → 1 P(** was already present in the application from REA-084. REA-101 corrects P(t)'s extreme negative tail precision, verifies original-only routing, and adds independent numeric/source tests and a key-driven browser test.

All new code and tests were committed. **73/73 isolated JavaScript unit/source checks passed.** GitHub Actions native Node, Playwright execution and actual CASIO-device captures have not yet been observed. Keep issue #55 open until that evidence is available.

## Manufacturer baseline

Original CASIO fx-115ES/fx-991ES User's Guide, printed pages E-48–49, PDF pages 49–50:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

- Select MODE → STAT → 1-VAR, then SHIFT → 1 (STAT) → 7 (Distr) → 1 (P).
- P(t) is the area under the **standard-normal probability density from −infinity to t**.
- Other original Distr commands Q(t), R(t) and normalized t are separate tasks REA-102–104.
- The original STAT distribution submenu is **not the same as PLUS C's C-only DIST calculation mode**.
- The graphical shaded-region definition, not an invented firmware algorithm, is the reference.

## Implementation

Module: `calculator/js/stat-normal.js`.

Added `lowerTail(t)` and used it consistently for `calculate('P',t)` and the `probabilities(t).P` API.

- P(0) = 0.5 exactly.
- For |t| less than 4, the existing numerical integration estimates the area.
- For |t| at least 4, the Gaussian Mills-ratio continued fraction computes the tiny tail directly, avoiding catastrophic cancellation in `0.5 - area(|t|)`.
- Negative values return the tiny tail directly; positive values return 1 minus the tail.
- Very large magnitudes saturate to 0 or 1 within JavaScript double precision. Nonfinite/out-of-range inputs still throw `Math ERROR`.

Representative values:

| t | P(t) |
| ---: | ---: |
| −12 | 1.77648211207768 × 10⁻³³ |
| −10 | 7.61985302416047 × 10⁻²⁴ |
| −8 | 6.22096057427178 × 10⁻¹⁶ |
| −6 | 9.86587645037698 × 10⁻¹⁰ |
| −4 | 0.0000316712418331199 |
| −2 | 0.0227501319481792 |
| −1 | 0.158655253931457 |
| 0 | 0.5 |
| 1 | 0.841344746068543 |
| 2 | 0.977249868051821 |
| 4 | 0.999968328758167 |

These are mathematical CDF reference results, **not physical CASIO LCD captures**.

### Controller and models

The existing original-model controller, `calculator/js/app.js`, already provides:
- Physical menu path `STAT → 7 Distr → 1 P(`, restricted to original `fx-991es` and unpaired 1-VAR statistics.
- Numeric formula input through the LCD prompt.
- Result output retaining `P(expression)` and updating Ans **only after successful validation**.
- AC cancellation and error feedback without committing a wrong Ans.
- Clear separation from C-only `DIST`.

The existing source path was audited and is now explicitly covered by regression tests. It was not reimplemented unnecessarily.

### Standalone publication

`calculator/fx991_fresh_standalone.html` has been updated with the exact new `stat-normal.js` content, preserving REA-100's synchronized modular/standalone architecture. Direct source comparison passed.

## Tests

```bash
node calculator/tests/rea101-original-stat-p.cjs
python3 calculator/tools/build_standalone.py --check
python calculator/tests/rea101_original_stat_p_browser.py
```

- `calculator/tests/rea101-original-stat-p.cjs`: 73 checks passed in an isolated JavaScript harness, including 16 mathematical reference points, symmetry/monotonicity, domain/error behavior, original-only menu routing, Ans result handling and three model profiles.
- `calculator/tests/rea101_original_stat_p_browser.py`: committed Playwright test for modular and standalone pages, physical button clicks, original P(0), P(−8), cancellation and Math ERROR, plus original-vs-PLUS menu separation. **Not yet executed in Chromium**.
- `.github/workflows/rea101-original-stat-p.yml`: Node, Python generator check and Chromium automation on relevant commits. Workflow success **not yet confirmed**.

## Outstanding acceptance evidence

1. Run the committed native Node tests and Playwright tests successfully.
2. Capture actual fx-991ES keypad steps and LCD frames for P(0), P(±1), large |t|, error and cancellation.
3. Independently verify the precision/display format and compare each frame against the simulator's pinned commit, following REA-099's evidence policy.
4. Verify that the menu and P(t) behavior do not leak to PLUS and PLUS C hardware; the C-only DIST mode is separate.

There are **no claimed physical CASIO captures** in this task. REA-102 was not started.
