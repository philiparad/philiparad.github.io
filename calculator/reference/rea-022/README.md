# REA-022 — Exact rational computation and reduction

**Implementation status:** Exact rational arithmetic is implemented for numeric calculator expressions and compatible Ans / PreAns chains. **CASIO hardware equivalence remains unverified**, pending authentic reference captures under REA-001.

## Architecture

- `calculator/js/rational.js` uses reduced BigInt numerator/denominator pairs. Supports parentheses, unary signs, decimal literals, +, −, ×, ÷, integer powers, implicit multiplication, and Ans/PreAns variables.
- No continued-fraction guessing is used for an expression with a known exact result.
- `calculator/js/app.js` retains an exact result alongside the ordinary numeric Ans. It passes exact rational metadata into result formatting, and carries rational Ans/PreAns values across consecutive calculations.
- `calculator/js/result-format.js` renders exact improper or mixed fractions, while preserving decimal toggle behavior. Large ratios use decimal-string metadata instead of rounding through Number.
- The legacy scientific function path remains in place for non-rational input, such as trigonometric functions and noninteger powers.
- Both modular and standalone HTML builds include the same rational module and controller.

## Deterministic verification

```sh
node calculator/reference/rea-022/test_rational.js
```

The source tests exercise fraction reduction, deeply nested rational operations, signs, rational exponentiation, decimal literals, Ans/PreAns, mixed/improper formatting, S⇔D presentation metadata, zero division, malformed input, and representative REA-021/scientific regressions. Initial isolated execution passed 18 cross-module checks; further Node verification is recommended in CI.

## Boundaries

- To avoid unbounded memory growth, exact rational operands are capped at 300 decimal digits per reduced numerator/denominator; unsupported or overflowed inputs use the existing numeric engine.
- Not all functions are exact: transcendental functions, roots, statistics, matrix results, and numeric mode operations remain approximations or outside this task.
- The 15-digit decimal operation path from REA-021 is separate. Rational results convert to Number only for numeric Ans compatibility; exact numerator/denominator are separately stored.
- Model-specific LCD appearance, key timing, fraction length limits, and manufacturer acceptance require reference-backed differential testing.
