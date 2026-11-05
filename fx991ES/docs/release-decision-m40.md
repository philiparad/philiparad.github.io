# Milestone 40 — Evidence-backed release decisions

The release report combines the Milestone 39 source checksum gate with the actual three-browser evidence reviewer. It never creates dummy browser captures or reports passing interactions that did not run.

## Decision logic

- The checked-out source tree must agree with `release-manifest.json`.
- Chromium, Firefox and WebKit must each record the exact 18 successful acceptance checks, from the same source digest and target URL, with fresh matching timestamps.
- Any missing, blocked or failed browser run prevents qualification.
- Physical fx-991ES PLUS compatibility is *not* certified by any of these checks.

## Run

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/browser_matrix.py --out browser-evidence
python tools/release_report.py --evidence browser-evidence --out release-evidence
```

`release-evidence/release-decision.json` is machine readable. The corresponding HTML explains the release status and blockers, with imported diagnostics escaped as text. GitHub Actions uploads both even on failure. A local HTML report is not an independently signed CI attestation.

## Outstanding validation

An actual successful matrix run in CI remains required. Without real observations, the release status is **BLOCKED**. The independently implemented calculator also has not been certified to reproduce Casio hardware behavior.
