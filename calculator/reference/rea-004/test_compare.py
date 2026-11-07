#!/usr/bin/env python3
"""Offline REA-004 fixture tests. Synthetic images are NOT native CASIO evidence."""
import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("rea004_compare", HERE/"compare.py")
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
PNG=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7x8AAAAASUVORK5CYII=")

class REA004Test(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        for part in ("native","web"):
            (self.root/part).mkdir()
            for index in range(2):
                (self.root/part/f"frame-{index}.png").write_bytes(PNG)
        keys=["2"]
        ref_states=[{"step":i,"key":None if i==0 else "2","lcd_text":"ready" if i==0 else "2","screenshot":f"frame-{i}.png"} for i in range(2)]
        self.reference={"target_model":"TEST_SYNTHETIC_DO_NOT_CERTIFY","cases":[
            {"id":"FAKE-001","name":"synthetic fixture","keys":keys,"capture":{
                "source_device":"SYNTHETIC TEST — NOT CASIO","capture_date":"2000-01-01",
                "observed_states":ref_states,"observed_result":"2","observed_error":None
            }}
        ]}
        self.web={"cases":[{"id":"FAKE-001","name":"synthetic fixture","keys":keys,"source":"web-app",
            "capture_status":"CAPTURED","states":[dict(s) for s in ref_states],
            "result":"2","error":None}]}
    def tearDown(self):
        self.tmp.cleanup()
    def compare(self, pixels=False):
        return module.compare(self.reference,self.web,self.root/"native",self.root/"web",pixels=pixels)
    def test_semantic_equal(self):
        result=self.compare()
        self.assertEqual(result["totals"]["PASS"],1)
        self.assertEqual(result["totals"]["FAIL"],0)
    def test_step_text_mismatch(self):
        self.web["cases"][0]["states"][1]["lcd_text"]="not 2"
        result=self.compare()
        self.assertEqual(result["totals"]["FAIL"],1)
        self.assertEqual(result["results"][0]["mismatches"][0]["step"],1)
    def test_result_mismatch(self):
        self.web["cases"][0]["result"]="3"
        self.assertEqual(self.compare()["totals"]["FAIL"],1)
    def test_missing_reference_blocks(self):
        self.reference["cases"][0]["capture"]["source_device"]=None
        result=self.compare()
        self.assertEqual(result["totals"]["BLOCKED_REFERENCE"],1)
        self.assertEqual(result["totals"]["PASS"],0)
    def test_missing_reference_screenshot_blocks(self):
        (self.root/"native"/"frame-1.png").unlink()
        self.assertEqual(self.compare()["totals"]["BLOCKED_REFERENCE"],1)
    def test_no_web_capture_blocks(self):
        self.web["cases"]=[]
        self.assertEqual(self.compare()["totals"]["BLOCKED_WEB"],1)
    def test_key_mismatch_blocks(self):
        self.web["cases"][0]["keys"]=["3"]
        self.assertEqual(self.compare()["totals"]["BLOCKED_WEB"],1)
    def test_png_comparison_optional(self):
        result=self.compare(pixels=True)
        status=result["results"][0]["status"]
        # Pillow may be missing; it must block instead of yielding a pixel parity PASS.
        self.assertIn(status,("PASS","BLOCKED_PIXEL_ALIGNMENT"))
    def test_reference_cannot_be_web_only(self):
        self.reference["cases"][0]["capture"]["observed_states"]=None
        self.assertEqual(self.compare()["totals"]["BLOCKED_REFERENCE"],1)

if __name__=="__main__":
    unittest.main()
