"""M51 regression: native browser evidence never qualifies a partial or mixed run."""
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import browser_interaction_probe as probe
import release_gate
import release_report

NOW = datetime(2026,11,5,13,0,tzinfo=timezone.utc)
URL = 'http://127.0.0.1:8123/index.html'
TARGET = 'http://127.0.0.1:8123/tests/browser-acceptance.html'
DIGEST = 'f'*64


def good():
    return {
        'schema':'fx991-interaction-probe', 'milestone':51,
        'sourceDigest':DIGEST, 'generatedAt':NOW.isoformat(), 'targetUrl':URL,
        'results':[{'browser':name,'stage':'complete','status':'PASS','checks':[
            {'name':test,'status':'PASS','detail':''} for test in probe.CHECK_NAMES
        ]} for name in ('chromium','firefox','webkit')],
    }


def problems(report, matrix_target=TARGET, matrix_time=NOW, now=NOW):
    return probe.audit_probe_evidence(report, expected_digest=DIGEST,
       matrix_target=matrix_target, matrix_time=matrix_time, now=now)


class NativeQualificationTests(unittest.TestCase):
    def test_three_browser_report_accepted(self):
        self.assertTrue(probe.validate_probe_report(good()))
        self.assertEqual(problems(good()), [])

    def test_single_browser_diagnostic_cannot_qualify_full_matrix(self):
        r=good();r['results']=r['results'][:1]
        self.assertTrue(probe.validate_probe_report(r, ('chromium',)))
        self.assertFalse(probe.validate_probe_report(r))

    def test_empty_requested_browsers_never_pass(self):
        r=good();r['results']=[]
        self.assertFalse(probe.validate_probe_report(r, ()))

    def test_duplicate_requested_browser_is_rejected(self):
        r=good();r['results']=r['results'][:1]*2
        self.assertFalse(probe.validate_probe_report(r, ('chromium','chromium')))

    def test_missing_source_fingerprint_is_rejected(self):
        r=good();r.pop('sourceDigest');self.assertFalse(probe.validate_probe_report(r))

    def test_malformed_fingerprint_is_rejected(self):
        r=good();r['sourceDigest']='INVALID';self.assertFalse(probe.validate_probe_report(r))

    def test_wrong_fingerprint_does_not_qualify(self):
        r=good();r['sourceDigest']='a'*64
        self.assertIn('fingerprint',str(problems(r)))

    def test_missing_timestamp_is_rejected(self):
        r=good();r.pop('generatedAt');self.assertFalse(probe.validate_probe_report(r))

    def test_naive_timestamp_is_rejected(self):
        r=good();r['generatedAt']='2026-11-05T13:00:00';self.assertFalse(probe.validate_probe_report(r))

    def test_stale_report_is_blocked(self):
        r=good();r['generatedAt']=(NOW-timedelta(days=4)).isoformat()
        self.assertIn('stale',str(problems(r)))

    def test_future_report_is_blocked(self):
        r=good();r['generatedAt']=(NOW+timedelta(minutes=10)).isoformat()
        self.assertIn('future',str(problems(r)))

    def test_capture_matrix_time_skew_blocks(self):
        self.assertIn('30 minutes',str(problems(good(),matrix_time=NOW-timedelta(hours=1))))

    def test_capture_wrong_origin_blocks(self):
        r=good();r['targetUrl']='http://127.0.0.1:8124/index.html'
        self.assertIn('origin',str(problems(r)))

    def test_wrong_capture_path_is_rejected(self):
        r=good();r['targetUrl']='https://example.org/other'
        self.assertFalse(probe.validate_probe_report(r))

    def test_missing_browser_stage_is_rejected(self):
        r=good();r['results'][0].pop('stage')
        self.assertFalse(probe.validate_probe_report(r))

    def test_failed_actual_interaction_blocks(self):
        r=good();r['results'][1]['checks'][2]['status']='FAIL'
        self.assertFalse(probe.validate_probe_report(r))

    def test_fake_completed_without_checks_blocks(self):
        r=good();r['results'][0]['checks']=[]
        self.assertFalse(probe.validate_probe_report(r))

    def test_cross_browser_names_must_match(self):
        r=good();r['results'][2]['browser']='chromium'
        self.assertFalse(probe.validate_probe_report(r))

    def test_navigation_failure_closes_context(self):
        browser=MagicMock()
        context=browser.new_context.return_value
        context.new_page.return_value.goto.side_effect=RuntimeError('navigation blocked')
        with self.assertRaisesRegex(RuntimeError,'navigation blocked'):
            probe.fresh_page(browser,URL)
        context.close.assert_called_once()

    def test_successful_fresh_page_does_not_close_context(self):
        browser=MagicMock()
        ctx,page,errors=probe.fresh_page(browser,URL)
        self.assertIs(ctx,browser.new_context.return_value)
        ctx.close.assert_not_called()
        self.assertEqual(errors,[])


class ReleaseGateIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        (self.root/'index.html').write_text('calculator',encoding='utf-8')
        (self.root/release_gate.MANIFEST).write_text(
            json.dumps(release_gate.build_manifest(self.root)),encoding='utf-8')
        self.evidence=self.root/'browser-evidence';self.evidence.mkdir()
        (self.evidence/'matrix-run.json').write_text(json.dumps({'generatedAt':NOW.isoformat(),
            'targetUrl':TARGET}),encoding='utf-8')
        self.native=good();self.write_native()

    def write_native(self):
        (self.evidence/'interaction-probe.json').write_text(json.dumps(self.native),encoding='utf-8')

    def qualified(self):
        with patch.object(release_gate,'review_directory',return_value={'ready':True,'checks':{
            'chromium':'18/18','firefox':'18/18','webkit':'18/18'},'blockers':[]}),\
             patch.object(release_gate,'source_digest',return_value=DIGEST):
            return release_gate.qualify(self.root,self.evidence,now=NOW)

    def test_valid_canonical_and_native_evidence_allows_browser_qualification(self):
        r=self.qualified();self.assertTrue(r['ready']);self.assertEqual(r['nativeInteractions'],'PASS')

    def test_missing_native_file_blocks_even_if_canonical_passes(self):
        (self.evidence/'interaction-probe.json').unlink()
        r=self.qualified();self.assertFalse(r['ready']);self.assertEqual(r['nativeInteractions'],'FAIL')

    def test_single_browser_native_report_blocks_even_if_canonical_passes(self):
        self.native['results']=self.native['results'][:1];self.write_native()
        r=self.qualified();self.assertFalse(r['ready']);self.assertEqual(r['nativeInteractions'],'FAIL')

    def test_failed_native_test_blocks_even_if_canonical_passes(self):
        self.native['results'][0]['checks'][0]['status']='FAIL';self.write_native()
        self.assertFalse(self.qualified()['ready'])

    def test_wrong_native_source_blocks_even_if_canonical_passes(self):
        self.native['sourceDigest']='e'*64;self.write_native()
        self.assertIn('fingerprint',str(self.qualified()['blockers']))

    def test_release_decision_displays_native_requirement(self):
        with patch.object(release_report,'qualify',return_value={
            'ready':False,'generatedAt':NOW.isoformat(),'sourceIntegrity':'PASS',
            'browserEvidence':'PASS','nativeInteractions':'FAIL','blockers':['native blocked']}):
            report=release_report.decision(self.root)
        self.assertEqual(report['requirements']['nativeInteractions'],'FAIL')
        self.assertIn('Six native interaction checks',release_report.render_html(report))

if __name__=='__main__':unittest.main()
