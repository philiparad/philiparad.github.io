#!/usr/bin/env python3
"""REA-100: deterministic, self-contained calculator build from modular source.

From repository root:
  python3 calculator/tools/build_standalone.py --write
  python3 calculator/tools/build_standalone.py --check

Only calculator/index.html, calculator/styles.css, calculator/js/*.js listed
in index.html and the canonical capability manifest are authoritative.
"""
import argparse
import difflib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OUTPUT = ROOT / "fx991_fresh_standalone.html"
MANIFEST = ROOT / "reference" / "rea-008" / "capabilities.json"

SCRIPT = re.compile(r'<script\s+src="(js/[^"]+\.js)"\s*></script>')
STYLE = re.compile(r'<link\s+rel="stylesheet"\s+href="styles\.css"\s*/?>')
HEADER = '<!-- REA-100 GENERATED FILE: edit index.html, styles.css, js/, or the manifest; run tools/build_standalone.py --write. -->'


def source_file(relative):
    candidate = (ROOT / relative).resolve()
    if not candidate.is_relative_to(ROOT.resolve()) or not candidate.is_file():
        raise ValueError("Missing or unsafe source: " + relative)
    return candidate.read_text(encoding="utf-8").replace("\r\n", "\n")


def build():
    html = source_file("index.html")
    if HEADER in html:
        raise ValueError("Canonical index must not contain generated marker")
    scripts = SCRIPT.findall(html)
    if not scripts or len(scripts) != len(set(scripts)):
        raise ValueError("Expected a unique ordered list of modular JavaScript sources")
    if scripts[-1] != "js/capability-ui.js":
        raise ValueError("Capability UI must be the final modular script")
    if len(STYLE.findall(html)) != 1:
        raise ValueError("Exactly one styles.css link expected")
    if '<script' in SCRIPT.sub('', html):
        raise ValueError("Unexpected inline or external script in canonical index")

    css = source_file("styles.css")
    if "</style" in css.lower():
        raise ValueError("CSS cannot be safely embedded")
    manifest = source_file("reference/rea-008/capabilities.json").strip()
    if "</script" in manifest.lower():
        raise ValueError("Manifest cannot be safely embedded")

    def inline(match):
        name = match.group(1)
        js = source_file(name)
        if "</script" in js.lower():
            raise ValueError("Unsafe closing-script sequence in " + name)
        bundle = '<script data-source="' + name + '">\n' + js.rstrip("\n") + '\n</script>'
        if name == "js/capability-ui.js":
            bundle = ('<script type="application/json" id="capability-manifest">\n' +
                      manifest + '\n</script>\n' + bundle)
        return bundle

    html = STYLE.sub('<style data-source="styles.css">\n' +
                     css.rstrip("\n") + '\n</style>', html)
    html = SCRIPT.sub(inline, html)
    if re.search(r'<script\s+src=', html):
        raise ValueError("External JavaScript remained in generated standalone")
    return html.replace("<!doctype html>", "<!doctype html>\n" + HEADER, 1).encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    choices = parser.add_mutually_exclusive_group(required=True)
    choices.add_argument("--write", action="store_true", help="Regenerate standalone")
    choices.add_argument("--check", action="store_true", help="Fail on stale standalone")
    args = parser.parse_args()
    expected = build()
    if args.write:
        OUTPUT.write_bytes(expected)
        print("REA-100: regenerated", OUTPUT.relative_to(ROOT), len(expected), "bytes")
        return 0
    current = OUTPUT.read_bytes() if OUTPUT.is_file() else b""
    if current != expected:
        previous = current.decode("utf-8", errors="replace").splitlines()
        wanted = expected.decode("utf-8").splitlines()
        difference = list(difflib.unified_diff(previous, wanted,
                                               fromfile="committed", tofile="generated",
                                               lineterm=""))
        print("REA-100 FAIL: standalone differs from canonical source", file=sys.stderr)
        for line in difference[:65]:
            print(line[:400], file=sys.stderr)
        print("Run: python3 calculator/tools/build_standalone.py --write", file=sys.stderr)
        return 1
    print("REA-100 PASS: standalone equals canonical modular source")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
