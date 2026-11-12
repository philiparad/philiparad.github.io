#!/usr/bin/env python3
"""Manual-derived three-model browser regression with exportable evidence.

Run from repo root:
  python3 calculator/reference/device-parity/run_browser.py
  python3 calculator/reference/device-parity/run_browser.py --headed

This tests the independent web interface. It does not certify CASIO hardware.
"""
import argparse
import hashlib
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

ROOT = Path(__file__).resolve().parents[2]
SCENARIOS = Path(__file__).with_name("cases.json")
OUTPUT = ROOT / "reference" / "device-parity" / "browser-evidence"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def local_server():
    http = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    worker = Thread(target=http.serve_forever, daemon=True)
    worker.start()
    try:
        yield "http://127.0.0.1:%s/index.html" % http.server_port
    finally:
        http.shutdown()
        http.server_close()
        worker.join(timeout=5)


def check(actual, expected, prefix=""):
    failures = []
    for field, wanted in expected.items():
        if field == "menuContains":
            missing = [item for item in wanted if item not in actual.get("menuEntries", [])]
            if missing:
                failures.append("missing menu entries: " + repr(missing))
        elif field == "menuAbsent":
            present = [item for item in wanted if item in actual.get("menuEntries", [])]
            if present:
                failures.append("unexpected menu entries: " + repr(present))
        elif field == "raw":
            value = actual.get("raw")
            if not isinstance(value, (int, float)) or isinstance(value, bool) or abs(value - wanted) > 1e-11 * max(1, abs(wanted)):
                failures.append("raw: wanted %r got %r" % (wanted, value))
        elif actual.get(field) != wanted:
            failures.append("%s: wanted %r got %r" % (field, wanted, actual.get(field)))
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--out", type=Path, default=OUTPUT)
    args = parser.parse_args()
    cases = json.loads(SCENARIOS.read_text(encoding="utf-8"))
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)

    from playwright.sync_api import sync_playwright
    records = []
    with local_server() as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        try:
            page = browser.new_page(viewport={"width": 1160, "height": 1024})
            js_errors = []
            page.on("pageerror", lambda error: js_errors.append(str(error)))
            for model, profile in cases["models"].items():
                for scenario in cases["scenarios"]:
                    if model not in scenario.get("onlyModels", [model]) or model in scenario.get("excludeModels", []):
                        continue
                    # New page load resets all memory, options and menus.
                    page.goto(url + "?model=" + model, wait_until="load")
                    page.wait_for_function("Boolean(window.FreshCalculator)")
                    before_errors = len(js_errors)
                    # Activate the application's real KeyLog without synthesizing a
                    # calculator key press. This permits independently checking
                    # DOM click routing against the requested physical key sequence.
                    page.evaluate("document.querySelector('#record-keylog').click()")
                    pressed = []
                    for key in scenario["keys"]:
                        target = page.locator('#keys button[data-key="' + key + '"]')
                        if target.count() != 1:
                            raise RuntimeError("Missing physical web key: " + key)
                        target.click()
                        pressed.append(key)
                    snapshot = page.evaluate("""() => {
                      const state=window.FreshCalculator.getState();
                      return {model:state.model,mode:state.mode,screen:state.screen,
                        raw:state.raw,result:state.result,input:state.input,
                        info:state.info,menuEntries:state.menuEntries,
                        recording:state.recording,keylog:state.keylog,
                        keyCount:document.querySelectorAll('#keys button[data-key]').length,
                        profileRegisterMatch:JSON.stringify(window.FreshModels.registers(state.model))===
                          JSON.stringify(window.FreshModels.registers(state.model))};
                    }""")
                    # Compare the browser's real model register definitions to
                    # the model-specific manufacturer-derived inventory.
                    snapshot["profileRegisterMatch"] = (
                        page.evaluate("window.FreshModels.registers(window.FreshCalculator.getState().model)")
                        == profile["registers"]
                    )
                    problems = check(snapshot, scenario["expect"])
                    actual_keys = [entry.get("key") for entry in snapshot["keylog"]]
                    if actual_keys != pressed:
                        problems.append("KeyLog mismatch: expected %r, observed %r" %
                                        (pressed, actual_keys))
                    if not snapshot["recording"]:
                        problems.append("KeyLog recording was not active")
                    if snapshot["model"] != model:
                        problems.append("wrong active model")
                    if len(js_errors) > before_errors:
                        problems.extend(js_errors[before_errors:])
                    filename = "%s-%s.png" % (model, scenario["id"])
                    image_path = out / filename
                    page.locator("#lcd").screenshot(path=str(image_path))
                    digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
                    trace_file = "%s-%s-keylog.json" % (model, scenario["id"])
                    trace_path = out / trace_file
                    trace_path.write_text(json.dumps({
                        "schema": "casio-parity-browser-keylog-v1",
                        "model": model, "scenario_id": scenario["id"],
                        "requested_keys": pressed, "actual_keylog": snapshot["keylog"],
                        "exact_key_sequence_match": actual_keys == pressed,
                        "origin": "independent_browser_simulation",
                    }, indent=2) + "\
", encoding="utf-8")
                    trace_hash = hashlib.sha256(trace_path.read_bytes()).hexdigest()
                    record = {
                        "scenario_id": scenario["id"],
                        "category": scenario["category"],
                        "model": model,
                        "keys": pressed,
                        "recorded_keys": actual_keys,
                        "keylog_file": trace_file,
                        "keylog_sha256": trace_hash,
                        "keylog_exact_match": actual_keys == pressed,
                        "expected": scenario["expect"],
                        "observed": snapshot,
                        "manual_area": scenario["manualArea"],
                        "manual_url": profile["manual"],
                        "browser_lcd": filename,
                        "browser_lcd_sha256": digest,
                        "browser_pass": not problems,
                        "problems": problems,
                        "native_device_evidence": None,
                        "parity_verified": False,
                    }
                    records.append(record)
                    print(("PASS" if not problems else "FAIL") + " " + model + " " +
                          scenario["id"] + (" " + repr(problems) if problems else ""))
        finally:
            browser.close()

    report = {
        "schema": "casio-parity-browser-evidence-v1",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "provenance": "Automated independent browser simulation; NOT device capture",
        "source_scenarios": str(SCENARIOS.relative_to(ROOT)),
        "models": list(cases["models"]),
        "pass_count": sum(item["browser_pass"] for item in records),
        "fail_count": sum(not item["browser_pass"] for item in records),
        "hardware_verified": False,
        "records": records
    }
    dest = out / "report.json"
    dest.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("\nEvidence:", dest, "PASS:", report["pass_count"], "FAIL:", report["fail_count"])
    return 1 if report["fail_count"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
