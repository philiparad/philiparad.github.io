#!/usr/bin/env python3
"""REA-100: deterministic standalone source and release integrity tests."""
import importlib.util
import json
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/"tools"/"build_standalone.py"
spec=importlib.util.spec_from_file_location("rea100_build",BUILD)
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StandaloneReleaseTests(unittest.TestCase):
    def test_generated_bytes_exactly_match_committed_standalone(self):
        self.assertEqual(builder.build(),builder.OUTPUT.read_bytes(),
                         "Standalone is stale: run python3 calculator/tools/build_standalone.py --write")

    def test_every_canonical_script_in_same_load_order(self):
        index=builder.INDEX.read_text(encoding="utf-8")
        bundle=builder.OUTPUT.read_text(encoding="utf-8")
        external=builder.SCRIPT.findall(index)
        embedded=re.findall(r'<script data-source="(js/[^"]+\.js)">',bundle)
        self.assertEqual(external,embedded)
        self.assertEqual(len(external),len(set(external)))
        self.assertEqual(len(external),41)

    def test_all_embedded_sources_match_verbatim(self):
        bundle=builder.OUTPUT.read_text(encoding="utf-8")
        for source in builder.SCRIPT.findall(builder.INDEX.read_text(encoding="utf-8")):
            with self.subTest(source=source):
                anchor='<script data-source="'+source+'">\n'
                start=bundle.find(anchor)
                self.assertNotEqual(start,-1)
                end=bundle.find('\n</script>',start+len(anchor))
                self.assertNotEqual(end,-1)
                self.assertEqual(bundle[start+len(anchor):end],
                                 builder.source_file(source).rstrip("\n"))

    def test_css_matches_canonical(self):
        bundle=builder.OUTPUT.read_text(encoding="utf-8")
        start='<style data-source="styles.css">\n'
        self.assertEqual(bundle.count(start),1)
        self.assertIn(start+builder.source_file("styles.css").rstrip("\n")+
                      "\n</style>",bundle)

    def test_embedded_public_capabilities_are_canonical(self):
        bundle=builder.OUTPUT.read_text(encoding="utf-8")
        match=re.search(r'<script type="application/json" id="capability-manifest">\s*'
                        r'([\s\S]*?)\s*</script>',bundle)
        self.assertIsNotNone(match)
        self.assertEqual(json.loads(match.group(1)),
                         json.loads(builder.MANIFEST.read_text(encoding="utf-8")))

    def test_generated_standalone_has_no_external_js_or_css(self):
        bundle=builder.OUTPUT.read_text(encoding="utf-8")
        self.assertIsNone(re.search(r'<script\s+src=',bundle))
        self.assertIsNone(re.search(r'<link\s+rel="stylesheet"',bundle))
        self.assertNotIn('REA100_PENDING:',bundle)


if __name__=="__main__":
    unittest.main()
