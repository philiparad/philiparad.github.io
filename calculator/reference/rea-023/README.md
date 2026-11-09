# REA-023 — Calculation priority and expression interpretation

**Status:** Model-specific source precedence implemented and independently regression-tested. Physical-device equivalence is **not certified** until REA-001/004 hardware/emulator comparisons are available.

## Manufacturer documentation

CASIO's **fx-991ES PLUS C** "Calculation Priority Sequence" provides this order (higher to lower):
1. Parentheses and argument-taking functions.
2. Postfix operators (factorial and powers included), then fractions.
3. Prefix negative sign.
4. Multiplication with omitted ×.
5. Permutation/combination.
6. Explicit × and ÷.
7. Addition and subtraction.

Source: https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/sequence.html

## Changes

- `js/rational.js`, `js/decimal-core.js` and `js/math-engine.js` now assign omitted multiplication a higher binding priority than explicit ×/÷; nPr/nCr are between those priorities.
- Numeric adjacency such as `2..3`, `1 2` or `3.4.5` no longer produces invented implicit multiplication.
- Existing power, negative sign, factorial and parentheses rules are preserved.
- The standalone HTML contains synchronized copies of all three engines.

Examples: `6/2(1+2)` is interpreted as `6/[2×(1+2)] = 1`, whereas `6/2×3 = 9`. `-2^2 = -4`, `(-2)^2 = 4`, and `5nCr2 = 10`.

## Regression

```sh
node calculator/reference/rea-023/test_precedence.js
node calculator/reference/rea-021/test_decimal.js
node calculator/reference/rea-022/test_rational.js
```

The tests cover arithmetic precedence, exponent associativity, unary negative, factorial, permutations, combinations, implicit products, nested rational forms, trigonometry, syntax errors and old-task compatibility.

**Limitations:** These are source-code behavioral checks, not verified physical-key sequences. Some uncommon CASIO token combinations, stack limits and model-dependent display/error positioning are pending external-device evidence. REA-024 (error behavior/recovery) is intentionally not implemented here.
