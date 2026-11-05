# Milestone 50 — Native browser interaction probes

The 18 canonical browser-acceptance checks remain unchanged. The additional six Playwright probes in `tools/browser_interaction_probe.py` use **real browser input APIs** rather than dispatched synthetic keyboard events:

1. Native typing and Enter calculate `7+8=15`.
2. Typing inside the editable input does not trigger document-level calculator shortcuts.
3. Real keypad clicks fill a fraction template and remove its incomplete-state marker.
4. Real file chooser uploads a structured session; recovery persists and clears matrix memory appropriately.
5. A real 375px page viewport has no document-level horizontal scrolling.
6. Native Tab presses can reach a keypad button.

Each probe uses a newly created browser context; errors from `pageerror` listeners fail the probe. Failure screenshots are saved as `browser-evidence/{browser}-probe-{index}.png`, and results are emitted to `browser-evidence/interaction-probe.json`. The probe exits nonzero unless every requested browser passes all six checks. Because the GitHub Actions workflow executes the probe as a required step, a failed or missing probe blocks the overall CI workflow. The existing, separately validated 18-check evidence remains the primary browser release certificate; the probe does **not** self-certify physical Casio compatibility.

Run in an environment where Playwright browsers are installed:

```sh
python -m playwright install --with-deps chromium firefox webkit
python tools/browser_interaction_probe.py --out browser-evidence
```

For local Chromium diagnostics only:

```sh
python tools/browser_interaction_probe.py --browsers chromium --chromium-executable /usr/bin/chromium --out browser-evidence
```

Local executor navigation may be denied by policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); such a run is reported as `BLOCKED`, never `PASS`. Python unit tests validate the **structure and fail-closed validation** of reports, not browser behavior. An actual Playwright run is required for browser qualification.
