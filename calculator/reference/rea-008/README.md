# REA-008 — Acceptance gate: simulated versus hardware-verified features

**Task status:** Implemented CI and public capability declaration. **Actual CASIO hardware verification remains unfulfilled** because REA-001 contains no genuine native device/emulator LCD captures.

## Public feature matrix

- `capabilities.json` is the canonical source of feature statements, model applicability and evidence provenance.
- `calculator/js/capability-ui.js` renders a model-filtered feature table in the calculator's existing companion panel. It contains no mathematical controls or popup dialogs.
- `calculator/fx991_fresh_standalone.html` embeds the same JSON manifest and frontend logic, so opening it offline works without an external HTTP request.

Status labels deliberately distinguish:

| Machine status | Public status | Meaning |
|---|---|---|
| `implemented` | Implemented in web app | A source feature exists. **Not device certified.** |
| `approximation` | Educational approximation | A partial, non-native or unverified workflow exists. |
| `unsupported` | Not implemented | Feature is missing or incomplete, even if an input menu appears. |
| `hardware-verified` | Verified against CASIO hardware | Reserved for features supported by genuine, reviewed, traceable device/emulator captures. |

Each feature also has a `hardware_verified` boolean, `native_evidence_ids` and explanatory `note`. All 25 current features have `hardware_verified=false`, reflecting available evidence.

## Automated acceptance gate

Run without Python packages:

```sh
python3 calculator/reference/rea-008/gate.py \
  --json-out /tmp/rea008-acceptance.json
```

The gate fails when:

- Any feature has contradictory status and hardware-verified flag, invalid models, missing explanations or duplicate IDs.
- A hardware-verified feature lacks real screenshot evidence linked to the REA-001 corpus.
- A supposed native evidence ID points to a missing, placeholder, unrecorded or synthetic source case.
- Calculator public source contains an unsupported positive claim of being pixel-perfect, firmware-accurate or completely CASIO-equivalent.

The gate does **not** elevate web self-tests, screenshots, product/manual mode listings, or synthetic test fixtures to native proof.

Unit tests explicitly exercise fraudulent references, mismatched hardware flags, unknown models, unqualified marketing claims, legitimate negative caveats and duplicate capabilities.

```sh
python3 -m unittest discover -v -s calculator/reference/rea-008 -p 'test_gate.py'
```

## Public browser checks

With Python Playwright/Chromium installed:

```sh
python3 -m pip install playwright==1.56.0
python3 -m playwright install chromium
python3 calculator/reference/rea-008/test_public_browser.py
```

The public comparison table is checked in both modular and standalone builds against the canonical manifest for the original fx-991ES, standard PLUS and PLUS C editions. A model change must update visible capabilities and may not incorrectly claim hardware certification.

Workflow: `.github/workflows/rea008-acceptance.yml` executes the gate, unit tests and browser checks on main. CI also exports a machine-readable acceptance decision as an artifact.

## Known limits

This **gates claims**, not native behavior. The original REA-008 definition of done is to publish a truthful matrix and enforce it in CI, and that part can be done without new hardware input. The `hardware-verified` label must remain absent until real CASIO evidence is imported, audited and approved.

A source regression success proves only that an expected web behavior has not changed; it is not evidence of actual CASIO calculator parity. Native screen resolution, accurate firmware algorithms and many advanced functions remain unverified.

No React or Node.js is used in the calculator runtime.
