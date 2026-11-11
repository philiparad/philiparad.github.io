#!/usr/bin/env python3
"""REA-099: model-specific provenance checks; fixtures are NOT CASIO evidence."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("rea099_gate",HERE/"gate.py")
gate=importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class ModelSpecificEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base=json.loads((HERE/"capabilities.json").read_text(encoding="utf8"))
        native=HERE.parent/"rea-001"/"manifest.json"
        cls.reference=json.loads(native.read_text(encoding="utf8"))
        cls.root=native.parent

    def altered(self):
        manifest=copy.deepcopy(self.base)
        feature=manifest["features"][0]
        feature["status"]="hardware-verified"
        feature["hardware_verified"]=True
        return manifest,feature

    def validate(self,manifest):
        return gate.validate(manifest,self.reference,self.root)

    def test_current_manifest_has_no_hardware_claims(self):
        self.assertEqual([],self.validate(self.base))
        self.assertEqual(0,sum(f["hardware_verified"] for f in self.base["features"]))
        self.assertEqual(0,len(gate.genuine_reference_ids(self.reference,self.root)))

    def test_claim_without_model_coverage_is_blocked(self):
        manifest,feature=self.altered()
        self.assertTrue(any("missing per-model verification coverage" in x
                            for x in self.validate(manifest)))

    def test_only_one_model_is_not_three_model_proof(self):
        manifest,feature=self.altered()
        feature["verified_models"]=["fx-991es"]
        self.assertTrue(any("verified_models must match advertised models" in x
                            for x in self.validate(manifest)))

    def test_duplicate_verified_model_is_blocked(self):
        manifest,feature=self.altered()
        feature["verified_models"]=feature["models"]+["fx-991es"]
        self.assertTrue(any("verified_models must match advertised models" in x
                            for x in self.validate(manifest)))

    def test_fake_original_case_id_cannot_certify_c_model(self):
        manifest,feature=self.altered()
        feature["native_evidence_ids"]=["REF-001"]
        feature["verified_models"]=feature["models"][:]
        issues=self.validate(manifest)
        self.assertTrue(any("missing genuine CASIO reference evidence" in x for x in issues))
        self.assertTrue(any("missing independently reviewed native comparison" in x for x in issues))

    def test_manual_only_or_source_test_cannot_certify(self):
        manifest,feature=self.altered()
        feature["verified_models"]=feature["models"][:]
        feature["test_evidence_ids"]=["source-regression","manual-example"]
        self.assertTrue(any("cannot claim hardware verification" in x
                            for x in self.validate(manifest)))

    def test_wrong_feature_rejected(self):
        case={"feature_id":"matrix","model_id":"fx-991es","keys":["2","EQUAL"],
              "capture":{"source_device":"CASIO fx-991ES","capture_date":"2026-11-11","operator":"operator"},
              "verification_status":"DEVICE_REVIEWED_PASS",
              "comparison":{"status":"PASS","reviewer":"independent","reviewed_at":"2026-11-11",
                            "web_capture_id":"WEB-001","matched_steps":3}}
        self.assertFalse(gate.matching_evidence(case,"memory","fx-991es"))
        self.assertFalse(gate.matching_evidence(case,"matrix","fx-991es-plus"))
        self.assertTrue(gate.matching_evidence(case,"matrix","fx-991es"))

    def test_self_review_and_missing_key_sequence_rejected(self):
        case={"feature_id":"memory","model_id":"fx-991es","keys":["EQUAL"],
              "capture":{"source_device":"CASIO original","capture_date":"2026-11-11","operator":"same"},
              "verification_status":"DEVICE_REVIEWED_PASS",
              "comparison":{"status":"PASS","reviewer":"same","reviewed_at":"2026-11-11",
                            "web_capture_id":"WEB-001","matched_steps":2}}
        self.assertFalse(gate.matching_evidence(case,"memory","fx-991es"))
        case["comparison"]["reviewer"]="independent"
        case["keys"]=[]
        self.assertFalse(gate.matching_evidence(case,"memory","fx-991es"))

    def test_failed_comparison_rejected(self):
        case={"feature_id":"memory","model_id":"fx-991es","keys":["EQUAL"],
              "capture":{"source_device":"CASIO original","capture_date":"2026-11-11","operator":"operator"},
              "verification_status":"DEVICE_REVIEWED_PASS",
              "comparison":{"status":"FAIL","reviewer":"independent","reviewed_at":"2026-11-11",
                            "web_capture_id":"WEB-001","matched_steps":2}}
        self.assertFalse(gate.matching_evidence(case,"memory","fx-991es"))


if __name__=="__main__":
    unittest.main()
