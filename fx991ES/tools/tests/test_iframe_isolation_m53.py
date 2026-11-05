"""M53: ensure each canonical browser check starts with a fresh iframe."""
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT/'tests/browser-acceptance.js').read_text(encoding='utf-8')

class IframeIsolationTests(unittest.TestCase):
    def test_new_frame_for_each_check(self):
        self.assertIn('previous.cloneNode(false)', SOURCE)
        self.assertIn('previous.replaceWith(frame)', SOURCE)

    def test_navigation_listeners_removed(self):
        self.assertIn("frame.removeEventListener('load',loaded)", SOURCE)
        self.assertIn("frame.removeEventListener('error',failed)", SOURCE)

    def test_timeout_cancels_navigation(self):
        self.assertIn("frame.src='about:blank';reject(error)", SOURCE)

    def test_only_index_document_accepted(self):
        self.assertIn("win.location.pathname.endsWith('/index.html')", SOURCE)

    def test_storage_cleanup_is_opt_in(self):
        self.assertIn("removeItem('fx991.educational.recovery.opt-in')", SOURCE)
        self.assertIn("removeItem('fx991.educational.session.v1')", SOURCE)

    def test_infrastructure_errors_block_not_fail(self):
        self.assertIn('iframe navigation failed', SOURCE)
        self.assertIn('iframe did not load', SOURCE)
        self.assertIn("status=/timed out|did not initialize|iframe did not load|iframe navigation failed/", SOURCE)

    def test_script_syntax(self):
        r=subprocess.run(['node','--check',str(ROOT/'tests/browser-acceptance.js')],capture_output=True,text=True)
        self.assertEqual(r.returncode,0,r.stderr)

if __name__=='__main__':unittest.main()
