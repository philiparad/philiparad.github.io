# Milestone 48 — Browser bootstrap error capture

## Verified defect

The first browser acceptance assertion claimed that the calculator booted without JavaScript errors, but the `loadFresh()` fixture returned `errors: []` unconditionally. As a result, an exception raised by a calculator script during the iframe's initial load might not have been visible to that assertion. Browser-level Playwright `pageerror` listening remains present separately, but the test assertion itself was not observing the claimed condition.

## Fix

- `src/boot-diagnostics.js` is the first application script in `index.html`, before `src/natural-editor.js`, the shared kernel, and `src/app.js`.
- It registers `error` and `unhandledrejection` listeners on the calculator document before the application code executes. Events are recorded into a bounded in-memory array (maximum 20 entries, maximum 500 characters per entry). No network, storage, analytics, or mutation of calculation state is performed.
- `tests/browser-acceptance.js` obtains a reference to that array from the **fresh iframe**, instead of constructing a new empty array. The existing first acceptance assertion now rejects absent instrumentation and any recorded startup error.
- No acceptance-check names or ordering were changed; previously published 18-check evidence manifests remain structurally compatible. Source digests change as expected.
- Existing CSP (`script-src 'self'`) permits this first-party external script without introducing inline JavaScript.

## Regression testing

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
```

The additional Python test module checks script ordering, unchanged failure reporting, JavaScript syntax and executable Node VM error capture with both synchronous errors and rejected promises. It also verifies the bounded error buffer.

## Browser qualification limitations

A genuine Chromium launch was attempted in the local environment, but navigation to the browser acceptance page was denied with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Its matrix result is `BLOCKED` at the `navigate` stage, not a successful acceptance run or an application failure. Firefox and WebKit acceptance and physical device parity have not been verified. GitHub Actions reports remain the required source for production browser qualification.
