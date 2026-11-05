# Milestone 38 — Reliable browser evidence and release qualification

## Changes

1. Classify failures according to the execution stage. Only a browser launch or page navigation infrastructure failure may become `BLOCKED`. An acceptance-test timeout after successful navigation is `FAIL`.
2. Compare the exact browser capture URL against the expected target, preventing URL-prefix lookalike origins.
3. Record `stage` in the browser matrix for diagnostic review.
4. Require a timezone-aware matrix timestamp, and reject stale/future matrix runs.
5. Require browser captures within 30 minutes of the parent matrix timestamp.
6. Keep all previous checks for real browsers, exact test names, all 18 PASS results, JS exceptions, and SHA-256 source fingerprint.

## Validation

Run `node tests/run-node.cjs` and `python -m unittest discover -s tools/tests -v`. Run `python tools/browser_matrix.py --out browser-evidence` on a machine where Playwright browser binaries and local navigation work. This must execute all three browsers. Verify the results with `python tools/evidence_review.py browser-evidence`.

## Release interpretation

Passing unit tests validates the implementation of the gate, not browser compatibility. Only fresh, matching Playwright artifacts with all three browsers passing 18/18 checks can qualify browser support. Hardware calculator compatibility remains a separate, unmet requirement until reference observations exist.
