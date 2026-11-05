# Milestone 43 — GitHub Actions run provenance

## Problem

A downloadable ZIP alone cannot prove which GitHub Actions run created it. The
Milestone 42 offline inspector correctly keeps `ciRunAuthenticated: false`; it is
not a trustworthy basis for production qualification by itself. Earlier GitHub
connector results for the latest published commit did not expose a completed run.

## Solution

`tools/actions_run_collector.py` retrieves a completed **successful** workflow
run through GitHub's REST API. It requires the expected repository, exact full
commit SHA, main branch, allowed trigger, and intended workflow name. The run's
artifact must have exactly the expected name `browser-evidence-<run_id>`, be
unexpired, and belong to the selected run.

The artifact is downloaded using HTTPS, subject to a 20 MiB size limit, then
processed by the Milestone 42 archive inspector with ZIP safety checks and
semantic cross-browser evidence review. Source fingerprints must match the
checked-out revision. Partial, stale, cross-build, or failing evidence is blocked.

The CLI stores a provenance report as `github-evidence.json` with run ID, commit,
artifact ID, SHA-256 of the archive, browser diagnostics, and blockers. It does
not change or execute the uploaded source and does not provide a Casio hardware
compatibility certificate.

## Automation

The new `.github/workflows/review-browser-artifacts.yml` is **read-only**, reacts
to the completion of the existing cross-browser workflow, checks out that exact
commit, and collects evidence through the authenticated GitHub API using the
GitHub-provided token. It uploads its diagnostics regardless of outcome; the job
**fails** if the browser qualification is blocked.

The main browser workflow no longer uploads a redundant nested ZIP inside the
artifact, because a nested archive was not supported by the strict M42 inspector.
It still uploads `browser-evidence/` and `release-evidence/` and can be triggered
on relevant source changes.

## Testing and limitations

The collector unit tests mock the GitHub HTTP responses. These are *not* physical
browser observations. The workflow must actually complete in GitHub Actions to
produce valid evidence. A successful browser qualification applies only to the
selected source commit and does **not** certify behavior of a physical Casio.
