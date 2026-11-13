#!/usr/bin/env python3
"""PLUS-034: live memory, sexagesimal, SETUP, and MODE browser parity.

Click real 50-key DOM buttons in both builds. Compare final logical states,
full key traces and LCD screenshot pixels. No hardware-equivalence claim.
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
    {"id": "memory-store-a", "keys": ("7","EQUAL","SHIFT","RCL","NEG"),
     "mode": "COMP", "memory": {"A":7}, "screen": "result"},
    {"id": "memory-store-recall-a",
     "keys": ("7","EQUAL","SHIFT","RCL","NEG","AC","RCL","NEG"),
     "mode": "COMP", "memory": {"A":7}, "screen": "result", "number":7},
    {"id": "memory-plus",
     "keys": ("5","EQUAL","MPLUS","AC","3","EQUAL","MPLUS"),
     "mode": "COMP", "memory": {"M":8}},
    {"id": "memory-minus",
     "keys": ("5","EQUAL","MPLUS","AC","2","EQUAL","SHIFT","MPLUS"),
     "mode": "COMP", "memory": {"M":3}},
    {"id": "dms-entry",
     "keys": ("2","DMS","3","0","DMS","0","DMS","EQUAL"),
     "mode": "COMP", "screen": "result", "number":2.5},
    {"id": "dms-display",
     "keys": ("1","DOT","5","EQUAL","DMS"),
     "mode": "COMP", "screen": "result", "number":1.5,
     "result_contains":"°"},
    {"id": "setup-radians",
     "keys": ("SHIFT","MODE","4"),
     "mode": "COMP", "angle": "RAD"},
    {"id": "setup-gradians",
     "keys": ("SHIFT","MODE","5"),
     "mode": "COMP", "angle": "GRAD"},
    {"id": "setup-degrees",
     "keys": ("SHIFT","MODE","4","SHIFT","MODE","3"),
     "mode": "COMP", "angle": "DEG"},
    {"id": "setup-lineio",
     "keys": ("SHIFT","MODE","2"),
     "mode": "COMP", "math":False},
    {"id": "mode-complex-return",
     "keys": ("MODE","2","MODE","1"),
     "mode": "COMP", "screen": "edit"},
    {"id": "mode-base-return",
     "keys": ("MODE","4","MODE","1"),
     "mode": "COMP", "screen": "edit"}
)
STATE_FIELDS = ("mode","screen","input","result","error","angle",
                "math","format","digits","shift","alpha","resultDMS")

def state_view(state):
    return {field: state.get(field) for field in STATE_FIELDS}

async def run_case(browser, origin, file, case, folder):
    page = await browser.new_page(viewport={"width":1200,"height":1280},
                                  device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda e:errors.append(str(e)))
    try:
        await page.goto(origin+file+"?plus034="+case["id"],wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        trace = []
        for key in case["keys"]:
            await page.locator("#keys button[data-key='"+key+"']").click()
            snapshot = await page.evaluate("window.FreshCalculator.getState()")
            trace.append({"key":key,"state":state_view(snapshot)})
        state = await page.evaluate("window.FreshCalculator.getState()")
        assert state["mode"] == case["mode"], (file,case["id"],"mode",state["mode"])
        for field in ("screen","angle","math"):
            if field in case:
                assert state[field] == case[field], (file,case["id"],field,state[field])
        for name, expected in case.get("memory",{}).items():
            assert abs(state["memory"][name]-expected)<1e-12, (file,case["id"],name,state["memory"][name])
        if "number" in case:
            assert abs(state["raw"]-case["number"])<1e-10, (file,case["id"],state["raw"])
        if "result_contains" in case:
            assert case["result_contains"] in state["result"], (file,case["id"],state["result"])
        assert not errors,(file,case["id"],errors)
        filename = file.replace(".html","")+"-"+case["id"]+".png"
        png = folder/filename
        await page.locator("#lcd").screenshot(path=str(png))
        return {"publication":file,"id":case["id"],"trace":trace,
                "final":state_view(state),
                "image":filename,"sha256":hashlib.sha256(png.read_bytes()).hexdigest(),
                "hardware_verified":False}
    finally:
        await page.close()

def compare_images(folder, left, right):
    with Image.open(folder/left["image"]) as a,Image.open(folder/right["image"]) as b:
        if a.size!=b.size:
            return {"kind":"dimensions","first":a.size,"second":b.size}
        diff=ImageChops.difference(a.convert("RGB"),b.convert("RGB"))
        changed=sum(any(pixel) for pixel in diff.getdata())
        if changed:
            diff.save(folder/(left["id"]+"-diff.png"))
        return {"kind":"pixels","changed":changed}

async def main():
    folder=Path(os.environ.get("PLUS034_CAPTURE_DIR","/tmp/plus034-browser-captures"))
    folder.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus034-browser-parity-v1","native_hardware_verified":False,
            "cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for case in CASES:
                    items=[]
                    for file in FILES:
                        try:
                            items.append(await run_case(browser,origin,file,case,folder))
                        except Exception as exc:
                            report["failures"].append({"id":case["id"],"publication":file,
                                                       "kind":"execution","detail":str(exc)})
                    failures=[]
                    if len(items)==2:
                        if items[0]["trace"]!=items[1]["trace"]:
                            failures.append({"kind":"key_trace"})
                        if items[0]["final"]!=items[1]["final"]:
                            failures.append({"kind":"final_state"})
                        pixels=compare_images(folder,*items)
                        if pixels["kind"]!="pixels" or pixels["changed"]:
                            failures.append(pixels)
                    else:
                        failures.append({"kind":"missing_build"})
                    report["cases"].append({"id":case["id"],"captures":items,
                                            "differences":failures})
                    for issue in failures:
                        report["failures"].append({"id":case["id"],**issue})
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and len(report["cases"])==len(CASES) else "FAIL_WEB"
        (folder/"plus034-report.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:5]
    print("PLUS-034 PASS:",len(CASES),"web sequences across both releases")

if __name__=="__main__":
    asyncio.run(main())
