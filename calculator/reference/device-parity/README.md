# Three-model CASIO physical-reference parity program

**Models:** original fx-991ES; fx-991ES PLUS (2nd edition); fx-991ES PLUS C (2nd edition). The existing independent simulator has distinct profile IDs, keypad legends, register limits, mode menus and edition-gated features. Three full-size launch links and a side-by-side interactive lab now make those profiles separately accessible.

## Start the three versions

From a local HTTP server rooted at `calculator/`:

```bash
python3 -m http.server 8080 --directory calculator
```

- Original: `http://localhost:8080/index.html?model=fx-991es`
- PLUS: `http://localhost:8080/index.html?model=fx-991es-plus`
- PLUS C: `http://localhost:8080/index.html?model=fx-991es-plus-c`
- Comparison and browser verification: `http://localhost:8080/parity-lab.html`

These are **three independently configured editions of the shared educational engine**, not three proprietary CASIO ROMs. They are separate selectable versions, not claims of internally unrelated codebases.

## Manufacturer evidence by version

| Version | Manual | Verified differences in profile |
|---|---|---|
| fx-991ES (original) | [CASIO fx-115ES/fx-991ES User's Guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-115ES_991ES_EN.pdf) | Eight base modes; A–D, X, Y, M storage; original STAT normal P/Q/R and t commands; no native C-only modes |
| fx-991ES PLUS 2nd edition | [CASIO fx-570ES PLUS/fx-991ES PLUS 2nd edition guide](https://www.casio.com/content/dam/casio/global/support/manuals/calculators/pdf/004-en/f/fx-570ESPLUS_991ESPLUS_EN.pdf) | Eight base modes; expanded E/F registers; RanInt |
| fx-991ES PLUS C 2nd edition | [CASIO PLUS C 2nd edition online guide](https://support.casio.com/global/en/calc/manual/fx-115ESPLUS_991ESPLUSC_en/calculation_calculator/calculation_modes.html) | Extra INEQ, VERIF and DIST modes; recurring decimal, PreAns, two-function TABLE |

Manual illustrations may be approximate. Manual agreement is **reference-grounded behavior**, not an actual observed device trace.

## Uploaded CASIO ZIP analysis

The user-supplied `CASIO(1).zip` contained 41 entries (~17.1 MB compressed). These included:

- `fx-991ES PLUS C 2nd edition Emulator.exe` — Windows installer, SHA-256 `d7c2e646046d50b2d4156c80da8b170f33556358cd868d6da60e64194c0d479f`.
- `EmulatorUsersGuide.pdf` — multilingual guide, SHA-256 `ade854a69c7b602055d1ff40661cbae91a54abb32fe81889a17b87086c5c2643`.
- `Activation.pdf`, `ActivationFx.dll`, `fxESPLUS2_P16.dll`, `SimU8.dll` and other Windows dependencies plus a supplied license item, localization files and EULA.

**Discoveries from English guide (EN-1 to EN-4):** mouse-clickable calculator buttons; F1/F2 modifier shortcuts; F3/Home for MODE; F4 for power; Enter for =; Delete/Backspace; arrow navigation; zoomable pop-up LCD; clipboard screen capture (Ctrl+C or Ctrl+Insert); configurable capture frame and zoom; a KeyLog window with select-all/copy functionality. The emulator's speed may differ from hardware. These behaviors were compared with the web app's existing model switch, captured LCD/key log and keyboard shortcuts. They are **emulator features, not automatically evidence of physical hardware timing**.

**Important:** The ZIP describes the **PLUS C 2nd edition**. It does not independently establish original fx-991ES or standard PLUS behavior. The Windows software was **not executed** in this session. Its proprietary executable/DLLs, screenshots and license were **not copied into GitHub**. The user should run the legally obtained emulator locally on a compatible Windows computer under its license and record its own authorized observations.

## Additional manual-driven correction: C-only math functions

Comparing the three editions' **function calculation** tables exposed one measurable implementation gap: the original fx-991ES and standard fx-991ES PLUS manuals do **not** list GCD, LCM, Int, Intg or Π finite-product commands, whereas the PLUS C 2nd edition guide explicitly describes them. Previously, the common expression engine accepted those commands for all three model selections.

The updated `js/math-engine.js` rejects these commands in the original and non-C PLUS profiles while accepting the documented functions in PLUS C. `js/model-profiles.js` now declares those edition-specific capabilities. The standalone calculator embeds the same updated source. `test_edition_gates.cjs` confirms the original/PLUS rejection, PLUS C results, and support matrix.

The expression engine's model-unspecified programmatic API retains its legacy behavior so internal mathematical utilities outside the physical model selector remain compatible. The gating change represents a **manual-grounded compatibility correction**, not yet a captured native calculator key sequence.

## Source-based mathematical verification

`test_scientific_features.cjs` covers arithmetic and precedence, parentheses, powers, roots, trigonometry in DEG/RAD/GRAD, logarithms and exponentials, factorial/combinations/permutations, invalid domains, original-vs-PLUS RanInt gating, finite sums, numerical calculus and SOLVE, matrix equations, rectangular/polar conversions, complex arithmetic, standard-normal P/Q/R, weighted STAT and regression predictions.

`test_model_contract.cjs` checks three model IDs, 50 keys, available modes, register lists, PLUS C mode-page additions and manifest integrity.

These tests **validate web source**; even hundreds of successful assertions do not by themselves establish device parity.

Run with Node 22:

```bash
node calculator/reference/device-parity/test_model_contract.cjs
node calculator/reference/device-parity/test_scientific_features.cjs
node calculator/reference/device-parity/test_edition_gates.cjs
python3 -m unittest discover -s calculator/reference/device-parity -p 'test_evidence.py' -v
python3 calculator/tools/build_standalone.py --check
```

The existing REA-107–122 regression suites remain covered by `.github/workflows/rea-release-verification.yml`.

## Executed browser verification — 162/162 passed

GitHub Actions has executed the Python/Playwright suite on all three simulator profiles, not just configured it. The current manifest has **57 test descriptions**, corresponding to **162 model-specific browser executions**. The completed workflow stores hashed LCD screenshots, per-key before/after KeyLog JSON and the run's `report.json` and `verified.json` as an artifact. The recorded browser and screenshot data are genuine automated web output, **not physical-device captures**. The optional comparison lab and raw evidence are described below.

## Physical-key/browser and screen evidence

Install Playwright and Chromium:

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
python3 calculator/reference/device-parity/run_browser.py
```

The suite serves the actual modular `index.html` over local HTTP, loads each edition afresh, clicks physical-style buttons, verifies the expected state and mode menus, captures actual **web-only LCD PNGs** and records SHA-256 hashes, full input key sequences, failures and linked manufacturer-guide areas in `browser-evidence/report.json`. Browser data is evidence of the **web simulator**, not native hardware.

Open `parity-lab.html` for the three-model comparison and interactive browser-only tests. Its exported report does not contain screenshot hashes and is therefore never eligible for the stricter native parity verifier.

## Native evidence workflow (human review required)

1. Run the applicable genuine CASIO hardware or appropriately licensed manufacturer emulator, matching the **exact model edition**.
2. Press the **identical key sequence** shown in the browser report; record the original LCD screen and key log. Do not create a native reference by cropping the web emulator's screenshot.
3. Copy `native-evidence-template.json` to `private-native-evidence.json`. Replace placeholder origin, model, scenario, key log, original screenshot path/hash, review name/date and result/LCD/key-behavior comparisons. Use `physical_device` only for real hardware, `licensed_emulator` for authorized emulator.
4. Independently review corresponding browser and native images, displayed text, numerical rounding, errors and key/menu transitions. Set the three match flags to true **only after review**.
5. Execute:

```bash
python3 calculator/reference/device-parity/verify_evidence.py \
  calculator/reference/device-parity/browser-evidence/report.json \
  --native calculator/reference/device-parity/private-native-evidence.json \
  --output calculator/reference/device-parity/browser-evidence/verified.json
```

Use `--require-complete` to fail when any browser scenario lacks checked native parity evidence. The verifier checks source provenance, screenshot hashes, model/scenario identity, key logs, and explicit human sign-off. It does **not** automatically determine pixel identity or authenticate a photograph. A licensed-emulator-reviewed case is kept distinct from a physical-device-reviewed case.

## LCD bitmap comparison for supplied native screenshots

After recording a properly licensed reference source and its exact LCD crop, run the optional grayscale difference tool:

```bash
python3 -m pip install Pillow
python3 calculator/reference/device-parity/compare_lcd.py \
  calculator/reference/device-parity/browser-evidence/fx-991es-plus-c-arithmetic-precedence.png \
  calculator/reference/device-parity/private-native/reference.png \
  --native-crop 30,20,480,155 \
  --diff casio-lcd-diff.png --json casio-lcd-review.json
```

Replace the `--native-crop` values with the **measured actual LCD rectangle** from your reference image; do not reuse this illustration blindly. The utility segments each image to the simulator's independent 96×31 logical raster, tries ±2 pixels of alignment, and reports mismatched pixels with a red difference mask. It also includes screenshot hashes and notes about low contrast.

**Limitations:** Neither the default raster nor the threshold segmentation is certified against CASIO's actual LCD dot matrix. The quantitative mismatch helps a person spot differences; it is not an automatic fidelity score or physical parity certificate. Native provenance, key sequence and result review must still pass `verify_evidence.py`. No authentic native screenshot was present in the uploaded ZIP, so no real visual comparisons were possible in this session.

Unit tests use deliberately synthetic images to check translation, cropping, identical and different glyphs. Run:

```bash
python3 -m unittest discover -s calculator/reference/device-parity -p 'test_lcd_compare.py' -v
```

## Acceptance matrix and remaining work

| Level | What constitutes success | What it **doesn't** prove |
|---|---|---|
| Source validation | Math/model tests and standalone build pass | Browser behavior or hardware fidelity |
| Browser validation | All model keyflow scenarios pass and LCD PNGs are recorded | Manufacturer's exact original pixels |
| Licensed-emulator review | Authentic emulator screenshot + trace, signed side-by-side review | Physical calculator timing or construction |
| Physical-device review | Real device capture + trace and signed comparison | Unexamined modes/edge cases |
| Full model claim | All relevant feature categories and edge cases reviewed against the same model; residual differences declared | Blanket CASIO ROM equivalence |

**Executed browser verification (2026-11-12):** [GitHub Actions run 43148006611](https://github.com/philiparad/philiparad.github.io/actions/runs/43148006611) passed **162/162 model-specific Chromium scenarios** (53 original, 53 PLUS, 56 PLUS C). The downloaded artifact contains **162 actual browser LCD PNGs and 162 real app KeyLogs**, all corresponding SHA-256 hashes and requested-vs-recorded key sequences checked. Manual-derived Fix/Sci/Norm outputs were also verified via real browser keys; standalone build/source consistency passed. See [EXECUTED_REVIEW_2026-11-12.md](EXECUTED_REVIEW_2026-11-12.md) and [STATUS.md](STATUS.md). Outstanding: capture a comparable *authentic* manufacturer emulator or physical reference for all three editions; calibrate LCD pixels, battery/power timing, complex/radical formatting and model-dependent error precision; expand browser cases into the full feature matrix. **Real hardware parity remains unverified.** The earlier REA issues remain open until their acceptance criteria are satisfied.
