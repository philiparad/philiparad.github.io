# REA-095 — All 40 metric conversion codes and manufacturer factors

Issue: https://github.com/philiparad/philiparad.github.io/issues/49

## Reference
- Original fx-991ES Appendix **#117**, printed pages 48–49, provides 40 commands and their formulas.
  https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_570ES.etc_Appendix_EN.pdf
- The original user's guide states that metric conversion formula data are based on **NIST Special Publication 811 (1995)** and the J/cal value is for **15 °C**.
  https://support.casio.com/pdf/004/fx-115ES_991ES_E.pdf
- Original Appendix examples **#118–#120** demonstrate SHIFT+8, 02 (5 cm→in), 22 (100 g→oz), and 38 (−31 °C→°F).

## Implemented
`calculator/js/metric-conversions.js` now uses the printed Appendix's **4.1858** J/cal factor instead of precomputing a rounded reciprocal as the pair's stored factor:
- 39: J→cal, divide by 4.1858
- 40: cal→J, multiply by 4.1858
- Conversion expression insertion preserves the original symbolic division/multiplication in each direction.

The pre-existing 01–38 factor order was matched against all Appendix #117 entries. The two Fahrenheit/Celsius conversions remain affine, not simple reciprocal factors. Existing PLUS precision overrides remain isolated from original-model factors.

## Test coverage
`node calculator/tests/rea095-metric-conversions.cjs`

**203 source-level checks passed in an isolated JavaScript harness**, including:
- All 20 paired conversions (01–40) and their forward/reverse labels for original, PLUS and PLUS C.
- Original rounded factors and explicit Celsius/Fahrenheit handling.
- Round-trip arithmetic and Appendix examples: 5 cm→in = 1.968503937..., 100 g→oz = 3.527396584..., −31 °C→°F = −23.8.
- Code 39/40 exact symbolic formula insertion.
- Conversion postfix operand parsing, including negative operands, parenthesized operands and Ans.
- Invalid model/code/key, overflow and two-digit editor backspace.
- Static controller source checks for SHIFT+8 routing, BASE-N/TABLE restrictions, AC cancellation, DEL correction, atomic expression replacement and cursor slicing.

### Scope limitations
These are JavaScript module and controller-source tests, **not** end-to-end rendered-browser or physical CASIO tests. They do not prove actual keyboard event sequences, display exponent precision, or original device ROM parity. The original 1995 NIST factor catalog is sourced directly from CASIO Appendix #117; PLUS/PLUS C precision profiles are not re-certified here.

## Remaining work before closing #49
1. Execute the committed suite from a native Node checkout or CI.
2. Browser DOM/key traces: enter values → SHIFT+8 → two-digit code → =, test each of 01–40, cancel/DEL and invalid codes.
3. Verify operand insertion in expressions with parentheses, Ans, and other operators from the live calculator UI.
4. Compare output and errors to original fx-991ES, PLUS and PLUS C hardware captures, including extreme magnitudes and temperature boundaries.

REA-096 has not been started.
