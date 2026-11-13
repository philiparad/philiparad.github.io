#!/usr/bin/env python3
"""PLUS-028: unit fixtures verify evidence fails closed without native captures."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

TOOL = Path(__file__).resolve().parents[1] / "tools" / "plus028_compare_hardware.py"
SPEC = importlib.util.spec_from_file_location("plus028_compare_hardware", TOOL)
COMPARE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPARE)


class HardwareParityEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.manifest = {
            "schema": COMPARE.SCHEMA,
            "model": COMPARE.MODEL,
            "cases": []
        }

    def png(self, name, color):
        target = self.root / name
        Image.new("RGB", (96, 31), color).save(target, "PNG")
        return {
            "png": name,
            "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "keys": ["1", "ADD", "2", "EQUAL"],
            "numeric": 3
        }

    def entry(self, h_color=(0, 0, 0), s_color=(0, 0, 0)):
        return {
            "id": "addition-1",
            "capture_type": "physical-device",
            "device_serial_redacted": "physical-serial-redacted",
            "capture_date": "2026-11-13",
            "operator": "Synthetic test fixture, NOT real hardware",
            "source_description": "Synthetic fixtures for validator testing only",
            "keys": ["1", "ADD", "2", "EQUAL"],
            "hardware": self.png("hardware.png", h_color),
            "simulator": self.png("simulator.png", s_color)
        }

    def test_empty_corpus_remains_blocked(self):
        report = COMPARE.compare(self.manifest, self.root)
        self.assertEqual(report["status"], "BLOCKED_NO_DEVICE_EVIDENCE")
        self.assertEqual(report["cases_total"], 0)
        self.assertFalse(report["native_hardware_parity_certified"])

    def test_equal_pngs_produce_scoped_result_only(self):
        self.manifest["cases"] = [self.entry()]
        report = COMPARE.compare(self.manifest, self.root)
        self.assertEqual(report["status"], "PASS_CAPTURED_CASES_ONLY")
        self.assertEqual(report["results"][0]["pixels"]["differing_pixels"], 0)
        self.assertFalse(report["native_hardware_parity_certified"])

    def test_nonmatching_pixels_are_reported(self):
        self.manifest["cases"] = [self.entry(s_color=(255, 255, 255))]
        report = COMPARE.compare(self.manifest, self.root)
        self.assertEqual(report["status"], "FAIL_CAPTURED_CASES")
        self.assertEqual(report["results"][0]["pixels"]["differing_pixels"], 96 * 31)

    def test_bad_digest_rejected(self):
        case = self.entry()
        case["hardware"]["sha256"] = "0" * 64
        self.manifest["cases"] = [case]
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            COMPARE.compare(self.manifest, self.root)

    def test_keylog_drift_rejected(self):
        case = self.entry()
        case["simulator"]["keys"] = ["2", "EQUAL"]
        self.manifest["cases"] = [case]
        with self.assertRaisesRegex(ValueError, "keylogs differ"):
            COMPARE.compare(self.manifest, self.root)

    def test_non_physical_provenance_rejected(self):
        case = self.entry()
        case["capture_type"] = "browser-simulator"
        self.manifest["cases"] = [case]
        with self.assertRaisesRegex(ValueError, "physical-device provenance"):
            COMPARE.compare(self.manifest, self.root)

    def test_numeric_deviation_is_reported(self):
        case = self.entry()
        case["simulator"]["numeric"] = 3.25
        self.manifest["cases"] = [case]
        report = COMPARE.compare(self.manifest, self.root)
        self.assertFalse(report["results"][0]["numeric_match"])
        self.assertEqual(report["status"], "FAIL_CAPTURED_CASES")

    def test_duplicate_id_rejected(self):
        case = self.entry()
        self.manifest["cases"] = [case, dict(case)]
        with self.assertRaisesRegex(ValueError, "duplicate case id"):
            COMPARE.compare(self.manifest, self.root)

    def test_traversal_rejected(self):
        case = self.entry()
        case["hardware"]["png"] = "../outside.png"
        self.manifest["cases"] = [case]
        with self.assertRaisesRegex(ValueError, "invalid PNG path"):
            COMPARE.compare(self.manifest, self.root)

    def test_report_digest_reproducible(self):
        first = COMPARE.compare(self.manifest, self.root)
        second = COMPARE.compare(self.manifest, self.root)
        self.assertEqual(first["sha256"], second["sha256"])

    def test_empty_requires_evidence_exit_2(self):
        manifest_file = self.root / "manifest.json"
        report_file = self.root / "report.json"
        manifest_file.write_text(json.dumps(self.manifest), encoding="utf-8")
        self.assertEqual(COMPARE.main(["--manifest", str(manifest_file),
                                      "--report", str(report_file),
                                      "--require-evidence"]), 2)
        self.assertTrue(report_file.is_file())


if __name__ == "__main__":
    unittest.main()
