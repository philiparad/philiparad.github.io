# REA-076 — S⇔D, improper/mixed fraction, π and radical result transitions

**Status:** Source-level conversion fixes committed. **43 mathematical/source regression checks passed** in JavaScript execution; browser and physical CASIO acceptance are not yet verified.

## Official rules used

- [Original fx-991ES manual, “Using S-D Transformation” and fraction calculations, E-21 and E-40–E-41](https://support.casio.com/pdf/004/fx-115ES_991ES_E.pdf)
- [PLUS: “Toggling Calculation Results”](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/basic_calculations/toggling_calculation.html)
- [PLUS: “Fraction Calculations”](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/basic_calculations/fraction_calculations.html)
- [PLUS C manual: “Toggling Calculation Results,” recurring-decimal special case](https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf)

The manuals state that S⇔D toggles displayed fractional/decimal, π/decimal and radical/decimal results where eligible; SHIFT+S⇔D switches improper/mixed fractions. The mixed form must fit **ten displayed characters**, counting number parts and separators. LineIO can toggle exact decimal/fraction results but cannot convert a decimal into a radical or π form. PLUS C additionally supports model-specific recurring-decimal cycling when Rdec is enabled.

### Transition table (supported web behavior)

| Current output / setup | S⇔D | SHIFT+S⇔D |
| --- | --- | --- |
| MathIO exact improper fraction | Decimal (or PLUS C Rdec when enabled) | Mixed fraction, if ten-character fit |
| MathIO exact mixed fraction | Decimal (or PLUS C Rdec when enabled) | Improper fraction |
| Decimal from exact rational expression | Fraction if supported | No change |
| MathIO eligible π or √ result | Decimal | No change |
| Decimal after eligible MathIO π/√ conversion | Restore original eligible symbolic form | No change |
| Originally decimal-only irrational or unsupported result | No change | No change |
| LineIO rational result | Decimal ⇔ fraction | Improper ⇔ mixed when a fraction is shown |
| LineIO decimal irrational | No change | No change |
| MathIO result with mixed output exceeding ten characters | Decimal; no silent conversion to improper | No change |
| PLUS C fraction with Rdec ON | Recurring decimal → ordinary decimal → fraction (when supported) | Mixed/improper only when a fraction is shown |
| Non-result display, error screen or invalid conversion | No arithmetic-state change | No arithmetic-state change |

Note: the exact cycle of recurring-decimal outputs and firmware response to every eligible irrational expression still require genuine native captures. This table documents implemented **web-model behavior** and a subset of documented manufacturer restrictions, not complete hardware parity.

## Source changes

1. **`js/result-format.js`:** `forceFraction` for LineIO S⇔D no longer inadvertently activates source-based radical or π formatting. Exact symbolic results require actual natural MathO settings. Legacy standalone π detection now checks that the supplied numerical result agrees with π.
2. **`js/result-format.js`:** A mixed fraction whose integer/numerator/denominator/separator display exceeds ten characters is ineligible; the renderer falls back to decimal rather than silently substituting an improper fraction. This also guards SHIFT+S⇔D from an impossible mixed form.
3. **`js/app.js`:** Recurring-decimal S⇔D path is now explicitly restricted to the `fx-991es-plus-c` model. Existing `recurringDecimal` default on original and standard PLUS previously made these models cycle through PLUS C-only recurring outputs.
4. **Regression:** Unit checks for exact/symbolic/decimal cycles and model settings are in `calculator/tests/rea076-sd-conversions.cjs`. Browser key-sequence test across the three models: `calculator/reference/rea-076/test_sd_browser.py`.

## Reproduction

From `calculator/`:

```sh
node tests/rea076-sd-conversions.cjs
python reference/rea-076/test_sd_browser.py
```

The source suite passed **43 checks**, including 12 repeated S⇔D transition cycles, exact fractional/pi/radical inputs, negative and long mixed forms, LineIO exclusions, invalid symbolic inferences, and source guards against non-C recurring behavior. The Playwright test uses the real 50 DOM calculator key buttons, SETUP Rdec/MathIO/LineIO routes, S⇔D/SHIFT S⇔D and AC cancellation across all three models; it has **not yet been executed in this GitHub-connector session**.

GitHub Actions workflow: `.github/workflows/rea076-sd-conversions.yml`. Workflow creation is committed, but no passing browser run is claimed.

## Pending acceptance requirements

- Execute CI and check actual browser interactions and any differences in the REA-006 web-only pinned screenshots.
- Capture original, PLUS and PLUS C physical/emulator key/display traces of every conversion category, including mixed overflow, inverse-trig π expressions and PLUS C recurring decimals.
- Confirm model-specific output restrictions for π and surds. REA-074's conservative symbolic grammar remains limited; unsupported forms stay decimals. Do not infer that a mathematically exact form matches manufacturer eligibility.
- Verify performance/timing of S⇔D, native ten-character display width, automatic format choice on borderline expressions, and decimal initialization under mixed numeric/fraction source expressions.
- Standalone HTML synchronization remains tracked under REA-100.

No work was undertaken on REA-077.
