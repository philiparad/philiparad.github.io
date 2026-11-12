#!/usr/bin/env python3
"""Synthetic LCD image regression; no actual hardware pixels are used."""
import unittest
from PIL import Image, ImageDraw
from compare_lcd import compare_arrays, normalized_pixels


class LcdComparisonTests(unittest.TestCase):
    def setUp(self):
        self.size = (96, 31)
        self.web = Image.new("L", self.size, 240)
        ImageDraw.Draw(self.web).rectangle((12, 7, 29, 19), fill=25)

    def test_same_image_matches(self):
        a, meta = normalized_pixels(self.web)
        b, _ = normalized_pixels(self.web.copy())
        self.assertEqual(compare_arrays(a, b)["mismatch_pixels"], 0)
        self.assertFalse(meta.get("warning"))

    def test_translation_is_reported(self):
        shifted = Image.new("L", self.size, 240)
        ImageDraw.Draw(shifted).rectangle((14, 7, 31, 19), fill=25)
        a, _ = normalized_pixels(self.web)
        b, _ = normalized_pixels(shifted)
        report = compare_arrays(a, b)
        self.assertEqual(report["mismatch_pixels"], 0)
        self.assertEqual(report["alignment_dx"], 2)

    def test_different_glyphs_are_detected(self):
        other = Image.new("L", self.size, 240)
        ImageDraw.Draw(other).rectangle((34, 7, 55, 19), fill=25)
        a, _ = normalized_pixels(self.web)
        b, _ = normalized_pixels(other)
        self.assertGreater(compare_arrays(a, b)["mismatch_fraction"], 0.04)

    def test_blank_has_warning(self):
        blank = Image.new("RGB", self.size, "white")
        pixels, meta = normalized_pixels(blank)
        self.assertEqual(set(pixels), {0})
        self.assertTrue(meta.get("warning"))

    def test_cropped_lcd_is_normalized(self):
        framed = Image.new("L", (116, 51), 200)
        framed.paste(self.web, (10, 10))
        a, _ = normalized_pixels(self.web)
        b, _ = normalized_pixels(framed, (10, 10, 96, 31))
        self.assertEqual(compare_arrays(a, b)["mismatch_pixels"], 0)


if __name__ == "__main__":
    unittest.main()
