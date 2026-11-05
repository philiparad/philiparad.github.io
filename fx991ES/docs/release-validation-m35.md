# Milestone 35 — Release candidate evidence and browser diagnostics

The browser acceptance gate now has a canonical, ordered list of all 18 DOM checks. Reports with substituted or reordered checks are invalid even when all reported rows say PASS. The CI workflow performs the 474 calculator engine tests, 13 offline evidence-gate tests, then executes Playwright in Chromium, Firefox and WebKit. The browser runs must be observed and pass separately; internal tests are not evidence of browser compatibility.

Run locally with `node tests/run-node.cjs`, `python -m unittest discover -s tools/tests -v`, and then `python tools/browser_matrix.py --out browser-evidence`. To compare a deployed build, pass `--base-url https://philiparad.github.io/fx991ES` (the origin/path must match what the browser report says). The local test server remains available for the default case. The matrix runner rejects mismatched browser user agents, incomplete reports, duplicate or substituted test names, and all failed/blocked checks.

GitHub workflows: https://github.com/philiparad/fx991ES/actions/workflows/browser-acceptance.yml. Review the completed job and download its `browser-evidence-*` artifact; a commit alone does not prove successful browser automation. Browser captures and physical-calculator observations are distinct.

**Current evidence**: calculator engine tests and Python gate tests pass locally. An actual three-browser run and hardware verification are not yet confirmed.