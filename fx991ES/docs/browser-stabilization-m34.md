# Milestone 34 — Browser release stabilization

This milestone improves the browser **evidence collection and release gate**. It does **not** claim physical Casio compatibility or successful Chromium/Firefox/WebKit UI execution without browser-generated evidence.

## Main changes

- The Python/Playwright browser runner explicitly validates downloaded JSON evidence (schema, model of user agent, 18 distinct checks and valid statuses), not merely the acceptance page's displayed success label.
- JavaScript exceptions and browser-console errors are included in the report and block a passing result.
- A three-browser matrix is ready only when **Chromium, Firefox and WebKit** all pass, with the exact same check names in the same order. A partial run is always not ready.
- Individual browser captures and screenshots are retained even when a browser fails or is blocked.
- The GitHub Actions job runs the calculator's existing JavaScript regression suite and nine offline evidence-gate unit tests before attempting three real browsers.
- An optional `--chromium-executable /usr/bin/chromium` supports local environments where system Chromium exists but the Playwright browser package is missing. It does not bypass network or administrator policy.

## Verification (2026-11-05)

| Validation | Result |
|---|---|
| Calculator JavaScript suite | 474/474 passed |
| Evidence-gate Python unit tests | 9/9 passed |
| Local system Chromium Playwright navigation | BLOCKED: `ERR_BLOCKED_BY_ADMINISTRATOR` |
| Firefox/WebKit browser acceptance | Not run |
| GitHub Actions cross-browser run | Not independently confirmed |
| Physical Casio device equivalence | Not verified |

## Run tests

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python -m pip install playwright==1.56.0
python -m playwright install chromium firefox webkit
python tools/browser_matrix.py --out browser-evidence
```

For local system Chromium:

```sh
python tools/browser_matrix.py --browsers chromium --chromium-executable /usr/bin/chromium --out browser-evidence
```

`browser-evidence/matrix-run.json` contains explicit `PASS`, `FAIL`, or `BLOCKED` results. CI exits nonzero until all three browsers report valid matching successful captures. Individual reports are raw evidence and not authenticated proof of browser provenance; browser UA checking only guards against accidental mismatches.