# Milestone 31 — Browser acceptance evidence

## What is tested

The independent browser acceptance page at `tests/browser-acceptance.html` loads a fresh calculator iframe for each assertion. It uses actual document controls and key events for the 96×31 LCD, keypad arithmetic, keyboard shortcuts, natural editor, settings, C-only mode restrictions and session import. It also invokes the browser regression suite.

Open from an HTTP(S) website. A Chromium/Firefox/WebKit result must be recorded **separately** on each browser; passing in one is not proof for the others. Use **Export actual run evidence** to obtain JSON with the user agent, timestamp and individual statuses. A BLOCKED run is not a pass.

`node tests/run-node.cjs` verifies the JS engine only and cannot establish browser operability. The browser suite does not compare to an original Casio calculator.

## Local environment restriction

Headless Chromium could start, but both `file://` and `http://127.0.0.1` page navigation produced `net::ERR_BLOCKED_BY_ADMINISTRATOR` in this environment. Therefore the release includes browser tests but **not** a fabricated passing Chromium run.

## Acceptance checklist

1. Run 458/458 engine tests.
2. Open the browser acceptance page in Chromium, Firefox, and WebKit separately, and save three JSON evidence exports.
3. Investigate FAIL and BLOCKED.
4. Confirm keyboard/ARIA behavior and optional recovery opt-in manually.
5. Obtain hardware/emulator observations before claiming physical Casio compatibility.