# Milestone 43 — Authenticated Browser Evidence and CI Diagnostics

**Status:** Local source/tests validated; browser release qualification blocked until real Chromium, Firefox and WebKit evidence exists. No physical Casio equivalence is certified.

Milestone 41 adds `tools/ci_diagnostics.py` and 12 fail-closed diagnostics unit tests. The CI workflow generates `release-evidence/ci-diagnostics.json` and `.html` even when the browser matrix fails or is missing. It identifies the failed browser, phase, and actionable next step without fabricating browser passes.

Run from the repository root:

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
python tools/ci_diagnostics.py --matrix browser-evidence/matrix-run.json --decision release-evidence/release-decision.json --out release-evidence/ci-diagnostics.json
```

The last command exits nonzero until real browser evidence and release approval are available, but still writes JSON and HTML diagnosis files. See `docs/ci-diagnostics-m41.md`.

---

# Milestone 39 — Production Release Candidate Quality Gate

Independent HTML/CSS/vanilla JavaScript scientific calculator. Not affiliated with CASIO.

Milestone 32 integrates the previous v2 structural-session work with a browser-level smoke test. It adds a browser-only test page at `tests/browser-smoke.html` (actual DOM controls, canvas dimensions, accessible keypad names, expression calculation, mode and model switches, and regression execution) plus long-session restore tests. Session status wording now accurately distinguishes supported resumed editing workflows from cleared calculation caches.

## Verify

- Open `tests/acceptance.html` for the complete internal regression suite.
- Open `tests/browser-smoke.html` **on the same origin** to test the live DOM and calculator controls. The iframe is test-only; it does not opt in to session recovery. Browser checks must be run separately from local Node tests.
- The optional Node runner `node tests/run-node.cjs` is for development/CI only. The calculator itself has no Node.js runtime or bundler requirement.
- See `docs/browser-release-integration.md` for limitations and manual coverage.

Security: session imports remain schema-validated and must not execute imported expressions. Hardware/emulator matching has **not** been verified.

## Milestone 32 Browser Acceptance

New: `tests/browser-acceptance.html` runs 12 actual DOM/browser assertions and exports verifiable per-browser evidence as JSON. Internal JavaScript tests are separate. Chrome local navigation is blocked in this environment; there is no claim of successful browser automation. See `docs/browser-acceptance.md`.


## Milestone 32 — cross-browser evidence

- Run `tests/browser-acceptance.html` in Chromium, Firefox, and WebKit/Safari. It performs 18 DOM-level checks.
- Export each actual browser run as JSON. Results are not assumed from unexecuted tests.
- Open `tests/cross-browser.html`, import the three reports, inspect the test-by-test matrix and export the comparison. Missing, blocked, and failed checks all block browser qualification.
- All evidence processing is offline, JSON-only; physical Casio verification is separate and still pending.
- Run `tests/acceptance.html` for JavaScript regression tests. `node tests/run-node.cjs` is an optional developer runner, not a browser dependency.


## Milestone 34

The project includes a Python Playwright runner for Chromium/Firefox/WebKit (CI only, not calculator runtime), a GitHub Actions workflow, and `tests/release-readiness.html`. Browser reports are only claimed when runs execute successfully. See `docs/release-integration-m33.md`. Previous 474 internal tests are preserved.


## Milestone 34 — browser release stabilization

The automated browser matrix validates all 18 individual browser checks, records browser errors, and rejects incomplete or mismatched Chromium/Firefox/WebKit evidence. CI also runs 9 offline evidence-gate tests. See [browser stabilization methodology](docs/browser-stabilization-m34.md). Local browser navigation is blocked by the execution environment; do not interpret JavaScript regression success as browser acceptance.


## Milestone 35

The CI browser runner now validates the exact 18-check acceptance manifest (including order), not just the row count, and supports `--base-url` for testing a deployed site. Added offline negative tests for substituted/reordered checks. See [M35 release validation](docs/release-validation-m35.md). Physical Casio compatibility is not certified.


## Milestone 36

The browser acceptance test now **actually resizes the calculator frame to 375 px** for its narrow-screen check. The CI runner validates URLs, timezone-aware timestamps and per-check summary consistency, with 21 offline negative/positive gate tests. See [browser release corrections](docs/browser-release-m36.md). No actual cross-browser pass has been observed yet.


## Milestone 38 — auditable browser evidence

The runner records a SHA-256 source fingerprint and target URL with the browser matrix. `tools/evidence_review.py` checks complete three-browser captures, source and origin consistency, date freshness, individual assertions and JavaScript errors. The GitHub workflow uploads an audit report alongside the browser screenshots and test evidence. See `docs/evidence-review-m37.md`. Browser qualification is **not claimed** without actual successful captures.


## Milestone 38 — reproducible browser evidence

The browser runner now distinguishes **navigation/launch infrastructure blocks** from **post-load acceptance timeouts and failed evidence downloads**. Only genuine infrastructure errors are reported as BLOCKED; missing or hung UI tests fail. Captures must match the exact configured URL, not a lookalike prefix.

The offline evidence review now enforces an aware, recent matrix timestamp and checks that browser reports were captured within 30 minutes of the matrix execution. A matrix with a missing timestamp, changed source digest, incomplete browser, or inconsistent result is not release-qualified.

Run locally (developer tooling only):

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/browser_matrix.py --out browser-evidence
python tools/evidence_review.py browser-evidence
```

This is not a claim that Chromium, Firefox, or WebKit completed successfully, or that the simulator matches a physical Casio device.


## Milestone 39 — reproducible release candidate

`tools/release_gate.py` generates and verifies `release-manifest.json` and fail-closes
release qualification unless **all three** real browser evidence reports pass.
The local build can pass 474 calculator checks and all offline gate tests while
remaining *unqualified* for browser or physical-calculator compatibility.
Run `python tools/release_gate.py verify` to audit packaged files; see
`docs/release-gate-m39.md`.


## Milestone 40 — Human-readable release qualification

The new `tools/release_report.py` generates an escaped, offline HTML release-decision report and JSON summary. Reports are uploaded by CI even when the browser suite is blocked. Source integrity and real 18/18 Chromium, Firefox and WebKit captures are both mandatory. A missing browser matrix produces `BLOCKED`, not a simulated pass. See `docs/release-decision-m40.md`.

## Milestone 42 — GitHub Actions artifact inspection

- `tools/actions_artifact_inspector.py`: validate downloaded GitHub Actions artifact ZIPs without executing their contents. Reject unsafe entries and triage captured browser evidence against this checkout.
- `tools/tests/test_actions_artifact_inspector.py`: adversarial tests for path traversal, duplicate members, symlinks, zip bombs and fail-closed release reports.
- `.github/workflows/browser-acceptance.yml`: bundles evidence and runs offline artifact inspection after CI diagnostics, always uploading diagnostic artifacts.
- `docs/github-actions-artifact-inspection-m42.md`: manual recovery and verification steps.

Offline inspection of a ZIP does **not** authenticate the GitHub run or certify browser compatibility. Release qualification remains blocked without matching, successful evidence from Chromium, Firefox and WebKit and verified CI provenance.

## Milestone 43 — Authenticated GitHub Actions artifact retrieval

Milestone 43 adds `tools/actions_run_collector.py` and a separate, read-only
`review-browser-artifacts.yml` workflow. A completed **successful** source-repository
browser workflow is checked by exact run ID, source commit, and matching artifact ID.
The downloaded ZIP is then passed through the safe offline artifact inspector.
The follow-up workflow publishes diagnostic artifacts and **fails** when qualifying
browser evidence is missing or invalid; it does not deploy or certify hardware.

To inspect a run manually (development/CI only):

```sh
python tools/actions_run_collector.py --repo philiparad/fx991ES \
  --sha FULL_40_CHARACTER_SHA --run-id RUN_ID --out release-evidence/github-actions
```

No browser results are claimed until the authenticated GitHub run exists and all
18 acceptance checks pass in Chromium, Firefox and WebKit. The existing calculator
continues to run entirely in vanilla HTML/CSS/JavaScript.


## Milestone 44 — failed-run browser evidence triage

The GitHub run collector now supports `--diagnose-failed` for a named completed unsuccessful run. This permits artifact inspection without treating failed CI as a passing release. The downstream review workflow uses diagnostic mode and still blocks qualification until an authenticated, successful run provides complete browser evidence. See `docs/github-failure-triage-m44.md`.
