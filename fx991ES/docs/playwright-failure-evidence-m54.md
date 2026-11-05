# Milestone 54 — Browser runner failure evidence

The canonical browser-matrix runner and native interaction probe now **write their
normal JSON evidence even when the Playwright Python package is not installed**.
Without this handling, `ImportError` exited the process before writing the JSON,
leaving the artifact-review workflow without a useful explanation.

## Behavior

- Both tools report all requested browsers as `BLOCKED`, at stage `launch`, with
  `Playwright dependency unavailable` in the detail field.
- Both tools return a nonzero process exit code. A dependency failure **never**
  becomes a calculator PASS or release approval.
- Both reports include the current browser source SHA-256 fingerprint and a UTC
  timestamp. The native report also records `ready: false`.
- The GitHub Actions browser-matrix step uses `if: always()`, so installation
  failure does not suppress subsequent best-effort evidence collection. The
  native probe and artifact upload already use `if: always()`.
- Other installation and runner failures remain subject to the existing
  release evidence reviewer and diagnostics; this milestone does not assert
  a successful browser execution.

## Reproduction

```bash
python -m unittest tools.tests.test_dependency_failure_m54 -v
python -S tools/browser_matrix.py --out /tmp/fx991-missing-playwright
python -S tools/browser_interaction_probe.py --out /tmp/fx991-missing-native
```

The last two commands are expected to return nonzero while producing readable
JSON explaining the blocked dependency. `python -S` prevents site-packages from
being loaded and therefore exercises the same absence without a test double.

## Qualification

A browser-qualified release still requires all 18 canonical checks and all six
native interactions in Chromium, Firefox and WebKit. Physical CASIO hardware
compatibility is not certified by browser results.
