# Milestone 36 — Browser Failure Resolution & Release Qualification

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