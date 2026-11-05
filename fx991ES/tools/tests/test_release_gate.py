"""Release candidate integrity and fail-closed browser evidence checks."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import release_gate as gate


class ReleaseGateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'index.html').write_text('<html>calculator</html>', encoding='utf-8')
        (self.root / 'src').mkdir()
        (self.root / 'src' / 'engine.js').write_text('const n=2;', encoding='utf-8')
        self.write_manifest()

    def write_manifest(self):
        (self.root / gate.MANIFEST).write_text(json.dumps(gate.build_manifest(self.root)), encoding='utf-8')

    def test_manifest_is_candidate_not_approval(self):
        self.assertEqual(gate.build_manifest(self.root)['status'], 'CANDIDATE')

    def test_valid_manifest_passes_source_integrity(self):
        self.assertTrue(gate.audit_manifest(self.root)['ready'])

    def test_tampered_source_fails(self):
        (self.root / 'src' / 'engine.js').write_text('const n=3;', encoding='utf-8')
        self.assertIn('Modified file', str(gate.audit_manifest(self.root)['blockers']))

    def test_missing_source_fails(self):
        (self.root / 'src' / 'engine.js').unlink()
        self.assertIn('Missing file', str(gate.audit_manifest(self.root)['blockers']))

    def test_added_file_fails(self):
        (self.root / 'untracked.js').write_text('new content')
        self.assertIn('Unexpected file', str(gate.audit_manifest(self.root)['blockers']))

    def test_missing_manifest_fails(self):
        (self.root / gate.MANIFEST).unlink()
        self.assertFalse(gate.audit_manifest(self.root)['ready'])

    def test_modified_manifest_count_fails(self):
        p = self.root / gate.MANIFEST
        obj = json.loads(p.read_text()); obj['fileCount'] += 1
        p.write_text(json.dumps(obj))
        self.assertIn('file count', str(gate.audit_manifest(self.root)['blockers']))

    def test_cannot_self_certify_manifest(self):
        p = self.root / gate.MANIFEST
        obj = json.loads(p.read_text()); obj['status'] = 'APPROVED'
        p.write_text(json.dumps(obj))
        self.assertFalse(gate.audit_manifest(self.root)['ready'])

    def test_missing_browser_evidence_blocks_qualification(self):
        result = gate.qualify(self.root)
        self.assertFalse(result['ready']); self.assertEqual(result['browserEvidence'], 'MISSING')

    def test_invalid_browser_evidence_blocks_qualification(self):
        folder = self.root / 'browser-evidence'; folder.mkdir()
        result = gate.qualify(self.root, folder)
        self.assertFalse(result['ready']); self.assertEqual(result['browserEvidence'], 'FAIL')

    def test_browser_success_alone_cannot_override_tampered_source(self):
        (self.root/'index.html').write_text('changed')
        result=gate.qualify(self.root)
        self.assertEqual(result['sourceIntegrity'],'FAIL')
        self.assertFalse(result['ready'])

    def test_generated_evidence_is_excluded_from_source_inventory(self):
        (self.root/'browser-evidence').mkdir()
        (self.root/'browser-evidence'/'matrix-run.json').write_text('{}')
        self.assertTrue(gate.audit_manifest(self.root)['ready'])


if __name__ == '__main__':
    unittest.main()