# REA-097 — Original expression precedence and stack errors

Issue: https://github.com/philiparad/philiparad.github.io/issues/51

## Manufacturer baseline
Original CASIO fx-991ES manual, printed pages E-65–E-67 (PDF pages 66–68):
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The manual states:
- Power, factorial and postfix functions have priority over unary negative.
- nPr and nCr are evaluated before multiplication/division.
- Explicit multiplication/division and implicit adjacent-factor multiplication have **the same priority**, evaluated from left to right.
- The numeric stack has **10 levels** and command stack has **24 levels** in the original; CMPLX needs two numeric slots per value (five effective numeric levels).
- Exceeding either stack causes `Stack ERROR`; errors are editable through the normal cursor/error UI.

## Implementation changes
1. `calculator/js/math-engine.js`: implicit multiplication now has binding level 20 (equal to explicit × and ÷), not higher priority. Thus `8/2(2+2)` evaluates to `16`, not `1`.
2. Adjacent factors after a parenthesized group are supported, e.g. `(1+2)3`.
3. nPr/nCr binding remains higher than ×/÷ and lower than unary sign/powers.
4. Parser tracks live deferred numeric operands (budget 10) and nested commands (budget 24), and raises `Stack ERROR` when these budgets are exceeded. Unary signs, parenthesized expressions and function calls contribute command demand.
5. A 24-level nesting preflight runs **before** the optional exact-decimal optimizer, preventing its fast path from skipping the command-stack boundary.
6. `calculator/js/error-handling.js`: replaces the former arbitrary 40-parenthesis check with 24-command-depth validation and metadata for numeric budgets (COMP 10; CMPLX 5); unmatched closing parentheses cause `Syntax ERROR`.
7. `calculator/js/app.js`: passes the current mode to the stack preflight.

### Examples
| Expression | Result |
| --- | --- |
| `8/2(2+2)` | `16` |
| `8/(2(2+2))` | `1` |
| `-2^2` | `-4` |
| `(-2)^2` | `4` |
| `5nCr2` | `10` |
| `5nPr2` | `20` |
| `2^3^2` | `512` |

## Regression
File: `calculator/tests/rea097-stack-precedence.cjs`
Run: `node calculator/tests/rea097-stack-precedence.cjs`

**100 isolated JavaScript checks passed** against the fetched math engine, error-handler and app code, including:
- Three model profiles with arithmetic, unary sign, implicit multiplication, factorial, combinations/permutations and power precedence.
- Deep parentheses and unary/recursive expression stack limits.
- `Stack ERROR` classification, close-parenthesis syntax errors, source integration and error-path nonmutation.

## Verification limitations and follow-up
The parser budgets approximate the hardware's internal stack occupancy using deferred operands and active evaluation commands; **they are not a trace of proprietary CASIO ROM stack allocation**, and exact boundary equivalence for every mixed expression is not certified. The source-level checks do not establish browser key/input behavior. In particular:
1. Run the test file under Node.js in a real checkout or CI.
2. Run browser/DOM tests of implicit multiplication input, key-driven nPr/nCr, factorial, error cursor restoration and cancellation.
3. Compare physical device outputs and exact stack threshold cases for original, PLUS and PLUS C.
4. Test CMPLX's five-effective-slot behavior and MATRIX/VECTOR dedicated stack caps with device evidence. Current generic preflight advertises the CMPLX five-slot limit, but full complex/matrix/vector stack occupancy is **not implemented or hardware verified in this change**.
5. Audit decimal-fast-path handling of numeric stack occupancy beyond parentheses.

Issue #51 should remain open until these conditions are satisfied. REA-098 was not started.
