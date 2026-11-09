# REA-030 — Prime factorization (FACT)

Implementation for the independent CASIO-inspired calculator, targeting the fx-991ES PLUS C (2nd edition).

## Manufacturer evidence
Official CASIO documentation: https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/factrization.html

- In COMP mode, after displaying a **positive integer result** with no more than ten digits, press SHIFT + °′″ (FACT).
- Example: `1014 → 2×3×13²`.
- Example: `4104676 → 2²×(1026169)`; the unfactored remainder is enclosed in parentheses because its prime factors exceed three digits.
- Negative, fractional, decimal and ÷R results cannot be factored. These cases produce Math ERROR when factorization is requested (÷R is documented as unavailable).
- =, SHIFT+FACT, ENG and °′″ exit factorization display. Relevant setup display and angle changes also exit it.

## Implementation
- `js/factorization.js` uses bounded integer division, explicitly factoring prime factors up to 997, and leaves a larger unfactored remainder in parentheses. This avoids costly unbounded trial division on ten-digit integers.
- FACT is mapped to SHIFT+DMS (the °′″ key) and labelled accordingly.
- Factorization is a **display transformation**, not a new calculation. Stored Ans, raw numerical value and expression are not modified.
- The LCD supports squared and cubed superscript glyphs in the factorized result. Longer expressions remain horizontally scrollable.
- Modular and standalone HTML are updated consistently.

## Tests
```bash
node calculator/reference/rea-030/test_factorization.js
node calculator/reference/rea-029/test_special.js
```
The new tests cover manual examples, integer boundaries, forbidden domains, numeric reconstruction, key mapping and LCD rasterization. Other prior regression suites also run as part of the development gate.

## Limitations
Actual hardware screenshots, precise spacing and cursor behavior are not certified. The web calculator uses a 96×31 project LCD grid, not a proven hardware pixel map. The browser-level UI was exercised in a simulated DOM rather than Chromium. Hardware equivalence must be checked using authenticated reference captures. No work is included on REA-031.
