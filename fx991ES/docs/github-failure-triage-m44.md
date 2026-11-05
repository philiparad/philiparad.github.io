# Milestone 44 — Inspecting failed GitHub Actions runs

The M43 collector required a **successful** GitHub Actions run before opening its evidence bundle. This made it unable to inspect the very runs that can reveal browser defects. M44 adds a restricted, diagnostic-only path for failed, cancelled, timed-out or action-required completed runs.

## Usage

With a valid `GITHUB_TOKEN` possessing read-only Actions permission:

```sh
python tools/actions_run_collector.py \
    --repo philiparad/fx991ES \
    --run-id 123456789 \
    --sha YOUR_EXACT_40_CHARACTER_COMMIT_SHA \
    --diagnose-failed \
    --out release-evidence/github-actions
```

The requested run must be complete, from the expected main-branch repository and workflow, and tied to the exact SHA. Its downloaded ZIP is inspected as **untrusted input**. Resulting `github-evidence.json` includes the real workflow conclusion and per-browser diagnostics. The authenticated GitHub API binds the artifact ID to its run. Missing artifacts or API failures produce a BLOCKED report.

**Fail-closed separation:** a failure-run artifact can never approve a release, regardless of what its JSON says. An unauthenticated API query also cannot approve a release. Successful release qualification still requires a successful, authenticated source run, source digest match, and complete current Chromium/Firefox/WebKit evidence. Hardware matching remains entirely separate.

The `review-browser-artifacts.yml` workflow now uses `--diagnose-failed` so its review artifact contains failure analysis even if the original browser matrix failed. It retains the final reject-unqualified step.

The available GitHub connector's commit-run method is documented as filtering to pull-request runs, so an empty result **does not prove** that no push-triggered browser workflow ran. Independently inspect the GitHub Actions UI or supply a run ID to this command.
