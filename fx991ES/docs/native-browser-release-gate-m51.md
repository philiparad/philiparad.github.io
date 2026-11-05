# Milestone 51 — Native browser evidence is mandatory for release

The Milestone 50 end-to-end probe uses actual Playwright mouse, keyboard, file-upload, and viewport operations. Its previous `ready` flag was checked only against the caller's requested browsers. Consequently, a diagnostic run of `--browsers chromium` could incorrectly report ready without Firefox or WebKit. Separately, the milestone-40 release gate checked the 18 canonical browser assertions, but did not require the six native probes.

## Corrections

1. **Full matrix only:** `interaction-probe.json` now reports `diagnosticPassed` for the requested subset and `ready` **only** for a complete Chromium, Firefox, WebKit run with all six checks passing in each. A partial run can help troubleshoot failures but cannot approve a release.
2. **Provenance and timing:** The native report must declare the correct schema, milestone, 64-hex SHA-256 source fingerprint, timezone-aware timestamp, and valid HTTP(S) calculator URL. Release review independently checks that the fingerprint matches this checkout, that the native run and canonical matrix have the same origin, that their capture times are within 30 minutes, and that results are fresh (normally within 72 hours, with no more than 5 minutes of future skew).
3. **Release integration:** `tools/release_gate.py qualify --evidence browser-evidence` requires both the 18-check canonical three-browser report and `browser-evidence/interaction-probe.json` with six passing native probes per browser. `tools/release_report.py` displays the new **Native interactions** requirement and corresponding blockers. Missing, partial, stale or inconsistent evidence results in `BLOCKED`, even when canonical tests pass.
4. **Resource cleanup:** If the Playwright page fails during navigation or initialization, its newly created browser context is closed before the failure is re-raised; this prevents an accumulation of stranded contexts.

## Run locally

```bash
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
python tools/browser_matrix.py --out browser-evidence
python tools/browser_interaction_probe.py --out browser-evidence
python tools/release_gate.py qualify --evidence browser-evidence --out release-evidence/native-qualified-release.json
python tools/release_report.py --evidence browser-evidence --out release-evidence
```

A one-browser diagnostic may be run with `python tools/browser_interaction_probe.py --browsers chromium --out browser-evidence`. Even if its six checks succeed, the process deliberately exits with a nonzero release status and its JSON has `ready: false`.

The GitHub Actions workflow already runs both canonical and native tests. It uploads diagnostic artifacts whether the results pass or fail. **A successful local unit-test suite is not proof that a browser test executed.** Physical Casio model matching requires separate device observations and is not certified by these browser gates.
