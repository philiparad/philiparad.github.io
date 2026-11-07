# REA-001 — Model-specific CASIO reference corpus

**Status: IN PROGRESS — NOT VERIFIED.** The first task in `CASIO_Fresh_REA_Tasks.csv` requires **at least 100 key sequences with actual emulator/device screenshots and observed output**. The manifest currently specifies **133** sequences, but contains **zero** real hardware captures. No compatibility claim should be made yet.

## Capturing real evidence

1. Use a licensed CASIO fx-991ES PLUS C 2nd edition Windows emulator or a physical device whose model and firmware are recorded. Reset and configure the mode/angle/display settings before each case.
2. Follow each manifest's `keys` sequence **one key at a time**. If a sequence is unsupported or requires different native keys, amend the manifest after observation; don't invent responses.
3. Save the initial LCD and a full-screen or LCD-region screenshot after every key to `captures/REF-001/step-000.png`, `step-001.png`, etc. Include menus, cursor, errors, intermediate displays and final result.
4. Populate `capture.source_device`, `capture.emulator_version` where applicable, `capture.capture_date`, `capture.observed_states` (one record per screenshot with `step`, `key`, `lcd_text`, `screenshot`), and `capture.observed_result` or `capture.observed_error`.
5. Run: `python3 calculator/reference/rea-001/validate.py calculator/reference/rea-001/manifest.json`. To fail until the first task is genuinely finished, add `--require-complete`.

**Important:** Hypothetical mathematical results in the manifest are not verified CASIO results and must never be used as device evidence. The app's 96 × 31 raster is not evidence of native LCD resolution.

## Acceptance

- 100+ explicitly specified sequences: **yes, 133 cases**.
- Device/emulator metadata, authentic initial and per-key screenshots, and actual observed outputs for 100+ cases: **not yet**.
- Only after the validator reports 100+ complete sequences and a human has reviewed model accuracy may REA-001 be marked complete.

This folder is separate from the web application's runtime and has no React or Node.js dependencies.
