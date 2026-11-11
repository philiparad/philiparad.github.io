# REA-105 — Decimal fast-path precedence and edition-specific arithmetic

Issue: https://github.com/philiparad/philiparad.github.io/issues/59
Priority: P1 — incorrect numerical results on original fx-991ES

## Manufacturer references (not device captures)

- **Original fx-991ES**, priority 8: multiplication, division and omitted-sign multiplication have *equal* precedence, left-to-right. Printed E-66: https://support.casio.com/pdf/004/fx-115ES_991ES_E.pdf
- **fx-991ES PLUS**, omitted-sign multiplication is priority 7, before `nPr`/`nCr` (8) and explicit `×`/`÷` (10): https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/sequence.html
- **fx-991ES PLUS C (2nd edition)**, the same distinct priority ordering: https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/sequence.html

The earlier REA-097 implementation correctly modeled the original fx-991ES in the general parser but mistakenly applied that model's precedence to PLUS and PLUS C. Meanwhile the decimal fast path incorrectly applied PLUS/C priority to original. **REA-105 fixes both discrepancies.**

## Changed files

1. `calculator/js/decimal-core.js`
   - `evaluate(expression, opts={})` now accepts calculator model context.
   - Original fx-991ES uses implicit multiplication priority 20, equal to explicit `*` and `/`.
   - PLUS/PLUS C use implicit priority 24, before `nPr` and explicit multiply/divide.
   - Adjacent numeric factors after parentheses, such as `(1+2)3`, are interpreted consistently with the general parser. This is simulator grammar consistency; **it is not proof that such literal entry sequences are accepted by every physical model**.
   - Existing exact decimal intermediates are retained for simple supported arithmetic.
2. `calculator/js/math-engine.js`
   - Explicitly passes `opts` into `FreshDecimal.evaluate(source,opts)`.
   - Uses the same model-specific implicit multiplication tier in the general Pratt expression parser.
   - Skips the optimizer for long operator/parenthesis sequences (>23 occurrences), so the general parser's numeric and command-stack guards cannot be bypassed by 25 unary prefixes or nested powers. This conservative fallback may use binary floating-point for very long arithmetic expressions; high-precision numerical behavior still requires additional hardware/reference comparison.
3. `calculator/js/rational.js`
   - The exact-rational optimizer was a **third arithmetic parser**, executed before the decimal/general engine by `app.js`.
   - It now applies the same original-versus-PLUS/C implicit multiplication priorities, accepts adjacent numeric factors after parentheses consistently, and defers long operator chains to the stack-limited general parser.
4. `calculator/js/app.js`
   - The controller explicitly supplies `model:state.model` to `FreshRational.evaluate`. Without this correction, `8/2(2+2)` could still display `1` on the original model despite both other engines returning `16`.
5. `calculator/tests/rea097-stack-precedence.cjs`
   - Corrected obsolete model-independent examples.
   - Added explicit original-vs-PLUS/C expectations; **109 isolated checks passed**.
6. `calculator/tests/rea105-decimal-precedence.cjs`
   - **348 isolated checks passed**, covering 29 arithmetic reference cases and their enabled/disabled-decimal comparisons across all 3 models, syntax and domain failures, stack errors, direct decimal mode handling, precision preservation, exact-rational backend parity (including Ans metadata), controller model-context forwarding, and source checks.
7. `calculator/tests/rea105_browser_precedence.py`
   - New Playwright script intended to exercise physical calculator buttons, both modular and standalone publications, three model profiles, MathIO and LineIO settings, `Ans`, and error recovery.
   - **Committed but not executed in Chromium in this session.**
8. `calculator/fx991_fresh_standalone.html`
   - Updated the two changed canonical JS modules, preserving original HTML, CSS, capability manifest and all 46 scripts in the same order as `index.html`.
9. `.github/workflows/rea100-standalone-sync.yml`
   - CI now includes both Node regression suites and REA-105 browser smoke test, in addition to byte-exact standalone release checks.

## Source-level examples

| Expression | Original fx-991ES | PLUS | PLUS C |
| --- | ---: | ---: | ---: |
| `8/2(2+2)` | 16 | 1 | 1 |
| `12/3(1+3)` | 16 | 1 | 1 |
| `18/3(2+1)` | 18 | 2 | 2 |
| `16/4(2+2)` | 16 | 1 | 1 |
| `6/3(1+1)` | 4 | 1 | 1 |
| `8/2*4` | 16 | 16 | 16 |
| `(1+2)3` | 9 | 9 | 9 |

## Reproducibility

From the repository root, run:

```bash
node calculator/tests/rea097-stack-precedence.cjs
node calculator/tests/rea105-decimal-precedence.cjs
python3 calculator/tools/build_standalone.py --check
python3 -m unittest discover -v -s calculator/tests -p 'test_rea100_standalone.py'
python3 calculator/tests/rea100_browser_parity.py
python3 calculator/tests/rea105_browser_precedence.py
```

The isolated JavaScript harness passed **109 REA-097 and 348 REA-105 regression assertions** after the implementation. A direct comparison of committed `index.html` against the generated standalone (after replacing embedded JS/CSS/manifest with their canonical references) passed; the four edited JS modules (`decimal-core.js`, `math-engine.js`, `rational.js`, `app.js`) were text-identical to their embedded source content. **Native Node, Python, Chromium and GitHub Actions results were not confirmed in this session.**

## Remaining before hardware parity / issue closure

1. Execute the committed Node tests with an actual Node installation and verify all Python/Playwright CI jobs pass.
2. Inspect actual browser key paths and LCD values in MathIO/LineIO, and verify no loss of `Ans` or error-cancel behavior.
3. Compare original and PLUS/PLUS C physical devices with authentic independently reviewed step-by-step LCD captures under REA-099. A mathematically plausible result or manufacturer priority table is not a hardware capture.
4. Review edge cases in input grammar (for example adjacent number after a closing parenthesis), very deep expressions and numerical accuracy when the conservative stack fallback bypasses the exact decimal fast path.

Task REA-105 source implementation is committed; physical hardware equivalence remains **unverified**. Do not begin REA-106 automatically.
