# Milestone 47 — GitHub Actions job-level failure triage

## The problem

A completed GitHub Actions run may fail before it uploads any browser artifact. A browser-artifact inspector alone cannot tell whether the failure occurred during checkout, Playwright installation, source verification, browser launch or the acceptance suite.

## Solution

`tools/github_job_triage.py` reads **GitHub Actions job and step metadata** for a given completed run and exact 40-character source SHA. The GitHub review workflow now emits `release-evidence/github-actions/job-triage.json` and `.md` even when its artifact collector cannot find an archive. This does not require downloading or executing untrusted job logs.

The tool verifies that the run belongs to the expected repository, workflow, branch and source commit. It rejects malformed, cross-run, duplicate, oversized, and incomplete job lists. It escapes untrusted GitHub names in Markdown and limits their length. It never outputs an approving release decision.

## Usage

In the `fx991ES` repository, with a **real** completed workflow run ID:

```sh
GITHUB_TOKEN=<token-with-actions-read> python tools/github_job_triage.py \
  --repo philiparad/fx991ES \
  --sha <exact-40-hex-commit-SHA> \
  --run-id <numeric-run-id> \
  --out release-evidence/github-actions/job-triage.json \
  --markdown release-evidence/github-actions/job-triage.md
```

Do not commit tokens. On GitHub Actions, the token comes from `${{ github.token }}`. The tool does not print or write it.

## Verify without network access

```sh
node tests/run-node.cjs
python -m unittest discover -s tools/tests -v
python tools/release_gate.py verify
```

The 18 browser checks must **still** execute successfully in Chromium, Firefox and WebKit with authenticated matching-build evidence. A successful job triage result or a successful local regression suite is not browser acceptance and does not establish physical Casio compatibility.

## Known limitations

The connected GitHub tool currently exposes only pull-request-associated workflow-run lookup by commit, and no completed browser run has been retrieved in this environment. This tool is designed for a provided run ID or the `workflow_run` event and does not fabricate a run ID. Job metadata without a uploaded browser artifact may diagnose the fault but cannot prove the simulator works in that browser. The GitHub API may cap job results to 100; incomplete results are rejected rather than silently summarized.
