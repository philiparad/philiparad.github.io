"""M55: distinguish infrastructure navigation failures from application failures."""
import subprocess
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=(ROOT/'tests/browser-acceptance.js').read_text(encoding='utf-8')
class FailureClassificationTests(unittest.TestCase):
    def test_explicit_navigation_error_tag(self):
        self.assertIn("error.kind='navigation'",SOURCE)
    def test_load_timeout_blocked(self):
        self.assertIn("navigationBlocked('calculator iframe loading timed out')",SOURCE)
    def test_failed_load_blocked(self):
        self.assertIn("navigationBlocked('calculator iframe navigation failed')",SOURCE)
    def test_wrong_page_blocked(self):
        self.assertIn("navigationBlocked('calculator iframe did not load index.html')",SOURCE)
    def test_app_not_initialized_fails(self):
        self.assertIn("expect(x.doc&&x.win.FX991&&x.doc.getElementById('lcd'),'calculator did not initialize')",SOURCE)
        self.assertNotIn('did not initialize|iframe did not load',SOURCE)
    def test_ui_import_timeout_fails_not_blocked(self):
        self.assertIn("throw Error('session UI import timed out')",SOURCE)
        self.assertNotIn('status=/timed out',SOURCE)
    def test_exception_classification_uses_tag_not_message(self):
        self.assertIn("status=error&&error.kind==='navigation'?'BLOCKED':'FAIL'",SOURCE)
    def test_js_syntax(self):
        result=subprocess.run(['node','--check',str(ROOT/'tests/browser-acceptance.js')],capture_output=True,text=True)
        self.assertEqual(result.returncode,0,result.stderr)
if __name__=='__main__': unittest.main()
