# REA-004 — Device-vs-web LCD differential testing

**Status: IMPLEMENTED TOOLING — BLOCKED ON REAL CASIO REA-001 CAPTURES.**

This task adds reproducible comparisons for every reference key sequence, its intermediate LCD state and the final result/error. It **does not** assert hardware compatibility without CASIO device/emulator evidence.

The target model is **fx-991ES PLUS C 2nd edition**. The REA identified emulator interfaces and visual resources but did not capture complete native LCD sequences. The existing REA-001 manifest has 133 candidate sequences and presently zero real captures.

## Contents

- `compare.py`: stdlib JSON comparison, optionally Pillow for pixel comparison; emits `report.json` and `report.md`.
- `capture_browser.py`: optional Python Playwright capture of initial screen plus every physical web-key click from the independent calculator.
- `test_compare.py`: synthetic fixtures for equal traces, mismatches, missing native screenshots, missing browser capture and blocked pixel comparisons.
- `.github/workflows/rea004-tests.yml`: compile plus synthetic fixture tests.

## Capture browser output

From repository root (Python 3.11+):

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 calculator/reference/rea-004/capture_browser.py \
  --case REF-001 --case REF-002 \
  --out calculator/reference/rea-004/local-web-evidence
```

This loads `calculator/index.html` and clicks `#keys button[data-key=…]`. It records the web LCD PNG and an accessibility-state transcription after every key. The `web-capture.json` format explicitly marks the source `web-app`.

**Do not copy web images into the reference folder.** Browser observations are not CASIO observations. No results are inferred for modes needing unverified native setup sequences: those are marked `BLOCKED_SETUP`.

The app's accessibility description is not guaranteed to be verbatim native LCD text. Text comparisons must therefore be reviewed alongside the screenshot and command trace.

## Compare web with genuine native source

After importing a **real licensed CASIO emulator / physical calculator** reference capture into the REA-001 manifest (one PNG for the initial screen and one per key), run:

```sh
python3 -m pip install Pillow
python3 calculator/reference/rea-004/compare.py \
  --reference calculator/reference/rea-001/manifest.json \
  --web calculator/reference/rea-004/local-web-evidence/web-capture.json \
  --out calculator/reference/rea-004/local-report \
  --pixels
```

`--pixels` does **no resizing or inferred alignment**. Exact pixel comparison is possible only when native and browser screenshots have identical dimensions and calibrated, corresponding crops. If dimensions differ, the report marks `BLOCKED_DIMENSIONS`; it cannot claim pixel fidelity. The default per-RGB-channel threshold is 0; `--threshold N` relaxes only exact channel differences.

For an **acceptance gate** requiring at least 100 complete, reference-backed passes, use `--require-verified --pixels`. The command then exits nonzero until enough actual source-captured sequences pass, and it never counts hypotheses from REA-001 as observed CASIO results.

## Report statuses

| Status | Meaning |
|---|---|
| `PASS` | All requested comparisons passed for a capture backed by real reference screenshots |
| `FAIL` | A captured step, answer, error, or aligned screenshot differs |
| `BLOCKED_REFERENCE` | Real CASIO screenshots/provenance/results are missing or invalid |
| `BLOCKED_WEB` | Web capture missing, setup unsupported, key mapping inconsistent or images unavailable |
| `BLOCKED_PIXEL_ALIGNMENT` | Pillow missing, or native/web pixel dimensions differ |

A `PASS` with no `--pixels` is semantic-only. It does not mean pixel-equivalent rendering.

## Tests

```sh
python3 -m unittest discover -v -s calculator/reference/rea-004 -p 'test_*.py'
```

Fixtures are explicitly **synthetic** and exist solely to test comparison logic; they are not manufacturer test evidence.

## Definition of done

1. 100+ true CASIO reference sequences and screenshot captures from REA-001.
2. Corresponding independent web captures following matching setup and key sequences.
3. Reviewed exact output/error differences; recorded keyboard divergences and reproduction traces.
4. Calibrated screenshot crops and pixel-alignment comparison for relevant screens.
5. Machine-readable JSON and human-readable Markdown mismatch reports with zero unresolved failures.

As of this implementation, **native reference count is zero**; REA-004 is **partially complete**, not certified.
