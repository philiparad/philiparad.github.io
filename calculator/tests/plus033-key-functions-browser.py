#!/usr/bin/env python3
"""PLUS-033: focused mathematical keys, SHIFT/ALPHA, and error recovery.

Exercises real DOM keypad buttons in both web publications and compares each
logical key-state trace and final LCD PNG. No CASIO hardware evidence implied.
"""
import asyncio
import hashlib
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
FILES = ("index.html", "fx991_fresh_standalone.html")
CASES = (
    {"id": "sin30", "keys": ("SIN", "3", "0", "RP", "EQUAL"),
     "screen": "result", "number": .5},
    {"id": "sqrt81", "keys": ("SQRT", "8", "1", "RIGHT", "EQUAL"),
     "screen": "result", "number": 9},
    {"id": "inverse-sin", "keys": ("SHIFT", "SIN", "1", "RP", "EQUAL"),
     "screen": "result", "number": 90},
    {"id": "shift-constant-menu", "keys": ("SHIFT", "7"),
     "screen": "constant-code", "number": None},
    {"id": "alpha-register-x", "keys": ("ALPHA", "LP"),
     "screen": "edit", "contains": "X", "number": None},
    {"id": "math-error", "keys": ("1", "DIV", "0", "EQUAL"),
     "screen": "error", "error": "Math ERROR", "number": None},
    {"id": "math-error-recover", "keys": ("1", "DIV", "0", "EQUAL", "RIGHT"),
     "screen": "edit", "contains": "1/0", "number": None},
    {"id": "syntax-error", "keys": ("1", "ADD", "EQUAL"),
     "screen": "error", "error": "Syntax ERROR", "number": None},
    {"id": "syntax-error-recover", "keys": ("1", "ADD", "EQUAL", "LEFT"),
     "screen": "edit", "contains": "1+", "number": None},
    {"id": "error-clear", "keys": ("1", "DIV", "0", "EQUAL", "AC"),
     "screen": "edit", "input_equals": "", "error": "", "number": None},
)


def logical_state(s):
    return {
        "mode": s["mode"], "screen": s["screen"], "input": s["input"],
        "result": s["result"], "error": s["error"],
        "shift": s["shift"], "alpha": s["alpha"]
    }


async def replay(browser, base, file, case, output):
    page = await browser.new_page(viewport={"width": 1200, "height": 1280},
                                  device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        await page.goto(base + file + "?plus033=" + case["id"], wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        steps = []
        for key in case["keys"]:
            await page.locator("#keys button[data-key='" + key + "']").click()
            s = await page.evaluate("window.FreshCalculator.getState()")
            steps.append({"key": key, "state": logical_state(s)})
        s = await page.evaluate("window.FreshCalculator.getState()")
        assert s["mode"] == "COMP", (file, case["id"], s["mode"])
        assert s["screen"] == case["screen"], (file, case["id"], s["screen"])
        if "error" in case:
            assert s["error"] == case["error"], (file, case["id"], s["error"])
        if "contains" in case:
            assert case["contains"] in s["input"], (file, case["id"], s["input"])
        if "input_equals" in case:
            assert s["input"] == case["input_equals"], (
                file, case["id"], "input", repr(s["input"]))
        if case["number"] is not None:
            assert abs(s["raw"] - case["number"]) <= 1e-10, (
                file, case["id"], s["raw"])
        assert not errors, (file, case["id"], errors)
        screenshot = file.replace(".html", "") + "-" + case["id"] + ".png"
        image_path = output / screenshot
        await page.locator("#lcd").screenshot(path=str(image_path))
        return {
            "case": case["id"], "publication": file,
            "steps": steps, "final": logical_state(s),
            "lcd_png": screenshot,
            "lcd_sha256": hashlib.sha256(image_path.read_bytes()).hexdigest(),
            "physical_hardware_evidence": False
        }
    finally:
        await page.close()


def compare_pair(left, right, output):
    differences = []
    if left["steps"] != right["steps"]:
        for i, (a, b) in enumerate(zip(left["steps"], right["steps"])):
            if a != b:
                differences.append({"kind": "step", "index": i, "modular": a,
                                    "standalone": b})
        if len(left["steps"]) != len(right["steps"]):
            differences.append({"kind": "trace_length"})
    with Image.open(output / left["lcd_png"]) as a, Image.open(
            output / right["lcd_png"]) as b:
        if a.size != b.size:
            differences.append({"kind": "lcd_size", "modular": a.size,
                                "standalone": b.size})
        else:
            delta = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
            pixel_count = sum(any(pixel) for pixel in delta.getdata())
            if pixel_count:
                differences.append({"kind": "lcd_pixels", "count": pixel_count})
                delta.save(output / (left["case"] + "-diff.png"))
    return differences


async def main():
    output = Path(os.getenv("PLUS033_CAPTURE_DIR", "/tmp/plus033-browser-captures"))
    output.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:" + str(server.server_address[1]) + "/calculator/"
    report = {
        "schema": "plus033-web-key-parity-v1",
        "model": "fx-991ES PLUS (2nd edition)",
        "native_hardware_parity_certified": False,
        "cases": [], "errors": []
    }
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            try:
                for case in CASES:
                    captures = []
                    for file in FILES:
                        try:
                            captures.append(
                                await replay(browser, base, file, case, output))
                        except Exception as error:
                            report["errors"].append({
                                "case": case["id"], "publication": file,
                                "error": str(error)})
                    diff = compare_pair(*captures, output) if len(captures) == 2 else [
                        {"kind": "missing_publication"}]
                    report["cases"].append({
                        "id": case["id"], "captured": captures,
                        "differences": diff, "matches": not diff})
                    if diff:
                        report["errors"].append({"case": case["id"], "differences": diff})
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()
        report["status"] = (
            "PASS_WEB_ONLY" if not report["errors"] and
            len(report["cases"]) == len(CASES) else "FAIL_WEB_COMPARISON")
        (output / "plus033-report.json").write_text(
            json.dumps(report, indent=2) + "\n", encoding="utf-8")
    assert report["status"] == "PASS_WEB_ONLY", report["errors"][:5]
    print("PLUS-033 WEB PASS:", len(CASES), "keypad cases ×", len(FILES),
          "publications with identical key traces and LCD frames")


if __name__ == "__main__":
    asyncio.run(main())
