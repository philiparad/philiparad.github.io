"""Offline mocked GitHub API tests. No fixture counts as real browser evidence."""
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import actions_run_collector as G

ROOT = Path(__file__).resolve().parents[2]
SHA = 'a' * 40
REPO = 'philiparad/fx991ES'
RUN_ID = 1234


def run_data(**changes):
    d={'id': RUN_ID, 'name':'Cross-browser acceptance — M42',
       'head_sha': SHA, 'head_repository':{'full_name': REPO},
       'head_branch':'main','status':'completed','conclusion':'success',
       'event':'push','html_url':'https://github.com/philiparad/fx991ES/actions/runs/1234'}
    d.update(changes)
    return d


def artifact_data(**changes):
    d={'id':889, 'name':f'browser-evidence-{RUN_ID}', 'expired':False,
       'workflow_run': {'id':RUN_ID},'size_in_bytes':400}
    d.update(changes)
    return d


def mock_fetch(url, *, token=None, binary=False):
    if url.endswith('browser-acceptance.yml/runs?branch=main&per_page=100'):
        return {'workflow_runs':[run_data()]}
    if url.endswith('/actions/runs/1234') or url.endswith('/actions/runs/999'):
        return run_data()
    if url.endswith('/actions/runs/1234/artifacts?per_page=100'):
        return {'artifacts':[artifact_data()]}
    if url.endswith('/actions/artifacts/889/zip') and binary:
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('browser-evidence/matrix-run.json', json.dumps({
                'schema':'fx991-browser-matrix-run','milestone':41,
                'ready':False,'sourceDigest':'invalid','generatedAt':'2026-11-05T11:00:00+00:00',
                'results':[{'browser':b,'status':'BLOCKED','stage':'navigate',
                            'detail':'ERR_BLOCKED_BY_ADMINISTRATOR'}
                           for b in ('chromium','firefox','webkit')]}))
        return buf.getvalue()
    raise AssertionError('Unexpected URL '+url)


class GitHubEvidenceCollectorTests(unittest.TestCase):
    def test_sha_required(self):
        for value in ('main','a'*39,'a'*41,'a'*39+'g'):
            with self.assertRaises(ValueError): G.validate_identity(REPO,value)

    def test_repo_validation(self):
        for repo in ('x/../y','../../repo','me/repo/other','example/repo?ref=1'):
            with self.assertRaises(ValueError): G.validate_identity(repo,SHA)

    def test_completed_success_only(self):
        selected=G.select_completed_run({'workflow_runs':[run_data()]},REPO,SHA)
        self.assertEqual(selected['id'],RUN_ID)
        for attrs in ({'conclusion':'failure'}, {'status':'in_progress'},
                      {'head_sha':'b'*40}, {'head_branch':'other'},
                      {'event':'pull_request'}, {'head_repository':{'full_name':'someone/fork'}}):
            with self.assertRaises(ValueError):
                G.select_completed_run({'workflow_runs':[run_data(**attrs)]},REPO,SHA)

    def test_failed_run_is_available_for_diagnostics_only(self):
        failed=run_data(conclusion='failure')
        with self.assertRaises(ValueError):
            G.validate_run(failed,REPO,SHA,run_id=RUN_ID)
        selected=G.validate_run(failed,REPO,SHA,run_id=RUN_ID,diagnose_failed=True)
        self.assertEqual(selected['conclusion'],'failure')
        for bad in ('in_progress','queued'):
            with self.assertRaises(ValueError):
                G.validate_run(run_data(status=bad,conclusion='failure'),REPO,SHA,
                               run_id=RUN_ID,diagnose_failed=True)

    def test_failed_diagnostic_run_never_qualifies(self):
        def fetch(url, *, token=None, binary=False):
            if url.endswith('/actions/runs/1234'):
                return run_data(conclusion='failure')
            return mock_fetch(url,token=token,binary=binary)
        with tempfile.TemporaryDirectory() as directory:
            result=G.collect(REPO,SHA,Path(directory),run_id=RUN_ID,root=ROOT,
                             token='test-token',diagnose_failed=True,fetch=fetch)
            self.assertFalse(result['browserQualified'])
            self.assertTrue(result['ciRunAuthenticated'])
            self.assertEqual(result['runConclusion'],'failure')
            self.assertTrue(any('conclusion is failure' in x for x in result['blockers']))
            self.assertTrue(Path(directory,'browser-run-artifact.zip').is_file())

    def test_without_token_cannot_approve(self):
        with tempfile.TemporaryDirectory() as directory:
            result=G.collect(REPO,SHA,Path(directory),run_id=RUN_ID,root=ROOT,fetch=mock_fetch)
            self.assertFalse(result['browserQualified'])
            self.assertTrue(any('not authenticated' in x for x in result['blockers']))

    def test_workflow_path_mismatch(self):
        run=run_data(path='philiparad/fx991ES/.github/workflows/other.yml@main')
        with self.assertRaises(ValueError):
            G.validate_run(run,REPO,SHA,run_id=RUN_ID)
        good=run_data(path='philiparad/fx991ES/.github/workflows/browser-acceptance.yml@main')
        self.assertEqual(G.validate_run(good,REPO,SHA,run_id=RUN_ID)['id'],RUN_ID)

    def test_diagnostic_does_not_accept_other_commit(self):
        with self.assertRaises(ValueError):
            G.validate_run(run_data(head_sha='c'*40,conclusion='failure'),REPO,SHA,
                           run_id=RUN_ID,diagnose_failed=True)

    def test_latest_successful_matching_run(self):
        a=run_data(id=42)
        b=run_data(id=43)
        c=run_data(id=44,conclusion='failure')
        self.assertEqual(G.select_completed_run({'workflow_runs':[a,c,b]},REPO,SHA)['id'],43)

    def test_workflow_name_is_verified(self):
        with self.assertRaises(ValueError):G.validate_run(run_data(name='Other workflow'),REPO,SHA)

    def test_artifact_is_tied_to_run(self):
        self.assertEqual(G.select_artifact({'artifacts':[artifact_data()]}, RUN_ID)['id'],889)
        for changes in ({'expired':True},{'name':'other'}, {'workflow_run':{'id':7}},
                        {'size_in_bytes':0},{'size_in_bytes':G.MAX_ARCHIVE+1}):
            with self.assertRaises(ValueError):
                G.select_artifact({'artifacts':[artifact_data(**changes)]},RUN_ID)

    def test_duplicate_artifact_rejected(self):
        with self.assertRaises(ValueError):
            G.select_artifact({'artifacts':[artifact_data(),artifact_data(id=890)]},RUN_ID)

    def test_provenance_does_not_upgrade_failed_evidence(self):
        with tempfile.TemporaryDirectory() as d:
            result=G.collect(REPO,SHA,Path(d),root=ROOT,fetch=mock_fetch)
            self.assertFalse(result['ciRunAuthenticated'])
            self.assertTrue(result['githubApiMetadataMatched'])
            self.assertFalse(result['browserQualified'])
            self.assertEqual(result['runId'], RUN_ID)
            self.assertTrue(Path(d,'github-evidence.json').exists())
            self.assertTrue(result['blockers'])

    def test_explicit_run_id(self):
        with tempfile.TemporaryDirectory() as d:
            result=G.collect(REPO,SHA,Path(d),run_id=RUN_ID,root=ROOT,fetch=mock_fetch)
            self.assertEqual(result['runId'],RUN_ID)

    def test_wrong_run_id_detected(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):
                G.collect(REPO,SHA,Path(d),run_id=999,root=ROOT,fetch=mock_fetch)

    def test_cli_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            old=G.github_request
            def fail(*_args, **_kwargs):raise ValueError('No runs available')
            try:
                G.github_request=fail
                # Collect defaults bind at function definition, so stub CLI collection explicitly.
                old_collect=G.collect
                G.collect=lambda *_a,**_k: (_ for _ in ()).throw(ValueError('No runs available'))
                self.assertEqual(G.main(['--repo',REPO,'--sha',SHA,'--out',d]),1)
                self.assertFalse(json.loads(Path(d,'github-evidence.json').read_text())['browserQualified'])
            finally:
                G.collect=old_collect
                G.github_request=old

    def test_non_https_redirect_rejected(self):
        from urllib.request import Request
        redirect=G.SafeRedirect()
        with self.assertRaises(ValueError):
            redirect.redirect_request(Request('https://api.github.com/test'),None,302,'move',{},'http://example.com/file')

if __name__ == '__main__':unittest.main()
