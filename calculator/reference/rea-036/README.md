# REA-036 — Ran#, RanInt#, Rnd and reproducible numerical tests

**Scope:** REA-036 only from CASIO_Fresh_REA_Tasks.csv. No REA-037 work.

## Acceptance requirements

- Ran# generates a three-digit decimal random value from 0.000 through 0.999, including a reduced fraction presentation in Natural Display.
- RanInt#(a,b) generates an integer with both endpoints inclusive, validates `a < b`, signed integer endpoint magnitudes `< 10^10` and `b−a < 10^10`.
- Rnd(x) rounds its **internal numeric result** according to setup: Fix uses decimal places; Sci uses significant digits; Norm 1/2 uses 10 significant digits. It differs from display-only rounding.
- Deterministic tests inject a random number generator, without claiming the real CASIO's PRNG algorithm is known.

## Sources

- [Official CASIO Ran# documentation](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/random_number.html)
- [Official CASIO RanInt# documentation](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/function_calculations/random_integer.html)
- [Official CASIO Rnd documentation](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf), Rounding Function section
- [Official input ranges](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/technical_informatoin/calculation_ranges.html)

## Implementation

* `calculator/js/math-engine.js`: `Ran#`/legacy `Ran`/legacy `rand` are lazily evaluated, with **one** random source sample on each execution, and reduced to 3 decimal places. RanInt# uses strict documented integer/range validation and inclusive endpoints. A separate `createSeededRandom(seed)` xorshift32 generator and an optional `evaluate(expression,{random:fn})` source permit repeatable test sequences. Seeded sequences are not claimed to reproduce actual CASIO sequences.
* `Rnd` uses the current Fix/Sci/Norm setup and the existing formatter's decimal rounding; it changes internal result and therefore Ans. `Rnd(10/3)*3` at Fix 3 produces `9.999`, not `10.000`.
* `calculator/js/app.js`: SHIFT+DOT inserts Ran#, ALPHA+DOT inserts RanInt#(, and SHIFT+0 inserts Rnd(. A standalone Ran# Natural Display result is represented with a reduced exact fraction, while its Ans holds the decimal random value.
* `calculator/fx991_fresh_standalone.html` mirrors modular changes.

## Test commands

```sh
node calculator/reference/rea-036/test_random_rounding.js
python3 calculator/reference/rea-036/test_browser.py
```

The browser script needs Playwright and Chromium; in-memory controller tests, numeric assertions and prior REA-021–REA-035 regressions are separately checked. Hardware PRNG sequence, exact physical LCD geometry, and device firmware rounding are not certified.
