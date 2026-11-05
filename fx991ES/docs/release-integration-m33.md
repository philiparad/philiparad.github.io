# Milestone 33 — Browser release integration

The simulator runs in browsers using only HTML, CSS and vanilla JavaScript. **Python and Playwright are development/CI tools, not production dependencies.**

## Automated browser matrix

```bash
python -m pip install playwright==1.56.0
python -m playwright install chromium firefox webkit
python tools/browser_matrix.py --browsers chromium firefox webkit --out browser-evidence
```

The script serves the project from a temporary localhost HTTP server, runs 18 independent DOM interaction checks in each browser, downloads reports, takes screenshots, and writes `matrix-run.json`. It exits nonzero if a browser is blocked, incomplete, or fails. Browser evidence from GitHub Actions is attached to the workflow run, not treated as a passing assertion unless the job succeeds.

## Source versus website

The source repository runs `.github/workflows/browser-acceptance.yml`. The GitHub Pages repository should receive the same browser-visible files under `fx991ES/`; CI-only `.github/` and `tools/` files do not belong under the published website directory.

## Evidence limits

- Test scripts cannot prove physical Casio compatibility.
- Imported browser reports use user-agent classification; this is **not authenticated** provenance. Preserve the original automated run alongside results.
- Local test success must never be presented as successful cross-browser acceptance.
- The browser matrix requires all three browser runs and all 18 checks. Keep failing screenshots and raw evidence.
- Test fixtures are educational and independently implemented, not official Casio software.