# Milestone 30 — Browser Release Integration

## Test levels

1. JavaScript mathematical and state regressions (`tests/acceptance.html`, `tests/cases.js`).
2. Actual DOM/keyboard, calculator canvas, mode, and model workflows (`tests/browser-smoke.html`).
3. Device/emulator observations (`tests/device.html`), currently no verified records.

The smoke page runs in a same-origin isolated iframe. It performs UI changes on the test frame only and does not enable persistence. It expects the app scripts to load and provides pass/fail results in the HTML body; a timeout is not a pass. On hosts with a restrictive security policy, test availability may vary; open the page through GitHub Pages or an HTTP server rather than assuming `file://` access works.

## Manual release checklist

Check Chromium, Firefox and Safari/WebKit with keyboard, touch, 200% zoom, screen reader, natural layout, cursor navigation, v1/v2 session import, and page refresh under opt-in recovery. Record browser version and exact results in the release candidate evidence gate. Internal tests alone are insufficient for browser or hardware certification.

## Known limits

No hardware-observed reference corpus yet. Calculation caches and transient modifiers are intentionally not persisted. `src/app.js` does not expose a public API for testing; the browser-smoke page deliberately interacts through DOM controls.
