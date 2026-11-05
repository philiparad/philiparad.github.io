# Milestone 36 — Browser qualification corrections

The user interface remains a static, browser-only HTML/CSS/vanilla JavaScript calculator.

## Browser acceptance correction
The narrow-viewport check now resizes the **actual calculator iframe** to 375 CSS pixels, waits two animation frames for reflow, then compares `documentElement.scrollWidth` with `clientWidth`. The previous implementation inspected the normal-width iframe while labelling it a narrow-viewport test.

## Evidence integrity
The Python CI release gate accepts only evidence with the expected 18 named checks in order, a browser-matching user agent, a valid HTTP(S) capture URL ending in `/tests/browser-acceptance.html`, an ISO-8601 timestamp with timezone, optional diagnostics as strings, and a summary consistent with the individual rows. Reports are not independent proof of a genuine physical calculator or a genuine browser until captured by the actual Playwright run.

Failure, blocked and missing evidence all block three-browser qualification. A failed report can be inspected but cannot qualify the release.

## Local results
- 474 / 474 engine regression cases passed.
- 21 / 21 offline evidence validator tests passed.
- Browser executable availability is environmental; no browser pass is asserted without a saved real capture.
- The repository connector did not expose a completed workflow run for the preceding Milestone 35 commit.

## Next verification
Run the workflow on GitHub Actions, examine the browser artifacts, and fix browser defects supported by the observed reports. Independently check hardware/emulator behavior before any Casio compatibility certification.
