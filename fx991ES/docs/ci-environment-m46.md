# Milestone 46 — Browser CI preflight and environment diagnostics

The browser runner may be unable to start because the Playwright Python module or
browser binaries are missing. Previously these installation failures were visible
only in workflow logs, and a missing matrix report could not identify the failed prerequisite.

## CI execution

1. Record environment availability before installation (diagnostic; never approval).
2. Install pinned `playwright==1.56.0` and Chromium, Firefox and WebKit packages.
3. Check Python, Node.js, Playwright importability, and all three executable paths.
4. Write `release-evidence/ci-environment.json` and `.md` even when a prerequisite is missing.
5. Append the report to `$GITHUB_STEP_SUMMARY` on all outcomes.
6. Run browser acceptance if prerequisites allow and retain the existing fail-closed release gate.

The workflow name remains **Cross-browser acceptance — M42** because the downstream
`workflow_run` review workflow matches that exact name. Changing the display name
would silently prevent the automatic review from firing.

## Interpretation

- `PRE-INSTALL`: a baseline inventory, not release evidence.
- `READY`: executable paths exist, **not** proof that a browser launched or passed.
- `BLOCKED`: missing prerequisite; inspect the exact browser executable availability.

A release still requires matching actual Chromium, Firefox and WebKit captures.
Physical Casio compatibility remains unverified.
