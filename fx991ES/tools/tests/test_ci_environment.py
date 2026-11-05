"""Milestone 46 preflight checks never substitute for live browser execution."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ci_environment as E

class EnvironmentTests(unittest.TestCase):
    def fake(self, **kw):
        return E.detect(playwright_found=True,node_path='/usr/bin/node',python_path='/usr/bin/python',
                        platform_name='Linux',browser_paths={x:'/no/such/browser/'+x for x in E.BROWSERS}, **kw)
    def test_missing_executables_block(self):
        r=self.fake()
        self.assertFalse(r['environmentReady'])
        self.assertEqual(len(r['browsers']),3)
    def test_missing_node_block(self):
        r=E.detect(stage='after-install',playwright_found=True,node_path='',python_path='/usr/bin/python',browser_paths={})
        self.assertFalse(r['environmentReady'])
    def test_missing_playwright_block(self):
        r=E.detect(stage='after-install',playwright_found=False,node_path='/usr/bin/node',browser_paths={})
        self.assertFalse(r['environmentReady'])
    def test_preinstall_never_approves_environment(self):
        r=self.fake(stage='before-install')
        self.assertIsNone(r['environmentReady'])
    def test_executable_paths_all_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            files={}
            for x in E.BROWSERS:
                p=Path(tmp,x);p.write_text('dummy');files[x]=str(p)
            r=E.detect(playwright_found=True,node_path='/usr/bin/node',python_path='/usr/bin/python',browser_paths=files)
            self.assertTrue(r['environmentReady'])
            Path(files['firefox']).unlink()
            self.assertFalse(E.detect(playwright_found=True,node_path='/usr/bin/node',browser_paths=files)['environmentReady'])
    def test_invalid_stage_rejected(self):
        with self.assertRaises(ValueError):E.detect(stage='release-approved')
    def test_json_and_markdown_outputs_when_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp,'report.json');md=Path(tmp,'report.md')
            rc=E.main(['--out',str(out),'--markdown',str(md),'--stage','before-install'])
            self.assertEqual(rc,0)
            self.assertEqual(json.loads(out.read_text())['schema'],E.SCHEMA)
            self.assertIn('does not demonstrate browser acceptance',md.read_text())
    def test_markdown_escapes_diagnostics(self):
        r=self.fake();r['issues']=['bad | <script> test']
        md=E.as_markdown(r)
        self.assertNotIn('<script>',md)
        self.assertIn(r'bad \|',md)
    def test_report_does_not_expose_environment_secrets(self):
        r=self.fake()
        self.assertNotIn('environ',r)
        self.assertNotIn('token',r)
    def test_after_install_missing_executable_fails_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            # Force dependency unavailability, independent of developer host.
            original=E.detect
            E.detect=lambda stage:original(stage=stage,playwright_found=False,node_path='',browser_paths={})
            try:self.assertEqual(E.main(['--out',str(Path(tmp,'out.json')),'--markdown',str(Path(tmp,'out.md'))]),1)
            finally:E.detect=original
            self.assertTrue(Path(tmp,'out.json').is_file())

if __name__=='__main__':unittest.main()
