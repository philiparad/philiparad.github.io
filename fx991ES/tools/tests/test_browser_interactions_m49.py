"""Milestone 49: guard real DOM interaction acceptance semantics against regression."""
import re
import subprocess
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
JS=(ROOT/'tests/browser-acceptance.js').read_text(encoding='utf-8')
HTML=(ROOT/'tests/browser-acceptance.html').read_text(encoding='utf-8')

class BrowserInteractionTests(unittest.TestCase):
    def test_js_syntax(self):
        subprocess.run(['node','--check',str(ROOT/'tests/browser-acceptance.js')],check=True,timeout=10)
    def test_canonical_eighteen_tests_are_preserved(self):
        from sys import path
        import importlib
        path.insert(0,str(ROOT/'tools'))
        try: matrix=importlib.import_module('browser_matrix')
        finally: path.pop(0)
        names=re.findall(r"\['([^']+)',\s*async x=>",JS)
        self.assertEqual(tuple(names),matrix.EXPECTED_NAMES)
    def test_keyboard_test_checks_event_handling_and_focus_isolation(self):
        self.assertIn('event.defaultPrevented',JS)
        self.assertIn('input.dispatchEvent(textKey)',JS)
        self.assertIn('!textKey.defaultPrevented',JS)
    def test_physical_key_test_covers_clear_and_reentry(self):
        self.assertIn("clickKey(x.doc,'AC')",JS)
        self.assertIn("'Result: 20'",JS)
    def test_fraction_test_covers_partial_and_complete_slots(self):
        self.assertIn('empty fraction not marked incomplete',JS)
        self.assertIn('completed fraction still marked incomplete',JS)
    def test_session_test_uses_real_file_input_and_optin(self):
        for fragment in ('new x.win.DataTransfer()', 'new x.win.File(', 'input.files=data.files', 'S.enabled(x.win.localStorage)', 'disabling recovery did not clear storage'):
            self.assertIn(fragment,JS)
    def test_all_interactions_reject_runtime_errors(self):
        self.assertIn('await fn(x);',JS)
        self.assertIn('calculator JavaScript errors during interaction',JS)
    def test_evidence_version_and_title(self):
        self.assertIn('milestone:49,generatedAt',JS)
        self.assertIn('Milestone 49 — Browser Acceptance',HTML)
    def test_real_iframe_used(self):
        self.assertIn("frame.src='../index.html?browser-acceptance='",JS)
        self.assertIn('sandbox="allow-scripts allow-same-origin"',HTML)

if __name__=='__main__':unittest.main()
