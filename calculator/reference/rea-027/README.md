# REA-027 — Exponent entry and engineering notation

## Acceptance criteria (task CSV)

* **EXP** enters a valid scientific `×10^` exponent token, with a separately editable exponent field.
* **ENG** and **SHIFT+ENG** change the engineering display exponent in multiples of three.
* Expression serialization, editing cursor/viewport, result presentation, stored Ans, and the modular/standalone builds remain consistent.

## Official reference

CASIO fx-991ES PLUS C *User's Guide*, "Using Engineering Notation", demonstrates:
* `1234 =` → `1234`, `ENG` → `1.234×10^3`, `ENG` → `1234×10^0`.
* `123 =` → `123`, `SHIFT ENG` → `0.123×10^3`, `SHIFT ENG` → `0.000123×10^6`.

Official manual: https://support.casio.com/pdf/004/fx-115_991ES_PLUS_C_E.pdf (engineering examples; see printed page E-11).

## Changes

* The **EXP** key now creates a structured `exp10` node in Natural Display; it renders as `×10` with raised editable exponent and serializes as a numeric scientific `E` literal. The ALPHA+EXP constant `e` and SHIFT+EXP `π` remain separate.
* Input with an empty exponent produces a syntax error. Editing with RIGHT exits the exponent field; DEL and cursor movement continue using existing structured-editor behavior.
* The display layout/viewport measures the real width/height of the exponent node, avoiding the previous one-character `e` placeholder.
* ENG normalizes the result at a power of 1000. Repeated ENG decreases the displayed exponent by three; SHIFT+ENG increases it by three, including from an original result.
* Engineering mantissas display ordinary decimal digits (no nested `e` notation); very long outputs remain horizontally scrollable. Calculator Ans and the raw value are unchanged.
* No next-task DMS changes have been made.

## Tests

```sh
node calculator/reference/rea-027/test_scientific.js
python3 calculator/reference/rea-027/test_browser.py
```

The browser test requires optional Playwright/Chromium. Source-module and simulated-controller assertions were exercised during development; manufacturer native captures and physical-key timing are not verified. This is independent educational code, not device ROM.
