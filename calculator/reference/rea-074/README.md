# REA-074 — Exact radical and π results from expression provenance

**Implementation:** committed to the modular `calculator/index.html` calculator. **Status:** source-level mathematical regression passed; browser and real-CASIO reference comparison pending.

## Manufacturer documentation

- [Original fx-115ES / fx-991ES guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf) — Math format, exact radical and π-form result restrictions and conversion.
- [fx-570ES PLUS / fx-991ES PLUS guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570_991ES_PLUS_EN.pdf) — natural textbook output, S⇔D switching, radical/pi form display.

The source-based exact arithmetic below is a conservative educational implementation, **not** a verified clone of the manufacturer firmware's complete allowed-expression table, coefficient restrictions, or fixed LCD line breaking. The true device may convert some complex forms to decimals that this implementation displays symbolically. Real-device comparison remains necessary.

## Changes

- Added `js/exact-symbolic.js`: a small parser and rational-algebra evaluator with reduced BigInt coefficients, at most one irrational basis (`π` or `√d`), factoring of square factors, exact multiplication/division/conjugate denominators, finite integer exponents, and source-only identity reduction.
- Added direct result-format integration in `js/result-format.js`: exact symbols are offered only when MathIO natural output and Norm1/Norm2 allow them. The representation is checked against the independent numerical engine result before display.
- The `js/app.js` calculation path retains exact rational metadata after a radical expression cancels to a rational number (`sqrt(2)^2=2`, `sqrt(3)*sqrt(12)=6`) without inferring an unrelated fraction from floating-point coincidence.
- Integrated the new module in `calculator/index.html` ahead of `result-format.js`. Unsupported or complex irrational combinations return the numerical engine's decimal output; they are never approximated into fake surds or π multiples.
- `S⇔D` recomputes alternative display from source with the same exact provenance. `LineIO` and `Fix/Sci` retain decimal output.

## Covered examples

| Input | MathIO output | Notes |
| --- | --- | --- |
| `sqrt(8)/2` | `√2` | Reduced radical |
| `sqrt(2)+sqrt(2)` | `2√2` | Exact like-radical addition |
| `sqrt(2)*sqrt(3)` | `√6` | Radical product |
| `sqrt(3)/sqrt(2)` | `√6/2` | Rationalized denominator |
| `(1+sqrt(2))^2` | `3+2√2` | Exact binomial expansion |
| `sqrt(2)/(1+sqrt(2))` | `2-√2` | Quadratic conjugate |
| `pi/2+pi/3` | `5π/6` | Combined rational π coefficients |
| `2+pi/3` | `2+π/3` | Rational and π terms |
| `sqrt(2)^2` | `2` | Exact rational metadata |
| `sqrt(2)+sqrt(3)` | decimal | Two distinct radical bases currently unsupported |
| `pi*pi` | decimal | No π² output inference |
| `sin(30)` | decimal | No source-independent trig symbolic reconstruction |

### Important implementation constraints

Only a bounded source grammar is accepted: finite integer/decimal literals, plus/minus/times/division, parentheses, powers with bounded integer exponents, `sqrt(nonnegative integer)` and `pi`. Exact radicals are normalized only when the radicand is at most 1,000,000; rational numerator/denominator magnitude is bounded to 10^12 and generated display text to 22 characters. Expressions involving unsupported functions, inverse π or multiple different radical bases fail closed to decimal.

No numerical `rational(value)` approximation is used to manufacture symbolic identities. Internally the parser returns `null` for unsupported inputs; the independent mathematical engine remains responsible for normal function evaluation and domain errors.

## Run tests

From `calculator/`:

```sh
node tests/rea074-exact-symbolic.cjs
python reference/rea-074/test_exact_browser.py
```

- **136 mathematical source/result regression checks passed** in a JavaScript execution harness, including exact forms, non-inference of invalid identities, square roots 2–64 and π rational coefficients 1–24.
- The Playwright test enters expressions with calculator DOM keys or the documented `FreshCalculator.loadExpression` diagnostic API, checks all three profiles, `S⇔D` and MathIO/LineIO transitions. **Committed but not executed** in the GitHub connector execution session.
- The GitHub Actions workflow `.github/workflows/rea074-exact-symbolic.yml` runs both tests; its execution outcome has **not been inspected**.

## Remaining acceptance gaps

1. Manufacturer exact/decimal eligibility restrictions, mathematical answer length limits, mixed `a+b√c` and `a+bπ` output layouts and native glyphs must be calibrated against actual original/PLUS/C traces. A mathematically exact symbolic result is not automatically a hardware-compatible result.
2. Nested MathIO expression parsing beyond the bounded grammar, actual CASIO π fraction formatting, additional logarithmic/trigonometric exact identities and more than one independent irrational basis remain unsupported.
3. Full decimal precision behavior belongs to **REA-075**, and S⇔D restrictions and fraction/mixed display transitions belong to **REA-076**. This task adds their exact-radical provenance but does not claim those tasks completed.
4. Validate the CI Playwright run and review web-only REA-006 screenshots before updating any immutable golden baseline. The independent 96×31 logical LCD does not establish CASIO's true pixel geometry.
5. The standalone all-in-one calculator is intentionally not synchronized in this task; tracked in **REA-100**.

**No work on REA-075 was undertaken.**
