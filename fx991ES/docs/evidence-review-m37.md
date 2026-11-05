# Milestone 37 — Cross-browser evidence review

The browser matrix runner now writes `sourceDigest` (SHA-256 of the canonical calculator and test sources) and `targetUrl` into `matrix-run.json`. `tools/evidence_review.py` cross-checks the matrix summary and all three independent browser captures. It fails closed when evidence is absent, stale, from a different build or URL, or when a browser has failed/blocked checks or JavaScript errors.

## Commands

```bash
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/browser_matrix.py --out browser-evidence
python tools/evidence_review.py browser-evidence --out browser-evidence/evidence-review.json
```

GitHub Actions uploads evidence even after a failure. The evidence-review command exits nonzero until **actual Chromium, Firefox and WebKit** runs have passed. A valid manifest or an offline unit-test fixture is not evidence that a browser ran. No embedded third-party runtime is required to run the calculator.

Hardware compatibility is a separate criterion. Physical Casio observations remain uncollected.
