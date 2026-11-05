# Milestone 56 — One origin for both browser test suites

## Defect

The canonical Playwright browser runner (`tools/browser_matrix.py`) and six native
interaction probes (`tools/browser_interaction_probe.py`) each started a local
server bound to port `0` (an independently selected ephemeral port). The release
auditor in `audit_probe_evidence()` requires the native and canonical captures
to have **identical HTTP origins**, including the port. Thus two individually
passing browser suites were still unable to qualify for release.

## Repair

`tools/shared_browser_session.py` starts one loopback HTTP server and launches
both subprocesses with the same `--base-url`. It collects results in the same
`browser-evidence/` folder, preserves both subprocess exit codes, runs the
native probes even if canonical assertions fail, and closes its server on exit.
The GitHub Actions browser workflow uses this shared runner in one `if: always()`
step. The native probe retains its former standalone mode when `--base-url`
is omitted.

## Qualification and limitations

The independent browser matrix, native probe, origin/clock/source audit and
release report remain fail-closed. This change fixes a release-gate wiring
problem. It does **not** itself establish that Chromium, Firefox or WebKit pass.
No manufactured evidence, bypass or PASS status is created.

## Checks

Run `python -m unittest discover -s tools/tests -q`, `node tests/run-node.cjs`,
`python tools/release_gate.py verify`, and, on a browser-enabled machine,
`python tools/shared_browser_session.py --out browser-evidence`.
