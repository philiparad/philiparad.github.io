#!/usr/bin/env python3
"""PLUS-028 ALT: browser replay and web LCD captures, never physical-device captures."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib
import json
import os
import threading

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]
FILES = ("index.html", "fx991_fresh_standalone.html")
# CASIO manual's precedence and EQN examples, using actual physical-style buttons.
CASES = (
    {"id": "precedence", "keys": ("2", "ADD", "3", "MUL", "4", "EQUAL"),
     "mode": "COMP", "result": 14},
    {"id": "equation-2-unknowns",
     "keys": ("MODE", "5", "1", "1", "EQUAL", "2", "EQUAL", "3", "EQUAL",
              "2", "EQUAL", "3", "EQUAL", "4", "EQUAL"),
     "mode": "EQN", "result": -1}
)


async def run_case(browser, root, file, case, out):
    page = await browser.new_page(viewport={"width": 1200, "height": 1280})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        await page.goto(root + file + "?plus028=" + case["id"], wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        for key in case["keys"]:
            await page.locator("#keys button[data-key='" + key + "']").click()
        state = await page.evaluate("window.FreshCalculator.getState()")
        assert state["mode"] == case["mode"], (file, case["id"], state["mode"])
        if case["id"] == "precedence":
            actual = state["raw"]
            assert state["screen"] == "result", (file, state["screen"])
        else:
            assert state["screen"] == "eqn-result", (file, state["screen"])
            actual = state["eqnSession"]["solutions"][0]["value"]
        assert abs(actual - case["result"]) < 1e-10, (file, case["id"], actual)
        assert not errors, (file, case["id"], errors)
        name = file.replace(".html", "") + "-" + case["id"] + ".png"
        frame = out / name
        await page.locator("#lcd").screenshot(path=str(frame))
        return {"web_publication": file, "case": case["id"],
                "keys": list(case["keys"]), "mode": state["mode"],
                "screen": state["screen"], "numeric_result": actual,
                "web_lcd_png": name, "web_lcd_sha256":
                hashlib.sha256(frame.read_bytes()).hexdigest(),
                "physical_device_evidence": False}
    finally:
        await page.close()


async def main():
    root_out = Path(os.getenv("PLUS028_WEB_CAPTURE_DIR", "/tmp/plus028-web-captures"))
    root_out.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0),
        partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    root = "http://127.0.0.1:" + str(server.server_address[1]) + "/calculator/"
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            try:
                captures = []
                for case in CASES:
                    variants = []
                    for file in FILES:
                        item = await run_case(browser, root, file, case, root_out)
                        captures.append(item)
                        variants.append(item)
                    assert variants[0]["numeric_result"] == variants[1]["numeric_result"], case["id"]
                report = {
                    "schema": "plus028-web-reference-browser-v1",
                    "model": "fx-991ES PLUS (2nd edition)",
                    "source": "manufacturer example and calculation-priority cases",
                    "captures": captures,
                    "verified_web_cases": len(captures),
                    "native_hardware_parity_certified": False,
                    "note": "PNG captures are web canvas screenshots, NOT native CASIO LCD captures."
                }
                (root_out / "web-reference-report.json").write_text(
                    json.dumps(report, indent=2) + "\n", encoding="utf-8")
                print("PLUS-028 ALT WEB PASS:", len(captures),
                      "web traces across modular and standalone")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    asyncio.run(main())
