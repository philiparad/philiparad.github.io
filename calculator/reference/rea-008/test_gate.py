#!/usr/bin/env python3
"""REA-008 source-gate unit tests. No manufacturer or hardware evidence."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("rea008_gate",HERE/"gate.py")
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)

class CapabilityGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((HERE/"capabilities.json").read_text(encoding="utf8"))
        cls.native_file=HERE.parent/"rea-001"/"manifest.json"
        cls.reference=json.loads(cls.native_file.read_text(encoding="utf8"))
    def check(self,manifest,sources=None):
        return gate.validate(manifest,self.reference,self.native_file.parent,sources or {})
    def test_current_manifest_passes_source_only(self):
        self.assertEqual([],self.check(self.manifest))
    def test_hardware_verified_without_evidence_fails(self):
        m=copy.deepcopy(self.manifest)
        m["features"][0]["status"]="hardware-verified"
        m["features"][0]["hardware_verified"]=True
        self.assertTrue(any("without native evidence" in x for x in self.check(m)))
    def test_forged_native_evidence_id_fails(self):
        m=copy.deepcopy(self.manifest)
        m["features"][0]["native_evidence_ids"]=["REF-001"]
        self.assertTrue(any("missing genuine CASIO reference" in x for x in self.check(m)))
    def test_mismatched_flag_fails(self):
        m=copy.deepcopy(self.manifest)
        m["features"][0]["hardware_verified"]=True
        self.assertTrue(any("flag and status disagree" in x for x in self.check(m)))
    def test_unknown_model_fails(self):
        m=copy.deepcopy(self.manifest)
        m["features"][0]["models"]=["unknown-model"]
        self.assertTrue(any("model IDs" in x for x in self.check(m)))
    def test_duplicate_feature_fails(self):
        m=copy.deepcopy(self.manifest)
        m["features"].append(copy.deepcopy(m["features"][0]))
        self.assertTrue(any("Duplicate capability" in x for x in self.check(m)))
    def test_positive_parity_claim_fails(self):
        issue=self.check(self.manifest,{"index.html":"Our calculator is a pixel-perfect CASIO replica."})
        self.assertTrue(any("unsupported device-parity assertion" in x for x in issue))
    def test_negative_parity_warning_allowed(self):
        issue=self.check(self.manifest,{"index.html":"This is NOT a pixel-perfect CASIO replica."})
        self.assertEqual([],issue)
    def test_source_regression_not_native_evidence(self):
        count=gate.genuine_reference_ids(self.reference,self.native_file.parent)
        self.assertEqual(0,len(count))
        self.assertEqual(0,len([f for f in self.manifest["features"] if f["hardware_verified"]]))
    def test_status_labels_all_used(self):
        statuses={f["status"] for f in self.manifest["features"]}
        self.assertTrue({"implemented","approximation","unsupported"}<=statuses)

if __name__=="__main__":
    unittest.main()
