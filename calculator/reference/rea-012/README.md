# REA-012 — Model-specific CASIO SETUP menu

**Status:** Menu hierarchy, key sequences, state persistence and supported mode effects implemented. Exact manufacturer LCD pixel graphics, real firmware timing and contrast rendering remain **unverified**.

## Verified menu structure from CASIO manuals

Official documentation:
- [fx-991ES PLUS C (2nd edition): calculator setup](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/configuring_calculator.html).
- [fx-991ES PLUS: calculator setup](https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/calculation_calculator/configuring_calculator.html).
- [CASIO PLUS C contrast sequence](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/before_using_calculator/getting_started.html).
- [Original fx-991ES guide](https://support.casio.com/pdf/004/fx-115ES_991ES_Eng.pdf).

**SHIFT MODE** opens SETUP. Use **DOWN/UP** to switch between the two full menu pages, and press the number shown on the LCD. These are not the separate calculation MODE menu pages. The first page is shared by all three supported profiles:

```text
1:MthIO    2:LineIO
3:Deg      4:Rad
5:Gra      6:Fix
7:Sci      8:Norm
```

The second page depends on the chosen physical model:

| Original / standard PLUS | PLUS C second edition |
|---|---|
| 1:ab/c, 2:d/c | 1:ab/c, 2:d/c |
| 3:CMPLX, 4:STAT | 3:CMPLX, 4:STAT |
| 5:Disp, 6:CONT | 5:TABLE, 6:Rdec |
| | 7:Disp, 8:CONT |

### Exact number-key workflows implemented

| Keys after SETUP | Result |
|---|---|
| 1, 1 | MthIO-MathO — natural input and result |
| 1, 2 | MthIO-LineO — natural input, linear result |
| 2 | LineIO — linear input and result |
| 3 / 4 / 5 | DEG / RAD / GRAD |
| 6, n | FIX n decimal places (n = 0–9) |
| 7, n | SCI n significant-digit setting (n = 0–9) |
| 8, 1 / 8, 2 | Norm1 / Norm2 |
| DOWN, 1 / DOWN, 2 | Mixed / improper fraction |
| DOWN, 3, 1 / DOWN, 3, 2 | Complex rectangular / polar result selection |
| DOWN, 4, 1 / DOWN, 4, 2 | STAT frequency ON / OFF |
| DOWN, 5, 1 / DOWN, 5, 2 (PLUS C) | TABLE f(x) / f(x) and g(x) |
| DOWN, 6, 1 / DOWN, 6, 2 (PLUS C) | Recurring-decimal mode ON / OFF (setting stored) |
| DOWN, 7, 1 / DOWN, 7, 2 (PLUS C) | Decimal separator Dot / Comma |
| DOWN, 8 (PLUS C), then LEFT/RIGHT, AC | CONTRAST screen; adjust stored level with arrows, exit with AC (hardware visual fidelity unverified) |

On original or standard PLUS, Disp is second-page item 5 and CONT is item 6.

## Effects in the independent calculator

- Default setup reset uses CASIO-documented MthIO-MathO, DEG, Norm1, improper fraction, rectangular complex format, STAT FREQ OFF, TABLE two functions (where supported), Rdec ON, decimal dot.
- MthIO-MathO/LineO and LineIO change the independent calculator's expression and result rendering; STAT, BASE-N, MATRIX and VECTOR automatically use linear presentation without overwriting the saved MathIO preference.
- STAT FREQ ON creates an editable frequency input and computes repeated-observation statistics; OFF omits that input.
- TABLE f(x)/f(x),g(x) changes the editable expression count. Complex display switches rectangular/polar result text.
- Decimal dot/comma is applied to result formatting; original keypresses continue to use a dot in numeric input.
- Contrast adjustment follows the official LEFT/RIGHT then AC key sequence, and the recurring-decimal switch is stored, but **physical LCD electro-optical contrast and true repeating-decimal overbar rendering are not implemented**. These capabilities are not claimed as fully equivalent.
- SHIFT 9 (CLR) → Setup now restores all documented settings together.

## Code and verification

- `calculator/js/setup.js`: model profile pages, nested numbered choices, documented reset defaults.
- `calculator/js/app.js`: LCD-only selection logic and mode effects.
- `calculator/js/display.js`: renders two-column eight-item SETUP pages, distinct from the six-item calculation-mode menus.
- `calculator/js/result-format.js`: differentiates natural input from natural output.
- `calculator/reference/rea-012/test_setup_browser.py`: uses **physical DOM calculator buttons** to inspect complete menu pages, nested menus, settings, and mode effects in both modular and standalone builds.
- CI: `.github/workflows/rea012-setup.yml`. Legacy browser tests for REA-010/011 are updated to the new official SETUP key sequences.

This remains an **independent educational implementation**, not a byte-for-byte replica of proprietary CASIO firmware. The unfinished manufacturer reference capture (REA-001), native LCD measurement (REA-002), and native differential runs (REA-004) are required before claiming device-exact SETUP screen behavior.
