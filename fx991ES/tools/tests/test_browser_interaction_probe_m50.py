"""Milestone 50: ensure native-browser probes fail closed and remain real E2E checks."""
import importlib
from datetime import datetime, timezone
import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(TOOLS))
probe=importlib.import_module('browser_interaction_probe')

class InteractionProbeTests(unittest.TestCase):
    def good(self):
        return {'schema':'fx991-interaction-probe','milestone':51,
            'sourceDigest':'a'*64, 'generatedAt':datetime.now(timezone.utc).isoformat(),
            'targetUrl':'http://127.0.0.1:8100/index.html','results':[
            {'browser':b,'status':'PASS','stage':'complete','checks':[{'name':n,'status':'PASS'} for n in probe.CHECK_NAMES]}
            for b in ('chromium','firefox','webkit')]}
    def test_six_distinct_scenarios(self):self.assertEqual(len(set(probe.CHECK_NAMES)),6)
    def test_fully_successful_matrix(self):self.assertTrue(probe.validate_probe_report(self.good()))
    def test_missing_browser(self):self.assertFalse(probe.validate_probe_report({'schema':'fx991-interaction-probe','results':self.good()['results'][:2]}))
    def test_duplicate_browser(self):
        r=self.good();r['results'][1]['browser']='chromium';self.assertFalse(probe.validate_probe_report(r))
    def test_single_failed_check(self):
        r=self.good();r['results'][1]['checks'][3]['status']='FAIL';self.assertFalse(probe.validate_probe_report(r))
    def test_blocked_browser(self):
        r=self.good();r['results'][0]['status']='BLOCKED';self.assertFalse(probe.validate_probe_report(r))
    def test_missing_check(self):
        r=self.good();r['results'][0]['checks'].pop();self.assertFalse(probe.validate_probe_report(r))
    def test_reordered_checks(self):
        r=self.good();r['results'][0]['checks'].reverse();self.assertFalse(probe.validate_probe_report(r))
    def test_extra_check(self):
        r=self.good();r['results'][0]['checks'].append({'name':'fake','status':'PASS'});self.assertFalse(probe.validate_probe_report(r))
    def test_rejects_bad_schema(self):
        r=self.good();r['schema']='fake';self.assertFalse(probe.validate_probe_report(r))
    def test_single_browser_diagnostic_mode(self):
        r=self.good();r['results']=r['results'][:1];self.assertTrue(probe.validate_probe_report(r,('chromium',)))
    def test_real_native_actions_are_present(self):
        source=(TOOLS/'browser_interaction_probe.py').read_text(encoding='utf-8')
        for needle in ('page.keyboard.type','page.keyboard.press','set_input_files','page.set_viewport_size','new_context','page.goto','page.screenshot'):
            self.assertIn(needle,source)

if __name__=='__main__':unittest.main()
