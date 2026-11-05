# Milestone 55 — precise browser acceptance failure classification

## Confirmed defect

The Milestone 54 browser acceptance harness classified a caught error as `BLOCKED` if its **message** matched `/timed out|did not initialize|iframe did not load|iframe navigation failed/`. This incorrectly marked application failures such as the session import timeout, and calculator initialization assertions, as infrastructure blocks. Text-based classification also let unrelated assertion failures be classified as blocks.

## Correction

`navigationBlocked(message)` tags only actual iframe-navigation errors with `kind = "navigation"`. The harness now classifies exceptions as `BLOCKED` **only** when that tag is present. Ordinary calculator assertions, session-import timeouts, and unexpected runtime errors remain `FAIL`. The 18 canonical acceptance names and their ordering are unchanged.

## Validation

- Existing Node calculator suite: 474/474.
- Python validation including eight additional failure-classification checks: 228/228.
- `node --check tests/browser-acceptance.js` and release-manifest audit.

The Playwright browser matrix has not been shown to complete successfully for this build; these tests validate source logic, not browser execution or physical CASIO behavior.
