# REA-101 — Original fx-991ES STAT Distr P(t)

Issue: https://github.com/philiparad/philiparad.github.io/issues/55
Parent: REA-084 / issue #34

## Manufacturer reference

Original fx-991ES / fx-115ES User's Guide, printed **E-47–E-49**, including E-49 "Distr Sub-menu":
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

In original single-variable STAT, **SHIFT → 1 (STAT) → 7 (Distr) → 1 (P()** inserts the lower-tail standard-normal function:

`P(t) = Pr(Z ≤ t)`, for `Z` standard normal.

The menu is distinct from the PLUS C edition's separate DIST calculation mode. Original P(t) can be evaluated without a populated STAT data table; only the 1-VAR STAT calculation context is required.

## Source changes

- `calculator/js/math-engine.js`: recognize expression function `P(t)` and route to the existing, independently written `FreshStatNormal.calculate('P',t)`, enforcing `model='fx-991es'`, `mode='STAT'`, `statOriginalDistr=true` and exactly one argument. This also works in nested arithmetic and with `Ans`. Illegal contexts raise `Argument ERROR`.
- `calculator/js/app.js`: original STAT Distr's option 1 now inserts **`P(` into the normal editable calculator expression**, rather than creating a separate form prompt. This preserves source text, cursor editing and normal `=`/Ans behavior. It is available only in original 1-VAR STAT.
- The original model's **dedicated STAT equals-key handler** now passes the 1-VAR-only permission flag; without this, the new function would have been refused even after choosing the menu. The ordinary evaluation path also passes the flag when appropriate.
- The existing `calculator/js/stat-normal.js` already has an accurate signed-tail implementation for `P(t)`; no new numerical approximation was invented in this task. Q/R and normalization remain separate REA-102–104 tasks.
- `calculator/fx991_fresh_standalone.html` was regenerated with both changed JavaScript modules. The original, PLUS and PLUS C feature/evidence separation remains intact.

## Accuracy verification

`node calculator/tests/rea101-stat-normal-p.cjs`

**86 isolated JavaScript checks passed** against the committed source, including:
- `P(0)=0.5`.
- Standard reference values at `±1`, `±2`, `±3`, `±5`, `±8`, `-10`.
- `P(-10) ≈ 7.619853024 × 10^-24` (small tail without catastrophic cancellation).
- Lower-tail symmetry `P(t)+P(-t)≈1`.
- Browser engine expression input `P(Ans)`, arithmetic compositions, invalid arguments.
- Context isolation across three model profiles and COMP/STAT/CMPLX/TABLE.
- Source-level checks of the actual original STAT equals path.
- **Executable mocked menu action** confirming that selecting Distr 1 inserts `P(` into the editor and refuses PLUS C.

Browser key-driven smoke test is committed to:
`calculator/tests/rea101_browser_stat_p.py`

It specifies original model → MODE 3 → 1-VAR → SHIFT+1 → 7 → 1 → argument → `)` → `=`, and compares values between modular and standalone publications. This Playwright test has **not** been executed in a browser during this task, so no browser pass is claimed.

## Remaining before closure

1. Execute the committed Node.js suite directly in a repository checkout or CI.
2. Run Playwright browser script with Chromium and inspect LCD expression/result, error/cancel behavior, editing and Ans. Check model isolation on actual browser key traces.
3. Compare to physical original CASIO fx-991ES, including its genuine key sequence, LCD display precision, extreme negative tails, `P(Ans)` and errors.
4. Independently review and attach actual reference-device captures under REA-099. Manufacturer manual and mathematical reference values are **not** physical-device evidence.

REA-101 is implemented at source level but **not hardware verified**. Leave issue #55 open pending browser/native validation. Do not start REA-102.
