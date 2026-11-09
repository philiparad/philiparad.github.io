# REA-035 — GCD, LCM and integer functions

Scope: REA-035 only. Implement the native-key GCD, LCM, Int, and Intg mathematical functions in the independent educational web calculator.

## CASIO sources

* [Greatest Common Divisor (GCD) and Least Common Multiple (LCM)](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/gcd_lcm.html) — examples `GCD(28,35)=7`, `LCM(9,15)=45`.
* [Integer Part (Int) and Largest Integer Not Exceeding Input (Intg)](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/) — `Int(-3.5)=-3` versus `Intg(-3.5)=-4`.
* [Calculation ranges](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/calculation_ranges.html) — GCD accepts signed integer arguments with absolute values less than 10^10; LCM accepts nonnegative integer arguments less than 10^10.
* Key mapping: ALPHA+MUL → GCD; ALPHA+DIV → LCM; ALPHA+ADD → Int; ALPHA+SUB → Intg.

## Implementation

* `js/math-engine.js` validates integer operand domains, uses exact BigInt Euclidean GCD and BigInt LCM intermediates, converts the final LCM result to the 15-significant-digit calculator numerical representation, and emits Math ERROR for out-of-range operands.
* `Int(x)` truncates toward zero, whereas `Intg(x)` uses the mathematical floor. Both normalize negative zero.
* The function parser now recognizes uppercase manufacturer function labels as well as lowercase spellings; no existing function shortcuts are removed.
* `js/app.js` maps the four ALPHA key combinations without altering existing SHIFT functions or registers.
* Standalone HTML is synchronized with the modular code.

## Verification

```sh
node calculator/reference/rea-035/test_integer_functions.js
python3 calculator/reference/rea-035/test_browser.py
```

Playwright is optional and requires installed Chromium. Verification includes arithmetic, negative operands, upper bounds, nested expressions and calculator key sequences. Rare GCD(0,0) behavior is treated as Math ERROR for mathematical undefinedness rather than claiming a verified physical-device behavior. Exact firmware rounding and LCD equivalence remain unverified. REA-036 is not started.
