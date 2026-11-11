# REA-090 — MATRIX expression chaining and MatAns

## Scope and status
GitHub issue: https://github.com/philiparad/philiparad.github.io/issues/44

**Implemented and committed:** independent expression parser, MATRIX expression screen, symbol insertion menu, result chaining, scalar-result chaining, and regression suite.

**Not yet verified:** direct browser keyboard/DOM trace or physical CASIO behavior. The committed Node test could not run in a local checkout in this session because the runtime cannot retrieve GitHub files over the network. Its 105 checks passed in a JavaScript harness supplied with the retrieved repository modules.

## Supported expression syntax
- Named matrices: `MatA`, `MatB`, `MatC`, `MatAns`
- Matrix addition, subtraction, multiplication and scalar multiplication
- Parenthesized chaining, e.g. `MatA*(MatB+MatC)`
- `det(MatA)`, `Abs(MatA)`, `Trn(MatA)`
- Integer powers including `MatA^2`, `MatA^0` and inverse `MatA^-1`
- Reuse of `MatAns` in subsequent expressions

### Examples
Given MatA = [[1,2],[3,4]], MatB = [[5,6],[7,8]], MatC = identity:
- `MatA+MatB` = [[6,8],[10,12]]
- `MatA*MatB` = [[19,22],[43,50]]
- `MatA+MatB*MatC` = [[6,8],[10,12]]
- `Trn(MatA)` = [[1,3],[2,4]]
- `MatA^-1` = [[-2,1],[1.5,-0.5]]
- `det(MatA)` = -2
- After `MatA*MatB`, `MatAns+MatC` = [[20,22],[43,51]]

## User interaction
- MATRIX `SHIFT+4` opens the existing MATRIX menu, with an Expression option on its second page.
- The Expression screen accepts keypad digits, arithmetic operators, parentheses and power.
- Within Expression, `SHIFT+4` opens a symbol menu with MatA/B/C, MatAns, det(, Trn( and Abs(.
- `=` evaluates the full expression; successful matrix results replace MatAns, and successful scalar results display a scalar without overwriting MatAns.
- `AC` clears the entered expression, `DEL` edits it.
- Pressing an arithmetic operator on a displayed matrix starts a new expression using that viewed matrix name (including MatAns); scalar results can also be chained.

## Error handling and state
The evaluator performs tokenization, expression parsing and dimension validation before mutating MatAns/history. Failed calculations leave these stores unchanged.
- Dimension mismatch: `Dimension ERROR`
- Singular inverse: `Math ERROR`
- Incomplete/unsupported syntax: `Syntax ERROR`
- Unsupported exponent: `Argument ERROR`

## Validation
Run from repository root:
```bash
node calculator/tests/rea090-matrix-expressions.cjs
```
- 105 source-level assertions passed in an isolated JavaScript harness, including 3 model-profile repetitions.
- Source checks confirm controller routing, symbols, MatAns and scalar chaining.
- Neither a browser interaction suite nor physical device was exercised.
- Direct local Node execution attempted but source download failed due to DNS/network isolation; do not report a native Node pass.

## Open verification
1. Run the committed Node suite from a real checkout or CI.
2. Browser-driven `SHIFT+4 → Expression → SHIFT+4 → MatA → + → MatB → =`, AC cancel, DEL and post-result chaining.
3. Observe LCD matrix/result views, dimension-error recovery, and memory persistence across model changes.
4. Compare command flow, menu positions, dimensions and result display against original fx-991ES, PLUS and PLUS C hardware, not only source behavior.

Do not close issue #44 until browser and hardware parity evidence is collected. Do not start REA-091.
