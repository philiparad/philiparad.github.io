"""M54: a missing Playwright package must yield evidence, never a silent crash."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]

class DependencyFailureTests(unittest.TestCase):
    def execute(self, script, out):
        # -S disables site-packages, ensuring Playwright is unavailable without
        # mocking application behavior or manufacturing browser PASS reports.
        return subprocess.run([sys.executable, '-S', str(ROOT/'tools'/script),
               '--out', str(out)], cwd=ROOT, capture_output=True, text=True,
               timeout=30)

    def test_missing_dependency_emits_canonical_matrix(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = self.execute('browser_matrix.py',output)
            self.assertNotEqual(result.returncode, 0)
            evidence = json.loads((output/'matrix-run.json').read_text())
            self.assertEqual(evidence['schema'],'fx991-browser-matrix-run')
            self.assertEqual(len(evidence['results']),3)
            self.assertFalse(evidence['ready'])
            self.assertTrue(all(r['status']=='BLOCKED' and r['stage']=='launch' and r['passed']==0 for r in evidence['results']))
            self.assertTrue(all('Playwright dependency unavailable' in r['detail'] for r in evidence['results']))

    def test_missing_dependency_emits_native_interaction_report(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            result = self.execute('browser_interaction_probe.py',output)
            self.assertNotEqual(result.returncode,0)
            evidence = json.loads((output/'interaction-probe.json').read_text())
            self.assertEqual(evidence['schema'],'fx991-interaction-probe')
            self.assertEqual(len(evidence['results']),3)
            self.assertFalse(evidence['ready'])
            self.assertFalse(evidence['diagnosticPassed'])
            self.assertTrue(all(r['status']=='BLOCKED' and r['stage']=='launch' and not r['checks'] for r in evidence['results']))

    def test_missing_dependency_captures_share_source_fingerprint(self):
        with tempfile.TemporaryDirectory() as temp:
            base=Path(temp)
            self.execute('browser_matrix.py',base/'matrix')
            self.execute('browser_interaction_probe.py',base/'native')
            matrix=json.loads((base/'matrix'/'matrix-run.json').read_text())
            native=json.loads((base/'native'/'interaction-probe.json').read_text())
            self.assertEqual(matrix['sourceDigest'],native['sourceDigest'])
            self.assertEqual(len(matrix['sourceDigest']),64)

    def test_missing_dependency_reports_valid_time_and_location(self):
        with tempfile.TemporaryDirectory() as temp:
            out=Path(temp)
            self.execute('browser_matrix.py',out)
            report=json.loads((out/'matrix-run.json').read_text())
            self.assertIn('+00:00',report['generatedAt'])
            self.assertTrue(report['targetUrl'].startswith('http://127.0.0.1:'))
            self.assertTrue(report['targetUrl'].endswith('/tests/browser-acceptance.html'))

    def test_workflow_executes_matrix_even_if_install_fails(self):
        workflow=(ROOT/'.github/workflows/browser-acceptance.yml').read_text()
        self.assertIn('      - name: Run actual browser matrix\n        if: always()\n',workflow)
        self.assertIn('      - name: Run native end-to-end interactions in Chromium Firefox WebKit\n        if: always()\n',workflow)
        self.assertIn('      - name: Upload browser run evidence, even when blocked or failed\n        if: always()\n',workflow)

if __name__=='__main__':unittest.main()
