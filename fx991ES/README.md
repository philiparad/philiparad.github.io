# Milestone 30 — Release Integration and Browser Smoke QA

Independent HTML/CSS/vanilla JavaScript scientific calculator. Not affiliated with CASIO.

Milestone 30 integrates the previous v2 structural-session work with a browser-level smoke test. It adds a browser-only test page at `tests/browser-smoke.html` (actual DOM controls, canvas dimensions, accessible keypad names, expression calculation, mode and model switches, and regression execution) plus long-session restore tests. Session status wording now accurately distinguishes supported resumed editing workflows from cleared calculation caches.

## Verify

- Open `tests/acceptance.html` for the complete internal regression suite.
- Open `tests/browser-smoke.html` **on the same origin** to test the live DOM and calculator controls. The iframe is test-only; it does not opt in to session recovery. Browser checks must be run separately from local Node tests.
- The optional Node runner `node tests/run-node.cjs` is for development/CI only. The calculator itself has no Node.js runtime or bundler requirement.
- See `docs/browser-release-integration.md` for limitations and manual coverage.

Security: session imports remain schema-validated and must not execute imported expressions. Hardware/emulator matching has **not** been verified.
