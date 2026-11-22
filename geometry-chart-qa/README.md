# Geometry Theorems JSXGraph real-renderer environment

This is an **isolated GitHub Actions environment** installed under the existing `philiparad.github.io` repository. It must not be confused with completed GQC-010 chart certification.

- Installs exact `jsxgraph@1.10.1` using npm.
- Installs Python Playwright `1.57.0` and its Chromium browser.
- Executes `geometry-chart-qa/smoke_test_real_jsxgraph.py` against **real, local JSXGraph JS/CSS**, never against a mock.
- Uploads screenshots and a JSON report as a GitHub Actions artifact.
- Runs the existing full 140-chart/3-viewport GQC-010 suite **only when** `geometry-theorems/index.html` and `geometry-theorems/tests/browser_real_jsxgraph.py` are present.
- If the site files are absent, the workflow reports `NOT_TESTED` for the full suite. A passing smoke test does not mean all geometry diagrams have been tested.

## Workflow

[Actions: Geometry JSXGraph 1.10.1 environment](https://github.com/philiparad/philiparad.github.io/actions/workflows/geometry-jsxgraph-environment.yml)

## Local Windows

The complete site project ZIP contains `setup-local-windows.ps1` for installation and full chart testing on the user's Windows machine. From its extracted root directory:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup-local-windows.ps1
```

This script requires Node.js 22 and Python 3.12 installed and an accessible npm registry. It does not require React, a Node runtime for the teaching application, or GitHub credentials.

## Separate hosting concern

The existing GitHub Pages repo currently does not include the Geometry Theorems application. **The environment installation does not deploy the site.** Full chart QA requires publishing the site's project files to `geometry-theorems/` through an appropriate repository upload procedure.