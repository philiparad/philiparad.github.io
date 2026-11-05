"""Fail-closed CI triage tests; simulated inputs test validation, not browser compatibility."""
import json
import sys
import tempfile
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ci_diagnostics import triage, render_html, load_json, main


class CiDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.matrix = {'schema': 'fx991-browser-matrix-run', 'ready': True,
                       'results': [dict(browser=b, status='PASS', stage='capture', passed=18, detail='18/18 passed')
                                   for b in ('chromium', 'firefox', 'webkit')]}
        self.decision = {'schema': 'fx991-release-decision-m40', 'status': 'APPROVED', 'blockers': []}

    def test_complete_example(self):
        result = triage(self.matrix, self.decision)
        self.assertTrue(result['ready'])
        self.assertEqual(result['issues'], [])

    def test_missing_matrix_blocks(self):
        self.assertFalse(triage(None, self.decision)['ready'])

    def test_missing_decision_blocks(self):
        self.assertFalse(triage(self.matrix, None)['ready'])

    def test_blocked_browser(self):
        self.matrix['results'][0]['status'] = 'BLOCKED'
        self.matrix['results'][0]['stage'] = 'navigate'
        x = triage(self.matrix, self.decision)
        self.assertFalse(x['ready'])
        self.assertTrue(any('HTTP server' in s for s in x['recommendedActions']))

    def test_failed_browser(self):
        self.matrix['results'][1]['status'] = 'FAIL'
        self.matrix['results'][1]['stage'] = 'execute'
        self.assertTrue(any('DOM assertions' in s for s in triage(self.matrix, self.decision)['recommendedActions']))

    def test_missing_browser(self):
        self.matrix['results'].pop()
        self.assertEqual(triage(self.matrix, self.decision)['browsers']['webkit']['status'], 'MISSING')

    def test_duplicate_browser(self):
        self.matrix['results'].append(self.matrix['results'][0].copy())
        self.assertFalse(triage(self.matrix, self.decision)['ready'])

    def test_blocked_release(self):
        self.decision['status'] = 'BLOCKED'
        self.assertFalse(triage(self.matrix, self.decision)['ready'])

    def test_invalid_status(self):
        self.matrix['results'][0]['status'] = 'ALMOST_PASS'
        self.assertEqual(triage(self.matrix, self.decision)['browsers']['chromium']['status'], 'INVALID')

    def test_hostile_diagnostics_escaped(self):
        self.matrix['results'][0]['detail'] = '<script>alert(1)</script>'
        html = render_html(triage(self.matrix, self.decision))
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_large_file_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'large.json'
            p.write_bytes(b'x'*2_000_001)
            self.assertIsNone(load_json(p)[0])

    def test_cli_missing_reports_writes_failure_files(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)/'diagnostics.json'
            self.assertEqual(main(['--out', str(out)]), 1)
            self.assertFalse(json.loads(out.read_text())['ready'])
            self.assertIn('Not', out.with_suffix('.html').read_text())


if __name__ == '__main__':
    unittest.main()