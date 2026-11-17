#!/usr/bin/env python3
"""CAL-012 comparator smoke tests; no WebView2 or Windows UI required."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
COMPARE = HERE / "compare_lcd_cross_engine.py"
FACTORS = [1, 1.25, 1.5, 2]
CASES = ["ans", "mode", "eqnTypes", "eqnCoefficients", "fraction",
         "nestedRoot", "fractionAnswer", "engineering"]


class CrossEngineComparatorTests(unittest.TestCase):
    def test_complete_match_and_single_regression(self):
        with tempfile.TemporaryDirectory(prefix="cal012-") as temp:
            root = Path(temp)
            manifest = []
            for factor in FACTORS:
                for case in CASES:
                    filename = case + "-dpr-" + str(factor).replace(".", "_") + ".png"
                    width, height = round(480 * factor), round(155 * factor)
                    frame = Image.new("RGB", (width, height), (215, 230, 215))
                    brush = ImageDraw.Draw(frame)
                    edge = round(8 * factor)
                    brush.rectangle((0, 0, width - 1, height - 1),
                                    outline=(17, 17, 17), width=edge)
                    brush.line((round(70 * factor), round(45 * factor),
                                round(280 * factor), round(83 * factor)),
                               fill=(29, 40, 34), width=max(2, round(4 * factor)))
                    for name in ("chromium", "webview2"):
                        target = root / name
                        target.mkdir(exist_ok=True)
                        frame.save(target / filename)
                    manifest.append({"scenario": case, "factor": factor,
                                     "filename": filename})
            for name in ("chromium", "webview2"):
                (root / name / "manifest.json").write_text(json.dumps(manifest))
            valid = subprocess.run(
                [sys.executable, str(COMPARE), str(root)],
                capture_output=True, text=True, timeout=40
            )
            self.assertEqual(valid.returncode, 0, valid.stderr + valid.stdout)
            report = json.loads((root / "report.json").read_text())
            self.assertEqual(report["passed_pairs"], 32)
            self.assertTrue((root / "index.html").is_file())
            corrupted = root / "webview2" / manifest[0]["filename"]
            with Image.open(corrupted) as source:
                Image.new("RGB", source.size, (215, 230, 215)).save(corrupted)
            invalid = subprocess.run(
                [sys.executable, str(COMPARE), str(root)],
                capture_output=True, text=True, timeout=40
            )
            self.assertEqual(invalid.returncode, 1, invalid.stderr + invalid.stdout)
            self.assertIn("Blank or nearly blank LCD frame", invalid.stdout,
                          "comparator must report the actual image failure")
            report = json.loads((root / "report.json").read_text())
            self.assertEqual(report["passed_pairs"], 31)
            self.assertIn("Blank or nearly blank LCD frame",
                          (root / "index.html").read_text(),
                          "failure gallery must remain readable")


if __name__ == "__main__":
    unittest.main()
