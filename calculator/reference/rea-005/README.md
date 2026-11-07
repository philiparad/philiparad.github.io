# REA-005 — 50 physical keys × SHIFT / ALPHA × 11 modes

**Status: source-behavior audit implemented; native device verification BLOCKED.**

This step is deliberately limited to REA-005. It does not add new calculator functions or treat non-crashing key dispatch as proof of CASIO correctness. REA-001 has no genuine device captures and REA-003 has 0/50 verified native keycodes, so reference-backed assertions are not currently possible.

## Purpose

Enumerate every possible web-application input context for:

- **50 unique physical keys** from `../rea-003/key-map.json`;
- **3 modifier contexts** (normal, SHIFT, ALPHA);
- **11 currently exposed web calculation modes** (COMP, CMPLX, STAT, BASE-N, EQN, MATRIX, TABLE, VECTOR, INEQ, VERIF, DIST).

The resulting **1,650 contexts** are evaluated independently in Chromium, by opening a fresh application page for each test, selecting the mode with MODE + a numbered selection, exiting any educational wizard with AC, priming a modifier, and **clicking the actual physical-key DOM button**.

This audit reflects the **model's web mode definitions**; it does not establish that every mode exists on a non-C variant or that actual CASIO interactions use the same wizard setup.

## Run source-behavior audit

No React or Node.js is required. Python is needed only for the optional test runner:

```sh
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 calculator/reference/rea-005/audit.py \
    --out /tmp/rea005-audit.json --require-full
```

Or inspect a subset:

```sh
python3 calculator/reference/rea-005/audit.py \
    --mode COMP --modifier shift --key SIN \
    --out /tmp/rea005-shift-sin.json
```

Two outputs are produced: an exact JSON matrix and a Markdown summary with all potentially unsupported, notification-only, modifier-only and exception contexts. The workflow `.github/workflows/rea005-audit.yml` runs all 1,650 and publishes its generated evidence as a GitHub Actions artifact.

## Classification definitions

| Web observation | Interpretation |
|---|---|
| `OBSERVED_STATE_CHANGE` | At least one actual tracked UI / calculation state field changed; correctness NOT established |
| `ERROR_STATE` | The application displayed an error after the key |
| `MODIFIER_TOGGLE_ONLY` | SHIFT or ALPHA toggled; no calculation function was observed |
| `MODIFIER_CONSUMED_WITHOUT_OBSERVED_EFFECT` | Modifier cleared without any resulting calculation/menu/edit change; needs inspection |
| `NOTICE_ONLY` | Only status text changed; operation not verified |
| `NO_OBSERVABLE_EFFECT` | No tracked state/display change; may be unsupported, forbidden in this context or an intentional no-op |
| `AUDIT_EXCEPTION` | Automation/browser/controller exception, treated as a failed audit |

Every cell carries `native_reference_status: UNVERIFIED` and `device_behavior_claim: false`. A browser observation never becomes an assertion of real CASIO hardware parity.

## Repeatable unit checks

```sh
python3 -m unittest discover -v -s calculator/reference/rea-005 -p 'test_*.py'
```

The unit tests validate classification rules, model mode definitions and key inventory. The GitHub Actions job additionally requires 1,650 unique contexts, no audit exceptions, and zero claims of native verification.

## Acceptance criteria — still pending

To finish REA-005 under the original backlog's definition of done, use the genuine reference captures from REA-001 / REA-004 and native mappings from REA-003 to label each key combination as **verified action** or **explicitly unsupported according to the real CASIO model**, with reproducible original screenshots. This task remains **PARTIAL** until the reference corpus exists.

No CASIO proprietary DLL, firmware, emulator binary, or branded artwork is included.
