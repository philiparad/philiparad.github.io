# REA-088 — BASE-N signed arithmetic and logical operator validation

## Status
Code correction committed, automated source-level tests pass. **Not a physical hardware parity certification.**

### Manufacturer reference
Original CASIO fx-115ES / fx-991ES User's Guide:
https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf

The manual's E-53 table defines binary as a signed 16-bit number system and decimal, octal and hexadecimal as signed 32-bit number systems. E-54/E-55 document:
- BASE menu page 1: 1 and, 2 or, 3 xor, 4 xnor, 5 Not(, 6 Neg(
- Negative nondecimal values use two's complement, while decimal values show a minus sign.
- The alternate-base input menu is the second page of SHIFT+3 (BASE).
- E-66/E-67 list operator priority: AND has priority 10; OR, XOR and XNOR share priority 11, all left-associative.

### Correction
`calculator/js/base-n.js` previously assigned a higher priority to XOR and XNOR than OR.
That diverged from the original manufacturer's priority table. The operators now share
one precedence level:
```js
op==='and'?15:op==='or'||op==='xor'||op==='xnor'?10:-1;
```
The underlying precedence-climbing parser uses `parse(prec+1)` for the RHS,
so operators on the same level associate left-to-right.

Example in decimal BASE-N:
- `1 or 1 xor 1` = `0`: `(1 or 1) xor 1`
- `1 or (1 xor 1)` = `1`
- `1 xor 2 and 0` = `1`: AND binds before XOR.

### Model tests
`node calculator/tests/rea088-base-sign-logic.cjs` — **216 checks passed in a JS source harness**, across
`fx-991es`, `fx-991es-plus`, and `fx-991es-plus-c` profiles.

Coverage:
1. AND/OR/XOR/XNOR/Not/Neg calculation results and precedence.
2. Binary edge literals 0x7FFF/0x8000/0xFFFF interpreted as 16-bit signed.
3. Octal, HEX, and decimal 32-bit signed maximum/minimum.
4. Two's-complement result presentation, negative decimal output and radix conversion.
5. Invalid digits, overflow and division-by-zero errors.
6. Integer division truncates toward zero.
7. Source checks for SHIFT+3 menu selection, six logical options, DEL, AC cancel, page navigation and ALT/SHIFT routing.
8. All three declared calculator model profiles.

### Verification limitations
- Source tests validate the JavaScript engine and static controller wiring, not complete LCD/DOM behavior.
- Real browser key-driven tests, including SHIFT/ALPHA transitions and AC cancellation, are not run.
- No direct physical fx-991ES, PLUS, or PLUS C reference capture has been made; actual hardware behavior and appearance remain unverified.
- The manufacturer table, rather than inferred simulated-device behavior, supports the precedence correction.
- Do not close [REA-088](https://github.com/philiparad/philiparad.github.io/issues/42) until required browser and hardware evidence is collected.

### Changes
- `calculator/js/base-n.js` — corrected logical precedence
- `calculator/tests/rea088-base-sign-logic.cjs` — independent 216-case verification suite
- `calculator/docs/rea088-base-sign-logic.md` — this report

Stop here. REA-089 has not been started.
