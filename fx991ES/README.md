# Milestone 17 — Differential Regression and Browser QA

Independent educational scientific calculator inspired by fx-991ES PLUS / fx-991ES PLUS C. **Not affiliated with CASIO.** HTML/CSS/vanilla JavaScript; no runtime framework, external numerical library, proprietary ROM, graphics, or fonts.

## Entry points

- `index.html` — interactive calculator and basic accessibility-name audit.
- `tests/acceptance.html` — internal regression suite (**223/223 passed locally**).
- `tests/reference.html` — Milestone 16 provenance-aware observation recorder.
- `tests/differential.html` — NEW differential comparison, deterministic replay, first-divergence diagnostics, JSON/CSV export, and seeded random trace reproducibility tests.

## Milestone 17 implementation

- `src/differential.js` — pure library exposing `replay`, `compare`, `compareCorpus`, `compareRuns`, `makeCheckpoint`, `toCSV`, `seededFuzz`, and `auditAccessibility`.
- Deterministic 96×31 framebuffer hashes and semantic state snapshots for each key, including the initial state.
- Optional `checkpoints: [{step, expected}]` on reference records. These identify the **first observed mismatch among supplied checkpoints**, not an inferred unobserved hardware divergence.
- Real-device observations remain separate from manual/internal results; no physical observations are bundled.
- Fully local JSON/CSV exports; no uploaded classroom data or external API calls.
- Input bounded to 300 cases, 500 semantic events per case and 250 fuzz traces to prevent unbounded work.
- Nineteen new tests; earlier 204 maintained.

## Reproduce tests

Open `tests/acceptance.html` in a desktop browser or (for developers) run `node tests/run-node.cjs`. Node is only an optional test runner; the shipped application uses browser-only JavaScript.

## Browser QA limitation

Automated Chromium navigation in this environment returns `ERR_BLOCKED_BY_ADMINISTRATOR` for both `file://` and `http://127.0.0.1` and therefore the browser UI is not certified. Independently test in current Chrome, Edge, Firefox and Safari, including Tab/Enter keyboard behavior, visible focus, screen-reader announcements, small viewport zoom, and PNG/corpus export.

## Device-compatibility boundary

No physical-device or official-emulator traces have been collected as part of this milestone; **0 hardware/emulator comparisons verified**. The six bundled manual-based examples are expectations, not empirical observations. Device reference data must be collected and attributed before any model-compatibility claim. Independent bitmaps are not exact Casio artwork.

## Next

Milestone 18: release hardening, accessibility and cross-browser certification, dependency/security documentation, and provenance-backed reference coverage; use real-device evidence before claiming compatibility.