# REA-006 — LCD golden-frame regression

**Task:** Implement pixel-by-pixel LCD golden frame testing.

**Status:** Independent **web application** pixel regression tooling, NOT CASIO hardware pixel verification. Native LCD size has not been established by REA-002 and real REA-001 captures are missing.

## Workflow

`lcd_golden.py` launches Chromium, opens the **independent** `calculator/index.html`, presses physical web buttons, captures `#lcd` at intrinsic **768 × 248** output pixels, and records calculator mode, input, output, error, cursor/menu page and the HTML SHIFT/ALPHA/angle/Math annunciators. This is a project-defined raster (96×31 scaled 8×), **not a claim about the physical CASIO LCD**.

The pinned `web-golden.json` was first recorded as a **web-only baseline** on commit `de0774f5` (13 scenarios, 768 × 248 pixel RGB frames). It is not a CASIO hardware golden. It contains compressed raw RGB pixels, exact SHA-256 fingerprints, key sequences and semantic state for each approved scenario. During testing it is read as immutable input. **Do not regenerate and compare against the new output in the same verification step**, since that would mask regressions.

The scenarios cover: blank edit, editable cursor, arithmetic result, error, first and second MODE pages, STAT field prompt and multiple results, fraction result/conversion, SHIFT and ALPHA indicators, and history recall.

### Verify pinned snapshots

From repository root:

```sh
python3 -m pip install playwright==1.56.0 Pillow
python3 -m playwright install chromium
python3 calculator/reference/rea-006/lcd_golden.py \
  --out /tmp/rea006-test
```

A comparison run produces `captured.json`, `comparison.json`, `comparison.md`, and `*.diff.png` images for mismatched frames. It fails if a pixel differs, a key sequence changes, a semantic state changes, or a scenario goes missing. `--threshold N` accepts only channel deviations at or below N; the default is **0**.

To propose a **new** web baseline (e.g. after intentionally updating the LCD renderer), use `--capture-only`; it creates `web-golden.candidate.json` without overwriting the pinned baseline. Review visual changes and their semantic states, then explicitly promote the candidate to the committed `web-golden.json`. A separate CI bootstrap provisions the first pinned baseline if absent.

### Unit tests

```sh
python3 -m unittest discover -v -s calculator/reference/rea-006 -p 'test_*.py'
```

Synthetic-only tests verify one changed pixel triggers failure, tolerances, semantic state divergence, changed key sequences, missing scenarios and coverage.

### Github CI

`.github/workflows/rea006-lcd-golden.yml` uses Ubuntu 24.04 and a pinned browser package. It produces a candidate and compares it with the existing committed baseline. On **first run only** while no baseline exists, it tests the candidate against the captured image, then commits this initial **web-only** pinned baseline to main. Subsequent runs compare to the previously committed pixels and do **not** silently refresh snapshots.

### Limitations / REA acceptance gate

This is a web-calculator regression baseline, useful for preventing unintended changes. It is not native CASIO parity:

- Real CASIO pixels remain **unverified**, with no certified reference LCD geometry.
- Hardware-derived screenshots must be independently captured per REA-001, the active LCD rectangle calibrated per REA-002, and native/web crops aligned before a device-versus-browser comparison per REA-004.
- Do not treat any all-green web golden test as a certificate of CASIO model equivalence.

No proprietary firmware, key bitmap, or executable is included.
