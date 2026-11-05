# Milestone 49 — browser interaction reliability

This milestone strengthens the **same canonical 18 browser acceptance checks**; it does not pretend to add successful browser evidence.

## What is verified in a real browser

- Keypad composition, evaluation, AC clearing, and subsequent calculations.
- Keyboard shortcuts must be handled, but keystrokes directed to a focused input must not be intercepted.
- Structured fraction editing exposes incomplete and completed template states.
- A session JSON file is uploaded through an actual `File`/`DataTransfer`-populated file input, with expression and matrix register verified after opt-in recovery persistence. Disabling recovery must erase saved data.
- Every acceptance check also fails if the calculator captured JavaScript errors during that interaction.

No new browser test names were added: the exact 18-item list is retained for the existing release-evidence verifier. Browser evidence is labeled milestone 49.

## Limitations

Python unit tests verify that the DOM test harness contains these assertions, not that a browser passed them. Local browser execution remains environment-dependent. Physical-device compatibility is not certified.
