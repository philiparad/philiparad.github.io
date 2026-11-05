"""Milestone 56: the two Playwright runners must capture from one origin."""
import importlib
from pathlib import Path
import sys
import tempfile
import unittest

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
shared = importlib.import_module('shared_browser_session')
probe = importlib.import_module('browser_interaction_probe')


class SharedOriginTests(unittest.TestCase):
    def test_command_paths(self):
        a, b = shared.commands('http://127.0.0.1:12345', 'evidence', python='python3')
        self.assertTrue(a[1].endswith('browser_matrix.py'))
        self.assertTrue(b[1].endswith('browser_interaction_probe.py'))

    def test_both_commands_use_exact_same_origin(self):
        a, b = shared.commands('http://127.0.0.1:12345', 'evidence')
        self.assertEqual(a[a.index('--base-url') + 1], b[b.index('--base-url') + 1])

    def test_both_write_into_same_evidence_directory(self):
        a, b = shared.commands('http://127.0.0.1:12345', 'evidence')
        self.assertEqual(a[a.index('--out') + 1], b[b.index('--out') + 1])

    def run_mocked(self, codes):
        class Result:
            def __init__(self, code): self.returncode = code
        visited = []
        def runner(command, **kwargs):
            visited.append((command, kwargs))
            return Result(codes[len(visited)-1])
        with tempfile.TemporaryDirectory() as d:
            outcome = shared.execute(Path(d)/'evidence', runner=runner)
        return outcome, visited

    def test_both_success_required(self):
        result, visited = self.run_mocked([0, 0])
        self.assertEqual(result, 0)
        self.assertEqual(len(visited), 2)

    def test_canonical_failure_cannot_be_ignored(self):
        result, visited = self.run_mocked([1, 0])
        self.assertEqual(result, 1)
        self.assertEqual(len(visited), 2)

    def test_native_failure_cannot_be_ignored(self):
        result, visited = self.run_mocked([0, 1])
        self.assertEqual(result, 1)
        self.assertEqual(len(visited), 2)

    def test_invocation_error_continues_to_second_runner(self):
        calls = []
        def runner(command, **kwargs):
            calls.append(command)
            if len(calls) == 1: raise OSError('injected exec failure')
            class Result: returncode = 0
            return Result()
        with tempfile.TemporaryDirectory() as d:
            result = shared.execute(Path(d), runner=runner)
        self.assertEqual(result, 1)
        self.assertEqual(len(calls), 2)

    def test_live_runner_commands_share_port(self):
        result, visited = self.run_mocked([0, 0])
        a = visited[0][0]
        b = visited[1][0]
        self.assertEqual(a[a.index('--base-url')+1], b[b.index('--base-url')+1])
        self.assertTrue(a[a.index('--base-url')+1].startswith('http://127.0.0.1:'))

    def test_native_runner_accepts_shared_base_url(self):
        source = (TOOLS/'browser_interaction_probe.py').read_text(encoding='utf-8')
        self.assertIn("ap.add_argument('--base-url'", source)
        self.assertIn("args.base_url.rstrip('/') + '/index.html'", source)

    def test_workflow_invokes_shared_session_only(self):
        text = (TOOLS.parent/'.github/workflows/browser-acceptance.yml').read_text(encoding='utf-8')
        self.assertIn('python tools/shared_browser_session.py --out browser-evidence', text)
        self.assertNotIn('run: python tools/browser_matrix.py --out browser-evidence', text)
        self.assertNotIn('run: python tools/browser_interaction_probe.py --out browser-evidence', text)

    def test_audit_indeed_enforces_origin(self):
        good = 'http://127.0.0.1:12345/index.html'
        canonical = 'http://127.0.0.1:12345/tests/browser-acceptance.html'
        different = 'http://127.0.0.1:12346/tests/browser-acceptance.html'
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        # Complete passing evidence isolates the origin check itself.
        checks = [{'name': n, 'status':'PASS'} for n in probe.CHECK_NAMES]
        report = {'schema':'fx991-interaction-probe','milestone':51,'sourceDigest':'a'*64,
                  'generatedAt':now.isoformat(),'targetUrl':good,
                  'results':[{'browser':b,'status':'PASS','stage':'complete','checks':checks}
                             for b in ('chromium','firefox','webkit')]}
        self.assertEqual(probe.audit_probe_evidence(report,expected_digest='a'*64,matrix_target=canonical,matrix_time=now,now=now),[])
        self.assertTrue(any('origin' in issue for issue in probe.audit_probe_evidence(report,expected_digest='a'*64,matrix_target=different,matrix_time=now,now=now)))


if __name__ == '__main__': unittest.main()
