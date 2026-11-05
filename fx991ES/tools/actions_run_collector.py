#!/usr/bin/env python3
"""Collect and review GitHub Actions browser evidence (Milestone 44).

The authenticated GitHub API determines artifact provenance; artifact contents remain
untrusted and are never executed. Failure always returns a BLOCKED decision.

Requires Python 3 stdlib only. GITHUB_TOKEN is optional for public repositories.
Run locally, for example:
  python tools/actions_run_collector.py --repo philiparad/fx991ES \
      --sha <40-hex-commit> --out release-evidence/github-run

Or inspect a known completed run with --run-id <id> and --sha <commit>.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.request
from urllib.parse import urlsplit
import zipfile

from actions_artifact_inspector import inspect_archive, render_html

SCHEMA = 'fx991-github-run-evidence-m44'
API = 'https://api.github.com'
WORKFLOW = 'browser-acceptance.yml'
WORKFLOW_NAME = 'Cross-browser acceptance'
MAX_ARCHIVE = 20 * 1024 * 1024
REPO_PATTERN = re.compile(r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
SHA_PATTERN = re.compile(r'^[0-9a-fA-F]{40}$')


def validate_identity(repo, sha):
    if not isinstance(repo, str) or not REPO_PATTERN.fullmatch(repo) or '..' in repo:
        raise ValueError('Invalid GitHub repository name')
    if not isinstance(sha, str) or not SHA_PATTERN.fullmatch(sha):
        raise ValueError('A full 40-character commit SHA is required')


class SafeRedirect(urllib.request.HTTPRedirectHandler):
    """Do not forward API authorization to an artifact-storage redirect host."""
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
        if redirected is None:
            return None
        if not newurl.startswith('https://'):
            raise ValueError('Refusing non-HTTPS artifact redirect')
        # Some urllib versions expose the original host in `host`.
        if urlsplit(req.full_url).netloc != urlsplit(newurl).netloc:
            redirected.remove_header('Authorization')
            redirected.unredirected_hdrs.pop('Authorization', None)
        return redirected


def github_request(url, *, token=None, binary=False, timeout=25):
    if not url.startswith(API + '/'):
        raise ValueError('GitHub API URL is outside expected origin')
    headers = {'Accept': 'application/vnd.github+json',
               'X-GitHub-Api-Version': '2022-11-28',
               'User-Agent': 'fx991ES-evidence-collector-m43'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    opener = urllib.request.build_opener(SafeRedirect())
    with opener.open(urllib.request.Request(url, headers=headers), timeout=timeout) as response:
        payload = response.read(MAX_ARCHIVE + 1 if binary else 4_000_001)
    if binary:
        if len(payload) > MAX_ARCHIVE:
            raise ValueError('Artifact download exceeds 20 MiB')
        return payload
    if len(payload) > 4_000_000:
        raise ValueError('GitHub API response exceeds maximum size')
    return json.loads(payload)


def select_completed_run(runs, repo, sha, *, diagnose_failed=False):
    """Select a matching completed workflow; failed runs may ONLY supply diagnostics."""
    if not isinstance(runs, dict) or not isinstance(runs.get('workflow_runs'), list):
        raise ValueError('Malformed workflow run listing')
    matches = []
    for run in runs['workflow_runs']:
        if not isinstance(run, dict):
            continue
        repository = run.get('head_repository') or {}
        if (run.get('head_sha', '').lower() == sha.lower()
                and repository.get('full_name', '').lower() == repo.lower()
                and run.get('status') == 'completed'
                and (run.get('conclusion') == 'success' or
                     (diagnose_failed and run.get('conclusion') in ('failure', 'timed_out', 'cancelled', 'action_required')))
                and run.get('event') in ('push', 'workflow_dispatch')
                and run.get('head_branch') == 'main'
                and isinstance(run.get('id'), int) and run['id'] > 0):
            matches.append(run)
    if not matches:
        raise ValueError('No matching completed browser workflow run found for this source commit')
    return max(matches, key=lambda x: x['id'])


def validate_run(run, repo, sha, *, run_id=None, diagnose_failed=False):
    if not isinstance(run, dict):
        raise ValueError('Malformed GitHub workflow run metadata')
    if run_id is not None and run.get('id') != run_id:
        raise ValueError('Run identity mismatch')
    selected = select_completed_run({'workflow_runs':[run]}, repo, sha, diagnose_failed=diagnose_failed)
    if selected.get('name', '').split('—')[0].strip() != WORKFLOW_NAME:
        raise ValueError('Unexpected GitHub Actions workflow name')
    # GitHub provides a workflow path on normal run details. When present it
    # must identify the expected workflow, not just a matching display name.
    path = selected.get('path')
    if path is not None and (not isinstance(path, str) or
            not path.split('@', 1)[0].endswith('/.github/workflows/' + WORKFLOW)):
        raise ValueError('Unexpected GitHub Actions workflow file')
    return selected


def select_artifact(payload, run_id):
    if not isinstance(payload, dict) or not isinstance(payload.get('artifacts'), list):
        raise ValueError('Malformed GitHub artifact listing')
    expected = 'browser-evidence-' + str(run_id)
    matches = [x for x in payload['artifacts'] if isinstance(x, dict)
               and x.get('name') == expected and x.get('expired') is False
               and x.get('workflow_run', {}).get('id') == run_id
               and isinstance(x.get('id'), int) and x['id'] > 0
               and isinstance(x.get('size_in_bytes'), int)
               and 0 < x['size_in_bytes'] <= MAX_ARCHIVE]
    if len(matches) != 1:
        raise ValueError('Expected exactly one unexpired artifact attached to the selected run')
    return matches[0]


def collect(repo, sha, out, *, run_id=None, root=None, token=None,
            diagnose_failed=False, fetch=github_request):
    """Download and inspect an artifact; return provenance-annotated diagnostics.

    Failed runs can be fetched with diagnose_failed=True to identify defects.
    Only completed, successful, authenticated runs can ever qualify a release.
    `fetch` is injectable in tests. A ZIP alone is not a CI attestation.
    """
    validate_identity(repo, sha)
    out = Path(out)
    root = Path(root or Path(__file__).resolve().parents[1])
    out.mkdir(parents=True, exist_ok=True)
    base = f'{API}/repos/{repo}'
    if run_id is None:
        url = f'{base}/actions/workflows/{WORKFLOW}/runs?branch=main&per_page=100'
        run = select_completed_run(fetch(url, token=token), repo, sha, diagnose_failed=False)
    else:
        if not isinstance(run_id, int) or run_id <= 0:
            raise ValueError('Invalid workflow run identifier')
        run = validate_run(fetch(f'{base}/actions/runs/{run_id}', token=token), repo, sha,
                           run_id=run_id, diagnose_failed=diagnose_failed)
    run = validate_run(run, repo, sha, run_id=run['id'], diagnose_failed=diagnose_failed)
    artifact = select_artifact(fetch(f'{base}/actions/runs/{run["id"]}/artifacts?per_page=100',token=token), run['id'])
    raw = fetch(f'{base}/actions/artifacts/{artifact["id"]}/zip', token=token, binary=True)
    if not isinstance(raw, bytes) or len(raw) > MAX_ARCHIVE:
        raise ValueError('Invalid or oversized ZIP download')
    archive = out/'browser-run-artifact.zip'
    archive.write_bytes(raw)
    try:
        audit = inspect_archive(archive, root=root)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        raise ValueError('GitHub artifact failed safety or evidence inspection: ' + str(exc)) from exc
    decision = {
        'schema': SCHEMA,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'repository': repo, 'headSha': sha.lower(), 'runId': run['id'],
        'runUrl': run.get('html_url'), 'runStatus': run['status'],
        'runConclusion': run['conclusion'], 'artifactId':artifact['id'],
        'artifactName': artifact['name'], 'archiveSha256':sha256(raw).hexdigest(),
        'ciRunAuthenticated': bool(token),
        'githubApiMetadataMatched': True,
        'evidenceComplete': bool(audit.get('evidenceComplete')),
        'browserQualified': bool(token and run['conclusion'] == 'success' and
                                 audit.get('evidenceComplete') and audit.get('sourceDigestMatches')),
        'deviceCompatibility': 'UNVERIFIED',
        'blockers': list(audit.get('blockers', [])),
        'browserDiagnostics': audit.get('browsers', {}),
        'note': 'GitHub API run metadata verified; browser qualification never certifies physical Casio compatibility.'
    }
    if run['conclusion'] != 'success':
        decision['blockers'].insert(0, 'GitHub workflow conclusion is ' + run['conclusion'] + '; diagnostic only')
    if not token:
        decision['blockers'].append('No GitHub API token supplied; provenance is not authenticated')
    if not decision['browserQualified'] and not decision['blockers']:
        decision['blockers'].append('Browser evidence incomplete or source digest mismatch')
    (out/'github-evidence.json').write_text(json.dumps(decision, indent=2)+'\n', encoding='utf-8')
    return decision


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo', required=True)
    p.add_argument('--sha', required=True)
    p.add_argument('--run-id', type=int)
    p.add_argument('--diagnose-failed', action='store_true',
                   help='Fetch evidence from a failed completed run for diagnosis only; NEVER approves it')
    p.add_argument('--out', type=Path, default=Path('release-evidence/github-actions'))
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args=p.parse_args(argv)
    result=None
    try:
        result=collect(args.repo, args.sha, args.out, run_id=args.run_id,
                       root=args.root, token=os.environ.get('GITHUB_TOKEN'),
                       diagnose_failed=args.diagnose_failed)
    except (ValueError, OSError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        result={'schema':SCHEMA, 'generatedAt':datetime.now(timezone.utc).isoformat(),
                'repository':args.repo, 'headSha':args.sha, 'ciRunAuthenticated':False, 'githubApiMetadataMatched': False,
                'evidenceComplete':False, 'browserQualified':False,
                'deviceCompatibility':'UNVERIFIED', 'blockers':[str(exc)[:500]]}
        args.out.mkdir(parents=True,exist_ok=True)
        (args.out/'github-evidence.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print('BROWSER QUALIFICATION:', 'PASS' if result['browserQualified'] else 'BLOCKED')
    for issue in result['blockers'][:10]:print('BLOCKER:', issue)
    return 0 if result['browserQualified'] else 1

if __name__ == '__main__':
    raise SystemExit(main())
