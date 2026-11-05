"""Offline tests for the browser-evidence release gate; no browsers required."""
import importlib.util
from pathlib import Path
import unittest
from datetime import datetime, timezone

spec = importlib.util.spec_from_file_location('browser_matrix', Path(__file__).resolve().parents[1]/'browser_matrix.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class EvidenceGateTests(unittest.TestCase):
    def sample(self, browser='chromium', status='PASS'):
        agents = {'chromium':'Mozilla/5.0 Chrome/120.0', 'firefox':'Mozilla/5.0 Firefox/120.0',
                  'webkit':'Mozilla/5.0 AppleWebKit/605.1 Safari/605.1'}
        return {'schema':m.SCHEMA, 'milestone':36, 'userAgent':agents[browser],
                'generatedAt':'2026-11-05T08:00:00+00:00',
                'location':'https://example.org/fx991ES/tests/browser-acceptance.html',
                'summary':f'{18 if status=="PASS" else 0}/18 browser checks passed; {0 if status=="PASS" else 18} failed; 0 blocked',
                'results':[{'name':name,'status':status} for name in m.EXPECTED_NAMES]}

    def test_valid_capture(self):
        names,count=m.check_capture(self.sample(),'chromium')
        self.assertEqual(len(names),18)
        self.assertEqual(count,18)

    def test_reject_duplicate_checks(self):
        data=self.sample()
        data['results'][1]['name']=data['results'][0]['name']
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            m.check_capture(data,'chromium')

    def test_reject_short_report(self):
        data=self.sample();data['results'].pop()
        with self.assertRaisesRegex(ValueError,'Expected 18'):
            m.check_capture(data,'chromium')

    def test_reject_spoofed_browser_label(self):
        with self.assertRaisesRegex(ValueError,'Firefox'):
            m.check_capture(self.sample('chromium'),'firefox')

    def test_reject_invalid_status(self):
        data=self.sample();data['results'][0]['status']='SKIPPED'
        with self.assertRaisesRegex(ValueError,'Invalid check status'):
            m.check_capture(data,'chromium')

    def test_fail_closed_when_missing_browser(self):
        self.assertFalse(m.aggregate([{'browser':'chromium','status':'PASS','names':['a']}]))

    def test_pass_matching_three_browser_matrix(self):
        rows=[dict(browser=b,status='PASS',names=list(m.EXPECTED_NAMES)) for b in m.BROWSERS]
        self.assertTrue(m.aggregate(rows))

    def test_fail_mismatched_check_names(self):
        rows=[dict(browser=b,status='PASS',names=list(m.EXPECTED_NAMES)) for b in m.BROWSERS]
        rows[1]['names']=list(m.EXPECTED_NAMES[:-1])+['substituted check']
        self.assertFalse(m.aggregate(rows))

    def test_fail_blocked_browser(self):
        rows=[dict(browser=b,status='PASS',names=list(m.EXPECTED_NAMES)) for b in m.BROWSERS]
        rows[2]['status']='BLOCKED'
        self.assertFalse(m.aggregate(rows))

    def test_reject_substituted_check_name(self):
        data=self.sample()
        data['results'][7]['name']='Placeholder check'
        with self.assertRaisesRegex(ValueError,'manifest'):
            m.check_capture(data,'chromium')

    def test_reject_reordered_checks(self):
        data=self.sample()
        data['results'][1],data['results'][2]=data['results'][2],data['results'][1]
        with self.assertRaisesRegex(ValueError,'manifest'):
            m.check_capture(data,'chromium')

    def test_gate_rejects_correct_count_wrong_manifest(self):
        rows=[dict(browser=b,status='PASS',names=list(m.EXPECTED_NAMES)) for b in m.BROWSERS]
        rows[0]['names'][0]='different assertion'
        self.assertFalse(m.aggregate(rows))

    def test_reject_missing_capture_url(self):
        raw=self.sample();raw.pop('location')
        with self.assertRaisesRegex(ValueError,'location'):m.check_capture(raw,'chromium')

    def test_reject_invalid_capture_url(self):
        raw=self.sample();raw['location']='javascript:alert(1)'
        with self.assertRaisesRegex(ValueError,'page URL'):m.check_capture(raw,'chromium')

    def test_reject_capture_wrong_page(self):
        raw=self.sample();raw['location']='https://example.org/index.html'
        with self.assertRaisesRegex(ValueError,'page URL'):m.check_capture(raw,'chromium')

    def test_reject_timestamp_without_timezone(self):
        raw=self.sample();raw['generatedAt']='2026-11-05T08:00:00'
        with self.assertRaisesRegex(ValueError,'timestamp'):m.check_capture(raw,'chromium')

    def test_reject_invalid_timestamp(self):
        raw=self.sample();raw['generatedAt']='not-a-time'
        with self.assertRaisesRegex(ValueError,'timestamp'):m.check_capture(raw,'chromium')

    def test_reject_falsified_summary(self):
        raw=self.sample();raw['results'][0]['status']='FAIL'
        with self.assertRaisesRegex(ValueError,'summary'):m.check_capture(raw,'chromium')

    def test_reject_non_string_diagnostic(self):
        raw=self.sample();raw['results'][0]['message']={'error':'bad'}
        with self.assertRaisesRegex(ValueError,'diagnostic'):m.check_capture(raw,'chromium')

    def test_accept_failed_report_with_truthful_summary(self):
        raw=self.sample(status='FAIL')
        names,count=m.check_capture(raw,'chromium')
        self.assertEqual(count,0)

    def test_exact_canonical_manifest(self):
        self.assertEqual(len(m.EXPECTED_NAMES),18)
        self.assertEqual(len(set(m.EXPECTED_NAMES)),18)
        self.assertTrue(m.aggregate([dict(browser=b,status='PASS',names=list(m.EXPECTED_NAMES)) for b in m.BROWSERS]))



class Milestone38FailureClassificationTests(unittest.TestCase):
    def test_navigation_admin_block_is_infrastructure(self):
        self.assertEqual(m.classify_failure('navigate', RuntimeError('net::ERR_BLOCKED_BY_ADMINISTRATOR')), 'BLOCKED')

    def test_missing_browser_binary_is_infrastructure(self):
        self.assertEqual(m.classify_failure('launch', RuntimeError("Executable doesn't exist")), 'BLOCKED')

    def test_post_navigation_timeout_is_real_failure(self):
        self.assertEqual(m.classify_failure('execute', TimeoutError('Timeout 150000ms exceeded')), 'FAIL')

    def test_download_failure_is_not_excused(self):
        self.assertEqual(m.classify_failure('capture', TimeoutError('Timeout downloading report')), 'FAIL')

    def test_url_prefix_spoof_rejected(self):
        expected='https://example.com/fx991ES/tests/browser-acceptance.html'
        self.assertFalse(m.same_origin_and_path('https://example.com.attacker.invalid/fx991ES/tests/browser-acceptance.html',expected))
        self.assertFalse(m.same_origin_and_path('https://example.com/fx991ES/tests/browser-acceptance.html?x=1',expected))
        self.assertTrue(m.same_origin_and_path(expected,expected))

if __name__ == '__main__':
    unittest.main()
