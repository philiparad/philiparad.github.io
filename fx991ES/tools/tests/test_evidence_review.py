"""Offline tests for fail-closed inspection of saved browser evidence."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

TOOL_DIR = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('evidence_review', TOOL_DIR / 'evidence_review.py')
import sys
sys.path.insert(0, str(TOOL_DIR))
import browser_matrix as matrix
review_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review_mod)


class EvidenceReviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)
        self.now = datetime(2026,11,5,12,0,tzinfo=timezone.utc)
        self.target = 'https://example.org/fx991ES/tests/browser-acceptance.html'
        self.samples = {}
        rows = []
        agents = {'chromium':'Chrome/120.0','firefox':'Firefox/120.0','webkit':'AppleWebKit/605.1 Safari/605.1'}
        for browser in matrix.BROWSERS:
            capture = {
                'schema': matrix.SCHEMA,
                'milestone':37,
                'userAgent': agents[browser],
                'generatedAt':self.now.isoformat(),
                'location':self.target,
                'results':[{'name':n,'status':'PASS'} for n in matrix.EXPECTED_NAMES],
                'summary':'18/18 browser checks passed; 0 failed; 0 blocked',
            }
            self.samples[browser]=capture
            self.write_capture(browser)
            rows.append({'browser':browser,'status':'PASS','passed':18,'names':list(matrix.EXPECTED_NAMES),'errors':[]})
        self.matrix = {'schema':'fx991-browser-matrix-run','milestone':38,
                       'generatedAt':self.now.isoformat(),
                       'sourceDigest':matrix.source_digest(),'targetUrl':self.target,
                       'ready':True,'results':rows}
        self.write_matrix()

    def write_capture(self,browser):
        (self.path / f'{browser}-acceptance.json').write_text(json.dumps(self.samples[browser]),encoding='utf8')

    def write_matrix(self):
        (self.path/'matrix-run.json').write_text(json.dumps(self.matrix),encoding='utf8')

    def review(self):
        return review_mod.review_directory(self.path,now=self.now)

    def test_complete_matched_evidence_passes(self):
        self.assertTrue(self.review()['ready'])

    def test_missing_browser_capture_fails(self):
        (self.path/'firefox-acceptance.json').unlink()
        self.assertFalse(self.review()['ready'])

    def test_missing_matrix_fails(self):
        (self.path/'matrix-run.json').unlink()
        self.assertFalse(self.review()['ready'])

    def test_source_mismatch_fails(self):
        self.matrix['sourceDigest']='0'*64
        self.write_matrix()
        self.assertIn('fingerprint',str(self.review()['blockers']))

    def test_stale_report_fails(self):
        self.samples['chromium']['generatedAt']=(self.now-timedelta(days=5)).isoformat()
        self.write_capture('chromium')
        self.assertIn('stale',str(self.review()['blockers']))

    def test_future_timestamp_fails(self):
        self.samples['webkit']['generatedAt']=(self.now+timedelta(hours=1)).isoformat()
        self.write_capture('webkit')
        self.assertIn('future',str(self.review()['blockers']))

    def test_wrong_origin_fails(self):
        self.samples['firefox']['location']='https://different.example/fx991ES/tests/browser-acceptance.html'
        self.write_capture('firefox')
        self.assertIn('target',str(self.review()['blockers']))

    def test_failed_check_fails(self):
        x=self.samples['chromium']
        x['results'][1]['status']='FAIL'
        x['summary']='17/18 browser checks passed; 1 failed; 0 blocked'
        self.write_capture('chromium')
        self.assertFalse(self.review()['ready'])

    def test_reported_console_error_fails(self):
        self.matrix['results'][0]['errors']=['console: Uncaught Error']
        self.write_matrix()
        self.assertIn('console',str(self.review()['blockers']))

    def test_inconsistent_matrix_counts_fail(self):
        self.matrix['results'][0]['passed']=17
        self.write_matrix()
        self.assertIn('disagrees',str(self.review()['blockers']))

    def test_missing_matrix_timestamp_fails(self):
        self.matrix.pop('generatedAt')
        self.write_matrix()
        self.assertIn('matrix timestamp', str(self.review()['blockers']))

    def test_stale_matrix_timestamp_fails(self):
        self.matrix['generatedAt']=(self.now-timedelta(days=5)).isoformat()
        self.write_matrix()
        self.assertIn('Matrix timestamp is stale',self.review()['blockers'])

    def test_future_matrix_timestamp_fails(self):
        self.matrix['generatedAt']=(self.now+timedelta(hours=2)).isoformat()
        self.write_matrix()
        self.assertIn('Matrix timestamp is in the future',self.review()['blockers'])

    def test_capture_matrix_timestamp_skew_fails(self):
        self.matrix['generatedAt']=(self.now-timedelta(hours=2)).isoformat()
        self.write_matrix()
        self.assertIn('30 minutes', str(self.review()['blockers']))

    def test_invalid_matrix_version_fails(self):
        self.matrix['milestone']='fake'
        self.write_matrix()
        self.assertIn('matrix milestone',str(self.review()['blockers']))

    def test_incomplete_phase_fails(self):
        self.matrix['results'][0]['stage']='navigate'
        self.write_matrix()
        self.assertIn('incomplete browser capture phase',str(self.review()['blockers']))

    def test_matrix_ready_false_fails(self):
        self.matrix['ready']=False
        self.write_matrix()
        self.assertFalse(self.review()['ready'])


if __name__=='__main__':unittest.main()
