"""Test untrusted GitHub artifact processing; fixtures are NOT physical/browser evidence."""
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from actions_artifact_inspector import inspect_archive, safe_member_path, main, render_html

ROOT = Path(__file__).resolve().parents[2]


def make_zip(location, files):
    with zipfile.ZipFile(location, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for path, data in files.items():
            z.writestr(path, data)


class ActionsArtifactTests(unittest.TestCase):
    def test_path_traversal(self):
        with self.assertRaises(ValueError): safe_member_path('../browser-evidence/matrix-run.json')

    def test_absolute_path(self):
        with self.assertRaises(ValueError): safe_member_path('/browser-evidence/matrix-run.json')

    def test_backslash_path(self):
        with self.assertRaises(ValueError): safe_member_path('browser-evidence\\matrix-run.json')

    def test_unknown_root(self):
        with self.assertRaises(ValueError): safe_member_path('src/kernel.js')

    def test_extension_denied(self):
        with self.assertRaises(ValueError): safe_member_path('browser-evidence/evil.py')

    def test_github_flat_paths_supported(self):
        self.assertEqual(str(safe_member_path('matrix-run.json')), 'browser-evidence/matrix-run.json')

    def test_missing_evidence_never_passes(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'empty.zip'
            make_zip(p, {'browser-evidence/readme.txt': 'none'})
            result = inspect_archive(p, root=ROOT)
            self.assertFalse(result['evidenceComplete'])
            self.assertFalse(result['releaseQualified'])
            self.assertTrue(any('Missing' in x for x in result['blockers']))

    def test_blocked_matrix_is_triaged(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)/'blocked.zip'
            sample = {'schema': 'fx991-browser-matrix-run', 'milestone': 41,
                      'ready': False, 'sourceDigest':'wrong', 'targetUrl':'http://127.0.0.1/tests/browser-acceptance.html',
                      'generatedAt':'2026-11-05T10:00:00+00:00',
                      'results':[{'browser':b,'status':'BLOCKED','stage':'navigate','detail':'ERR_BLOCKED_BY_ADMINISTRATOR'} for b in ('chromium','firefox','webkit')]}
            make_zip(p, {'browser-evidence/matrix-run.json':json.dumps(sample)})
            result = inspect_archive(p, root=ROOT)
            self.assertEqual(result['browsers']['chromium']['status'], 'BLOCKED')
            self.assertFalse(result['evidenceComplete'])
            self.assertFalse(result['ciRunAuthenticated'])

    def test_duplicate_paths_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'duplicate.zip'
            with zipfile.ZipFile(p,'w') as z:
                z.writestr('browser-evidence/matrix-run.json','{}')
                z.writestr('matrix-run.json','{}')
            with self.assertRaises(ValueError): inspect_archive(p, root=ROOT)

    def test_zip_bomb_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bomb.zip'
            make_zip(p, {'browser-evidence/matrix-run.json':'A'*500_000})
            with self.assertRaises(ValueError): inspect_archive(p, root=ROOT)

    def test_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'link.zip'
            with zipfile.ZipFile(p,'w') as z:
                info=zipfile.ZipInfo('browser-evidence/matrix-run.json')
                info.create_system=3
                info.external_attr=(0o120777 << 16)
                z.writestr(info, 'link')
            with self.assertRaises(ValueError): inspect_archive(p, root=ROOT)

    def test_html_is_escaped(self):
        report={'evidenceComplete':False,'blockers':['<script>alert(1)</script>'],'browsers':{}}
        html=render_html(report)
        self.assertNotIn('<script>',html)
        self.assertIn('&lt;script&gt;',html)

    def test_cli_writes_blocked_report(self):
        with tempfile.TemporaryDirectory() as d:
            archive=Path(d)/'invalid.zip'; archive.write_text('not a zip')
            out=Path(d)/'inspection.json'
            self.assertEqual(main([str(archive),'--out',str(out),'--root',str(ROOT)]),1)
            self.assertFalse(json.loads(out.read_text())['evidenceComplete'])
            self.assertTrue(out.with_suffix('.html').exists())


if __name__ == '__main__': unittest.main()
