# Milestone 20 — Physical Device Compatibility Workbench

Independent educational browser simulator of fx-991ES PLUS / C behavior, with no CASIO firmware or proprietary assets. Not affiliated with or endorsed by CASIO. Plain HTML/CSS/JavaScript; no Node or React required in the browser.

## Applications

- `index.html`: calculator
- `tests/acceptance.html`: internal regression tests
- `tests/reference.html`: provenance-aware reference observation lab
- `tests/differential.html`: differential replay diagnostics
- `tests/release.html`: browser runtime and QA checks
- `tests/rc.html`: evidence-based release gate and JSON evidence import/export
- `tests/device.html`: **new physical/official-emulator comparison workbench**, discrepancy triage, provenance-aware evidence import/export

## Current readiness

- **268/268** local JavaScript tests passed at build time (252 Milestone 19 + 16 device-evidence checks).
- **0 bundled physical-device/emulator observations**. Hardware compatibility is NOT certified.
- Browser QA evidence is not bundled or presumed. Chromium checks, where performed locally, are development checks—not manual accessibility or cross-browser certification.
- See `docs/release-candidate.md`, `docs/release.md`, and `docs/compatibility.md` for precise gaps and requirements.

## Developer tests

`node tests/run-node.cjs` uses Node as an optional local test tool, not as an application dependency. No external packages are needed.

## Milestone 20 protocol

Use `tests/device.html` to select a documented reference scenario, operate it on an actual handheld or legitimately licensed official emulator, enter the observed result and provenance, and export the evidence JSON. Imported observations are compared with reproducible simulator traces and classified into numerical/formatting, workflow, editor, error, and mode-state discrepancies. **No physical/emulator observations ship with this project.** The sample device evidence used in unit tests is deliberately synthetic and is never exported as a project observation. See `docs/device-validation.md`.