# REA-029 — Quotient/remainder, recurring decimals, and multi-statements

## Task / scope
The REA CSV requires the native-example quotient/remainder result, repeating-decimal notation, and sequential statements. This implementation is an independent educational approximation and does not represent CASIO firmware. Only REA-029 files are changed.

## Manufacturer references
- [CASIO remainder calculations](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/remainder_calculations.html): `5 ÷R 2` returns quotient 2 and remainder 1; **only quotient** is stored in Ans. In a larger expression the quotient is passed onward. Large or negative values may revert to ordinary division.
- [CASIO recurring decimals](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/recurring_decimal.html): input period up to 14 digits in Natural Display, optional Rdec setting, and S⇔D cycling among available fraction/recurring/ordinary-decimal results.
- [CASIO multi-statements](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/basic_calculations/multi_statements.html): `3+3:3×3` returns 6 then 9 when pressing = successively.

## New behavior
- `js/special-arithmetic.js` performs quotient/remainder transformations, exact recurring-decimal expansion to rational operands, recurring decimal detection using long division, and top-level colon statement splitting.
- In the web app: **ALPHA + FRAC** inserts `÷R`; **ALPHA + SQRT** enters a repeating-decimal period after a decimal point; **ALPHA + ENG** enters colon. The latter is an **educational web mapping** because the original keyboard template does not expose the manufacturer colon shortcut.
- Recurring period digits are displayed with a short bar in the structured-editor LCD and when a result is shown. Text/accessibility rendering uses unambiguous `0.(142857)` notation.
- Multi-statements preserve the source expression; each = press advances to the next expression and updates Ans. The LCD uses a small `D` cue for an intermediate result.
- Remainder results show `2, R=1`. Only the quotient updates Ans. S⇔D is disabled on a remainder-result display.
- A recurring rational with available representation cycles fraction → recurring → decimal → fraction with S⇔D when Rdec is ON; Rdec OFF retains the original two-form behavior.

## Validation / known gaps
```sh
node calculator/reference/rea-029/test_special.js
node calculator/reference/rea-028/test_sexagesimal.js
```
Official calculations are used as reference examples. Native LCD character positions, all rare error cases, huge-operand fallback thresholds, and every physical-key combination remain **unverified** pending actual device recordings. The web-only colon key combination may differ from the manufacturer key sequence. This task does **not** implement REA-030.
