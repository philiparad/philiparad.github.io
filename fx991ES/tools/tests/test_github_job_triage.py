"""No network access: test GitHub job triage with deterministic API fixtures."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import github_job_triage as T

REPO='philiparad/fx991ES'
SHA='a'*40
RID=123456

def run(conclusion='failure'):
    return {'id':RID,'head_sha':SHA,'status':'completed','conclusion':conclusion,
            'head_repository':{'full_name':REPO},'head_branch':'main','event':'push',
            'name':'Cross-browser acceptance — M42',
            'path':REPO+'/.github/workflows/browser-acceptance.yml@main'}

def job(conclusion='failure', *, steps=None):
    return {'id':901,'run_id':RID,'name':'browser-matrix','status':'completed',
            'conclusion':conclusion,'steps':steps if steps is not None else [
                {'number':1,'name':'Install dependencies','status':'completed','conclusion':'failure'},
                {'number':2,'name':'Upload artifacts','status':'completed','conclusion':'success'}]}

def fetch_for(run_meta=None,jobs=None):
    def get(url,token=None):
        if url.endswith('/jobs?filter=latest&per_page=100'):
            return {'total_count':len(jobs if jobs is not None else [job()]),'jobs':jobs if jobs is not None else [job()]}
        return run_meta if run_meta is not None else run()
    return get

class TriageTests(unittest.TestCase):
    def test_failed_run_reports_step(self):
        r=T.diagnose(REPO,SHA,RID,fetch=fetch_for(),token='test-token')
        self.assertFalse(r['browserQualified'])
        self.assertEqual(r['jobCount'],1)
        self.assertTrue(any('Install dependencies' in x for x in r['issues']))
    def test_successful_run_never_approves(self):
        j=job('success',steps=[{'number':1,'name':'tests','status':'completed','conclusion':'success'}])
        r=T.diagnose(REPO,SHA,RID,fetch=fetch_for(run('success'),[j]),token='token')
        self.assertFalse(r['browserQualified'])
        self.assertEqual(r['issues'],[])
        self.assertIn('NOT EVALUATED',T.as_markdown(r))
    def test_no_jobs_raises_informational_blocker(self):
        r=T.diagnose(REPO,SHA,RID,fetch=fetch_for(jobs=[]))
        self.assertTrue(any('No jobs' in issue for issue in r['issues']))
    def test_wrong_sha_rejected(self):
        with self.assertRaises(ValueError):T.diagnose(REPO,'b'*40,RID,fetch=fetch_for())
    def test_wrong_run_id_rejected(self):
        with self.assertRaises(ValueError):T.diagnose(REPO,SHA,RID+1,fetch=fetch_for())
    def test_running_run_rejected(self):
        with self.assertRaises(ValueError):T.diagnose(REPO,SHA,RID,fetch=fetch_for({**run(),'status':'in_progress'}))
    def test_jobs_other_run_rejected(self):
        with self.assertRaises(ValueError):T.diagnose(REPO,SHA,RID,fetch=fetch_for(jobs=[{**job(),'run_id':1}]))
    def test_duplicate_jobs_rejected(self):
        with self.assertRaises(ValueError):T.normalize_jobs({'total_count':2,'jobs':[job(),job()]},run_id=RID)
    def test_duplicate_steps_rejected(self):
        s={'number':1,'name':'dup','status':'completed','conclusion':'success'}
        with self.assertRaises(ValueError):T.normalize_jobs({'jobs':[job(steps=[s,s])]},run_id=RID)
    def test_truncated_pagination_rejected(self):
        with self.assertRaises(ValueError):T.normalize_jobs({'total_count':101,'jobs':[job()]},run_id=RID)
        with self.assertRaises(ValueError):T.normalize_jobs({'total_count':2,'jobs':[job()]},run_id=RID)
    def test_malformed_job_state_rejected(self):
        with self.assertRaises(ValueError):T.normalize_jobs({'jobs':[job('magic')]},run_id=RID)
    def test_html_and_markdown_injection_escaped(self):
        bad=job(steps=[{'number':1,'name':'<script>|`test`','status':'completed','conclusion':'failure'}])
        result=T.diagnose(REPO,SHA,RID,fetch=fetch_for(jobs=[bad]))
        md=T.as_markdown(result)
        self.assertNotIn('<script>',md)
        self.assertIn('\\|',md)
    def test_secret_token_not_in_report(self):
        r=T.diagnose(REPO,SHA,RID,fetch=fetch_for(),token='TOP_SECRET_123')
        self.assertNotIn('TOP_SECRET_123',json.dumps(r))
    def test_no_token_cannot_be_qualified(self):
        r=T.diagnose(REPO,SHA,RID,fetch=fetch_for())
        self.assertFalse(r['browserQualified'])
        self.assertTrue(any('token absent' in x for x in r['issues']))
    def test_failed_api_still_writes_report(self):
        original=T.diagnose
        try:
            T.diagnose=lambda *a,**kw: (_ for _ in ()).throw(ValueError('No jobs returned'))
            with tempfile.TemporaryDirectory() as tmp:
                out=Path(tmp,'triage.json');md=Path(tmp,'triage.md')
                self.assertEqual(T.main(['--repo',REPO,'--sha',SHA,'--run-id',str(RID),'--out',str(out),'--markdown',str(md)]),1)
                self.assertFalse(json.loads(out.read_text())['browserQualified'])
                self.assertTrue(md.is_file())
        finally:
            T.diagnose=original

if __name__=='__main__':unittest.main()
