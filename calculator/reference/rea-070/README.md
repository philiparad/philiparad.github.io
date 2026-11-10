# REA-070 — Model-specific case and printed legend profiles

## Reference images

The front face of the original **fx-991ES** has a silver-gray case with lavender/purple side grips, dark violet numeric keys, purple SHIFT/ALPHA keys, pink AC/DEL, `NATURAL DISPLAY` branding and `TWO WAY POWER` at the top. The PLUS editions are dark and labeled `NATURAL-V.P.A.M.` and `2nd edition`.

- [CASIO original fx-991ES official product photograph](https://www.casio-intl.com/asia/en/calc/products/fx-991ES/)
- [CASIO fx-991ES PLUS official product listing](https://www.casio.com/intl/scientific-calculators/product.FX-991ESPLUS/)
- [fx-991ES PLUS C edition front photograph](https://www.uoftbookstore.com/Casio-Fx991Es-Scientific-Calculator)
- [CASIO original fx-115ES / fx-991ES manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf)
- [CASIO fx-570ES PLUS / fx-991ES PLUS manual](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf)
- [CASIO fx-991ES PLUS C manual](https://www.casioeducation.com/_files/ugd/3cfc42_7829a5fe35b144d181d5deb75f532ac6.pdf)

These images support the general case/edition appearance, **not** pixel-level geometric calibration. The reference imagery and the official manuals are external comparison resources; proprietary CASIO image assets are not embedded.

## Implementation

- `js/keypad.js`: `keysForModel(model)` merges explicit original, PLUS, and PLUS C legend exceptions onto the existing 50-key geometry. `applyModel(root,model)` changes visible SHIFT/ALPHA labels and button accessible names/titles in-place, without losing the existing key button event handlers. `mount(root,handler,model)` selects legends from the start. The modeled function labels reflect known edition differences; this is a **documented best-effort legend inventory**, not a manufacturer-published keycode matrix.
- `js/app.js`: model selection updates face `data-model`, `NATURAL DISPLAY` vs `NATURAL-V.P.A.M.`, `TWO WAY POWER` vs `2nd edition`, and printed key legends. The model switch retains the established calculator state reset semantics.
- `styles.css`: model-specific case coloring, buttons, screen trim and brand marks while preserving all original key target coordinates.

## Keyboard/legend examples

| Key | Original fx-991ES | PLUS 2nd edition | PLUS C 2nd edition |
| --- | --- | --- | --- |
| COS (ALPHA) | No `E` legend | `E` | `E` |
| TAN (ALPHA) | No `F` legend | `F` | `F` |
| Numeric 6 (SHIFT) | No `VERIFY` | No `VERIFY` | `VERIFY` |
| Decimal point (ALPHA) | No `RanInt` | `RanInt` | `RanInt` |

Other common primary legends and their layout remain shared where evidence currently supports no specific distinction. No claimed original physical scan codes or 1:1 geometry.

## Tests

Run from `calculator/`:

```sh
node tests/rea070-face-profiles.cjs
python reference/rea-070/test_model_face_browser.py
```

The Node/source regression checks 50 key IDs, stable hit target geometry, every known edition difference, model-specific colors, and proper controller integration. The Playwright browser test changes all three models, checks the DOM branding and accessible legends, and clicks a normal numeric key after switching.

**Residual acceptance gap:** exact geometry, all printed colors and legends, complete primary/SHIFT/ALPHA photographic parity, and model-specific physical-key placement still require calibrated front-on reference photographs or a physical CASIO/device emulator. This work must not be labeled hardware-verified.

**Other development tasks:** REA-071 is for actual mode/setup menu behavior; REA-081 is for key-combination functional dispatch, not this face styling task.
