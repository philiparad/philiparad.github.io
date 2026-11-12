#!/usr/bin/env python3
"""Tests for provenance checks; all native images are fictional test bytes."""
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from verify_evidence import validate


def save(path, data):
    path.write_text(json.dumps(data), encoding="utf-8")


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        self.web = self.base / "browser.png"
        self.web.write_bytes(b"web simulator test only")
        self.native = self.base / "device.png"
        self.native.write_bytes(b"synthetic test bytes, NOT actual CASIO evidence")
        self.web_hash = hashlib.sha256(self.web.read_bytes()).hexdigest()
        self.native_hash = hashlib.sha256(self.native.read_bytes()).hexdigest()
        self.report = self.base / "browser.json"
        self.native_report = self.base / "native.json"
        self.item = {
            "schema": "casio-parity-browser-evidence-v1",
            "records": [{
                "model": "fx-991es-plus-c",
                "scenario_id": "arithmetic-precedence",
                "keys": ["AC", "2", "ADD", "3", "MUL", "4", "EQUAL"],
                "browser_pass": True,
                "browser_lcd": "browser.png",
                "browser_lcd_sha256": self.web_hash
            }]
        }
        self.observation = {
            "model": "fx-991es-plus-c",
            "scenario_id": "arithmetic-precedence",
            "origin": "licensed_emulator",
            "keys": self.item["records"][0]["keys"],
            "lcd_file": "device.png",
            "lcd_sha256": self.native_hash,
            "review_method": "human_side_by_side",
            "reviewed_at_utc": "2026-11-12T01:00:00Z",
            "reviewed_by": "synthetic-unittest-reviewer",
            "result_matches": True,
            "lcd_matches": True,
            "key_behavior_matches": True
        }
        save(self.report, self.item)

    def tearDown(self):
        self.tmp.cleanup()

    def write_native(self, **updates):
        observation = {**self.observation, **updates}
        save(self.native_report, {
            "schema": "casio-parity-native-evidence-v1",
            "observations": [observation]
        })

    def test_browser_only_is_not_hardware_parity(self):
        report = validate(self.report)
        self.assertEqual(report["browser_pass"], 1)
        self.assertEqual(report["native_reviewed"], 0)
        self.assertEqual(report["physical_device_reviewed"], 0)

    def test_declared_licensed_emulator_stays_distinct_from_hardware(self):
        self.write_native()
        report = validate(self.report, self.native_report)
        self.assertEqual(report["native_reviewed"], 1)
        self.assertEqual(report["physical_device_reviewed"], 0)
        self.assertEqual(report["records"][0]["status"], "licensed_emulator_reviewed")

    def test_explicit_physical_provenance_is_separately_reported(self):
        # This checks the status logic, NOT the authenticity of test bytes.
        self.write_native(origin="physical_device")
        report = validate(self.report, self.native_report)
        self.assertEqual(report["physical_device_reviewed"], 1)

    def test_unsigned_or_mismatched_evidence_cannot_pass(self):
        for change in (
            {"reviewed_by": ""},
            {"lcd_sha256": "a" * 64},
            {"keys": ["AC", "1"]},
            {"review_method": "auto_image_diff"},
            {"result_matches": False},
            {"lcd_matches": False},
            {"key_behavior_matches": False},
            {"lcd_file": "../device.png"},
            {"origin": "web_simulator"},
        ):
            with self.subTest(change=change):
                self.write_native(**change)
                self.assertEqual(validate(self.report, self.native_report)["native_reviewed"], 0)

    def test_browser_hash_is_required(self):
        self.write_native()
        self.item["records"][0]["browser_lcd_sha256"] = "a" * 64
        save(self.report, self.item)
        self.assertEqual(validate(self.report, self.native_report)["native_reviewed"], 0)

    def test_duplicate_native_records_are_rejected(self):
        save(self.native_report, {
            "schema": "casio-parity-native-evidence-v1",
            "observations": [self.observation, self.observation]
        })
        with self.assertRaises(ValueError):
            validate(self.report, self.native_report)

    def test_invalid_browser_model_is_rejected(self):
        self.item["records"][0]["model"] = "fake_model"
        save(self.report, self.item)
        with self.assertRaises(ValueError):
            validate(self.report)


if __name__ == "__main__":
    unittest.main()
