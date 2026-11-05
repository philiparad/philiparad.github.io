"""Milestone 40: human-readable release decision, no invented evidence."""
from datetime import datetime,timezone
from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import release_gate
import release_report as rr


class ReleaseReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
        (self.root/'index.html').write_text('HTML',encoding='utf8')
        (self.root/'release-manifest.json').write_text(json.dumps(release_gate.build_manifest(self.root)),encoding='utf8')
        self.now=datetime(2026,11,5,10,0,tzinfo=timezone.utc)

    def test_missing_evidence_blocks_release(self):
        r=rr.decision(self.root,now=self.now)
        self.assertFalse(r['qualified'])
        self.assertEqual(r['status'],'BLOCKED')
        self.assertEqual(r['requirements']['browserMatrix'],'MISSING')

    def test_unverified_hardware_is_never_certified(self):
        self.assertEqual(rr.decision(self.root)['requirements']['physicalCasio'],'UNVERIFIED')

    def test_tampering_source_blocks_release(self):
        (self.root/'index.html').write_text('CHANGED',encoding='utf8')
        r=rr.decision(self.root)
        self.assertEqual(r['requirements']['sourceManifest'],'FAIL')

    def test_missing_matrix_failure_is_visible_in_html(self):
        rendered=rr.render_html(rr.decision(self.root,now=self.now))
        self.assertIn('No browser evidence directory supplied',rendered)

    def test_report_is_static_without_remote_assets(self):
        rendered=rr.render_html(rr.decision(self.root))
        self.assertNotIn('<script',rendered)
        self.assertNotIn('href="http',rendered)

    def test_escapes_hostile_blocker_text(self):
        r=rr.decision(self.root)
        r['blockers']=['<script>alert("x")</script>']
        page=rr.render_html(r)
        self.assertNotIn('<script>',page)
        self.assertIn('&lt;script&gt;',page)

    def test_escapes_hostile_requirements(self):
        r=rr.decision(self.root)
        r['requirements']['chromium']='<img src=x onerror=alert(1)>'
        self.assertNotIn('<img',rr.render_html(r))

    def test_invalid_schema_is_rejected(self):
        with self.assertRaises(ValueError): rr.render_html({'schema':'other'})

    def test_qualified_only_if_underlying_gate_is_ready(self):
        fake={'ready':True,'generatedAt':self.now.isoformat(), 'sourceIntegrity':'PASS',
              'browserEvidence':'PASS','browserResults':{'chromium':'18/18','firefox':'18/18','webkit':'18/18'},'blockers':[]}
        with patch.object(rr,'qualify',return_value=fake):
            result=rr.decision(self.root)
        self.assertTrue(result['qualified'])
        self.assertEqual(result['status'],'APPROVED')
        self.assertEqual(result['requirements']['physicalCasio'],'UNVERIFIED')

    def test_main_writes_both_reports_and_fails_closed(self):
        out=self.root/'release-evidence'
        code=rr.main(['--root',str(self.root),'--out',str(out)])
        self.assertEqual(code,1)
        self.assertEqual(json.loads((out/'release-decision.json').read_text())['status'],'BLOCKED')
        self.assertIn('BLOCKED',(out/'release-decision.html').read_text())

if __name__=='__main__': unittest.main()
