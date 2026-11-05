# Milestone 34 — Automated Browser Release Integration

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
