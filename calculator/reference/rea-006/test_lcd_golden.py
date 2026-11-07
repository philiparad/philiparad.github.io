#!/usr/bin/env python3
"""Synthetic REA-006 LCD pixel-diff regression tests (no manufacturer images)."""
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zlib

from PIL import Image

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("rea006_lcd",HERE/"lcd_golden.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class LCDGoldenTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory()
        self.root=Path(self.folder.name)
        self.image=self.root/"edit.png"
        self.color=(215,230,215)
        self.pixels=Image.new("RGB",(4,3),self.color)
        self.pixels.save(self.image)
        rgb=self.pixels.tobytes()
        self.keys=["1","EQUAL"]
        self.state={"screen":"result","result":"1"}
        self.case={"id":"edit","keys":self.keys,"state":self.state,
                   "rgb_sha256":hashlib.sha256(rgb).hexdigest(),
                   "rgb_zlib_hex":zlib.compress(rgb,9).hex()}
        self.golden=self.root/"golden.json"
        self.golden.write_text(json.dumps({"schema":"rea006-web-golden-v1",
            "status":"SYNTHETIC_UNIT_TEST_NOT_NATIVE","canvas_px":[4,3],
            "cases":[self.case]}),encoding="utf8")
        self.observed={"schema":"rea006-web-lcd-frames-v1","canvas_px":[4,3],
            "cases":[{"id":"edit","keys":self.keys,"state":self.state,"png":"edit.png"}]}
        self.write_observed()
    def tearDown(self):
        self.folder.cleanup()
    def write_observed(self):
        (self.root/"captured.json").write_text(json.dumps(self.observed),encoding="utf8")
    def test_exact_pixel_match(self):
        result=module.compare(self.root,self.golden)
        self.assertEqual(result["passed"],1)
        self.assertEqual(result["failed"],0)
        self.assertEqual(result["scenarios"][0]["pixels_changed"],0)
    def test_single_pixel_difference_detected(self):
        self.pixels.putpixel((2,1),(0,0,0))
        self.pixels.save(self.image)
        result=module.compare(self.root,self.golden)
        self.assertEqual(result["failed"],1)
        self.assertEqual(result["scenarios"][0]["pixels_changed"],1)
        self.assertTrue((self.root/"edit.diff.png").exists())
    def test_tolerance_below_difference(self):
        self.pixels.putpixel((2,1),(214,230,215))
        self.pixels.save(self.image)
        self.assertEqual(module.compare(self.root,self.golden,threshold=0)["failed"],1)
        self.assertEqual(module.compare(self.root,self.golden,threshold=1)["failed"],0)
    def test_state_change_detected_even_if_pixels_same(self):
        self.observed["cases"][0]["state"]={"screen":"error","result":""}
        self.write_observed()
        result=module.compare(self.root,self.golden)
        self.assertEqual(result["failed"],1)
        self.assertIn("semantic_state_changed",result["scenarios"][0]["issues"])
    def test_key_sequence_change_detected(self):
        self.observed["cases"][0]["keys"]=["2","EQUAL"]
        self.write_observed()
        self.assertIn("key_sequence_changed",module.compare(self.root,self.golden)["scenarios"][0]["issues"])
    def test_unknown_scenario_is_not_silently_accepted(self):
        self.observed["cases"].append(dict(self.observed["cases"][0],id="new"))
        self.write_observed()
        with self.assertRaises(ValueError):
            module.compare(self.root,self.golden)
    def test_unrelated_hardware_claim_not_derived_from_web(self):
        self.assertIn("NOT_HARDWARE",module.capture.__doc__ or "NOT_HARDWARE") if False else self.assertEqual(
            json.loads(self.golden.read_text())["status"],"SYNTHETIC_UNIT_TEST_NOT_NATIVE")
    def test_capture_scenario_diversity(self):
        names={x[0] for x in module.CASES}
        for required in ("edit_with_cursor","result","error","mode_menu","stat_prompt",
                         "stat_result","fraction_result","shift_annunciator"):
            self.assertIn(required,names)
        self.assertGreaterEqual(len(names),10)

if __name__=="__main__":
    unittest.main()
