"""Milestone 45 test evidence summary (fixtures never claim real browser certification)."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import ci_matrix_summary as S
from browser_matrix import BROWSERS,EXPECTED_NAMES,REQUIRED_CHECKS

def valid_matrix():
    return {'schema':'fx991-browser-matrix-run','ready':True,'results':[
        {'browser':b,'status':'PASS','stage':'capture','passed':REQUIRED_CHECKS,
         'names':list(EXPECTED_NAMES),'capture':b+'-acceptance.json',
         'detail':'18/18 passed','errors':[]} for b in BROWSERS]}

class SummaryTests(unittest.TestCase):
    def test_empty_is_blocked(self):
        r=S.summarize(None)
        self.assertFalse(r['browserQualified'])
        self.assertEqual(len(r['browsers']),3)
    def test_complete_valid_matrix_is_diagnostic_pass(self):
        r=S.summarize(valid_matrix())
        self.assertTrue(r['browserQualified'])
        self.assertFalse(r['blockers'])
    def test_missing_engine_rejected(self):
        m=valid_matrix();m['results'].pop()
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_duplicate_engine_rejected(self):
        m=valid_matrix();m['results'].append(m['results'][0])
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_fake_pass_without_capture_rejected(self):
        m=valid_matrix();del m['results'][0]['capture']
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_fake_pass_wrong_names_rejected(self):
        m=valid_matrix();m['results'][0]['names']=list(EXPECTED_NAMES[:-1])+['fake']
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_browser_console_errors_reject_pass(self):
        m=valid_matrix();m['results'][0]['errors']=['Uncaught TypeError']
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_failed_case_is_blocked(self):
        m=valid_matrix();m['results'][1].update(status='FAIL',detail='Wrong output')
        r=S.summarize(m)
        self.assertFalse(r['browserQualified'])
        self.assertIn('firefox FAIL', ' '.join(r['blockers']))
    def test_ready_flag_cannot_override_missing_browser(self):
        m=valid_matrix();m['ready']=False
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_nan_count_rejected(self):
        m=valid_matrix();m['results'][0]['passed']=True
        self.assertFalse(S.summarize(m)['browserQualified'])
    def test_markdown_sanitizes_markup_and_newlines(self):
        m=valid_matrix();m['results'][0].update(status='FAIL',detail='bad|cell\n<script>')
        md=S.markdown(S.summarize(m))
        self.assertNotIn('<script>',md)
        self.assertIn('bad\\|cell',md)
        self.assertNotIn('cell\n<script>',md)
    def test_missing_matrix_produces_outputs(self):
        with tempfile.TemporaryDirectory() as d:
            args=['--matrix',str(Path(d,'missing.json')),'--out',str(Path(d,'report.json')),
                  '--markdown',str(Path(d,'report.md'))]
            self.assertEqual(S.main(args),1)
            self.assertTrue(Path(d,'report.md').exists())
            self.assertFalse(json.loads(Path(d,'report.json').read_text())['browserQualified'])
    def test_valid_matrix_writes_report(self):
        with tempfile.TemporaryDirectory() as d:
            Path(d,'matrix.json').write_text(json.dumps(valid_matrix()))
            self.assertEqual(S.main(['--matrix',str(Path(d,'matrix.json')),'--out',str(Path(d,'out.json')),
                                     '--markdown',str(Path(d,'out.md'))]),0)
            self.assertIn('| chromium |',Path(d,'out.md').read_text())

if __name__=='__main__':unittest.main()
