# REA-099 — Model-specific physical evidence and parity-claim gate

**Issue:** https://github.com/philiparad/philiparad.github.io/issues/53

## Current status

The *evidence infrastructure* is implemented and committed. **Actual physical CASIO captures: 0. Hardware parity verified features: 0.** No genuine device comparison has been fabricated or inferred from web screenshots. Issue #53 remains open for collection and independent review of real capture data.

## What changed

### 1. Capability manifest: current source status, not invented device parity

File: `calculator/reference/rea-008/capabilities.json`

- All 25 feature records retain the canonical v1 schema and include explicit `verified_models: []`, `native_evidence_ids: []`, `hardware_verified: false`.
- Affected statuses/descriptions were refreshed to account for newer source implementations (for example, four EQN types, 40 original scientific constants, 40 conversions, matrix chaining, inequality intervals, seven DIST families).
- `implemented` explicitly means source functionality exists; it **does not mean CASIO hardware equivalence**. Remaining approximation/unsupported statuses reflect gaps or unverified implementations.
- `parity_claims_allowed` remains `false`.

### 2. Versioned model/feature evidence plan

File: `calculator/reference/rea-099/evidence-plan.json`

**69 pending collection cases** covering all 25 capabilities in their applicable original, PLUS and PLUS C models.

Each planning case specifies its feature ID, exact model, manufacturer-manual source, required device identity, capture date, setup, physical key sequence, individual LCD frames, observed output/error, web revision/frames and independent reviewer. Every case remains `PENDING_DEVICE_CAPTURE` with zero frames; no pending case is classified as evidence.

The plan is intentionally separate from `calculator/reference/rea-001/manifest.json`, the corpus used by the original hardware evidence gate. Add actual observed cases to that corpus only after collecting source-device captures.

### 3. Stronger model-specific claim validator

File: `calculator/reference/rea-008/gate.py`

A public `hardware-verified` label now requires **all** of:
- Matching `hardware_verified: true` and `status: hardware-verified`.
- At least one native evidence reference.
- `verified_models` exactly matching the feature's advertised models, without duplicates.
- For **each** advertised model, a matching native case identifying the *same feature ID and model ID*.
- The existing genuine-reference screenshot checks: observed initial state, every keypress and result/error, actual screenshot files, source-device identity and capture date.
- A nonempty key sequence and an independent reviewer different from the capture operator.
- Explicit `DEVICE_REVIEWED_PASS` status, `PASS` comparison, review date, web capture reference and the expected number of matched steps.

An evidence case for original fx-991ES does **not** authorize a claim about PLUS or PLUS C. A manual screenshot, fabricated ID, local web golden frame or source test cannot substitute for an authentic CASIO capture.

### 4. Public model-filtered view and offline standalone

Files:
- `calculator/js/capability-ui.js`
- `calculator/fx991_fresh_standalone.html`

The public status table downgrades a hardware label lacking model-specific evidence rather than displaying the unsupported claim. The offline standalone's embedded manifest is synchronized with the canonical source, and its UI rendering logic matches the modular version.

## Regression checks

JavaScript integrity suite:

```bash
node calculator/tests/rea099-evidence-integrity.cjs
```

**203/203 checks passed in an isolated JavaScript source harness**, covering the 25 features, 69 pending feature/model cases, no positive hardware claims, proper model IDs, standalone-manifest byte-independent JSON equality, and fail-closed UI/gate source structure.

Python unit cases were added to:
`calculator/reference/rea-008/test_rea099_evidence.py`

Execute alongside existing REA-008 tests:

```bash
python3 -m unittest discover -v -s calculator/reference/rea-008 -p 'test*.py'
python3 calculator/reference/rea-008/gate.py
```

The Python files were committed but **could not be executed in this environment against a native repository checkout**, so no Python test pass is claimed.

## How to complete the actual device validation

For each feature/model pair:
1. Identify a physical original fx-991ES, fx-991ES PLUS or PLUS C, recording a privacy-preserving device identifier and date.
2. Link to the exact manufacturer-manual section and record mode/setup.
3. Capture a real initial LCD frame, each keypress, displayed result/error and relevant annunciators. Attach original PNG images.
4. Replay the same physical key sequence in the simulator at a pinned Git commit and capture equivalent web frames.
5. Have an independent reviewer compare frames, precision, formatting, side effects, errors and input/editing transitions, and record mismatches.
6. Add approved, traceable device cases to the REA-001 native corpus with explicit model, feature and reviewer metadata.
7. Only after all required cases pass may a specific capability for that specific model be promoted by the evidence gate.

**Not done:** real-device LCD captures, end-to-end browser differential execution, firmware parity measurement. The repository is safer against unsupported claims but is *not* certified to reproduce physical CASIO behavior.

REA-100 has not been started.
