# PLUS-028 — Hardware parity evidence protocol

Target: **physical CASIO fx-991ES PLUS (2nd edition)**. This task is **BLOCKED** until genuine device-captured LCD images and observed keylogs are supplied. Modular/standalone screenshots and synthetic unit-test fixtures **are not hardware evidence**. No firmware parity is claimed.

## Required capture procedure

1. Identify the exact 2nd-edition model on the physical calculator. Record the date, operator, relevant setup/mode, and a non-sensitive redacted device identifier. Keep the source/original photographs privately for audit.
2. For each test, reset or document the starting calculator state. Record each actual physical keypress in order, including SHIFT/ALPHA/MODE, and capture the final native LCD using a photograph. If possible, supply a manually aligned and **unresampled** PNG of the native visible LCD pixel raster; also retain the original photograph. Do not invent a 96×31 device resolution—96×31 is only the simulator's current project-specific logical layout.
3. Replay exactly the same physical key sequence on the web calculator (modular and standalone as applicable), save the web LCD as PNG, and record the numerical value and any screen messages.
4. Record hardware and simulator file paths (relative to the manifest directory), SHA-256 hashes, keylogs, outputs, capture provenance and explicitly chosen numerical tolerances in `hardware-evidence.json`.
5. Run the comparator. Image dimensions must match **without scaling** to compute a pixel count. Dimension mismatches are reported as a failure, not silently resampled. Save mismatches and resolve or document every discrepancy.
6. When authentic captures exist, optionally sign the generated evidence report with an **operator-controlled private key** outside the repository and preserve the detached `.sig` alongside the JSON. Report SHA-256 is an integrity checksum, **not** a signature.

## Example manifest entry (template only — not evidence)

```json
{
  "id": "example-addition",
  "capture_type": "physical-device",
  "device_serial_redacted": "operator-chosen-redacted-id",
  "capture_date": "YYYY-MM-DD",
  "operator": "capture operator",
  "source_description": "original native photo filename and physical setup",
  "keys": ["1", "ADD", "2", "EQUAL"],
  "absolute_tolerance": 1e-9,
  "relative_tolerance": 1e-9,
  "hardware": {
    "png": "captures/example-hardware.png",
    "sha256": "64-character sha256 of actual hardware PNG",
    "keys": ["1", "ADD", "2", "EQUAL"],
    "numeric": 3
  },
  "simulator": {
    "png": "captures/example-web.png",
    "sha256": "64-character sha256 of actual simulator PNG",
    "keys": ["1", "ADD", "2", "EQUAL"],
    "numeric": 3
  }
}
```

The entry above is illustrative and is **not** included in the active manifest.

## Commands

```bash
python -m pip install Pillow==11.3.0
python -m unittest -v calculator/tests/test_plus028_hardware_evidence.py
python calculator/tools/plus028_compare_hardware.py \
  --manifest calculator/reference/plus-028/hardware-evidence.json \
  --report calculator/reference/plus-028/comparison-report.json
# Requiring physical evidence returns exit code 2 while manifest is empty.
python calculator/tools/plus028_compare_hardware.py \
  --manifest calculator/reference/plus-028/hardware-evidence.json \
  --report /tmp/plus028-hardware-report.json --require-evidence
# Optional operator-held private key, never commit it:
python calculator/tools/plus028_compare_hardware.py \
  --manifest calculator/reference/plus-028/hardware-evidence.json \
  --report /tmp/plus028-hardware-report.json \
  --sign-private-key /secure/location/operator-private.pem
openssl dgst -sha256 -verify /secure/location/operator-public.pem \
  -signature /tmp/plus028-hardware-report.json.sig /tmp/plus028-hardware-report.json
```

## Interpretation

- `BLOCKED_NO_DEVICE_EVIDENCE`: no actual device recordings have been provided. This is the current state.
- `FAIL_CAPTURED_CASES`: at least one provided hardware/simulator comparison disagrees.
- `PASS_CAPTURED_CASES_ONLY`: all **provided** case comparisons match. It does not establish exhaustive physical-device parity.
- `native_hardware_parity_certified` remains `false` by construction until a separate independently approved, complete verification process exists.

The synthetic fixture tests exercise the validator only. Do not present them as native CASIO captures.

## Coverage required for future device comparison

Record physical keylogs and screen photographs for each of the eight MODE entries; normal/SHIFT/ALPHA keys across representative input/result/error/menu screens; arithmetic and 10-digit rounding; MathIO and LineIO nested templates; CMPLX, BASE-N, EQN, MATRIX, VECTOR, STAT and TABLE; stored memory; constants/conversions; DRG/DMS; SOLVE/CALC convergence and cancellation; LCD annunciators, viewport, and error recovery. Separate **captured verified**, **captured mismatch**, and **not captured** cases. No missing case may be marked as passing.
