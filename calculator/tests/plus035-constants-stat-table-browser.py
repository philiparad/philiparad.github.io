#!/usr/bin/env python3
"""PLUS-035: constants, conversions, STAT and TABLE reference/keypad parity.

Runs each example through physical-style DOM keys in modular and standalone
browser builds; compares numeric reference oracles and per-key logical traces.
No hardware capture or firmware parity is claimed.
"""
import asyncio
import hashlib
import math
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
CASES=(
 {"id":"constant-speed-light","keys":("SHIFT","7","2","8","EQUAL"),
  "mode":"COMP","screen":"result","number":299792458,"abs_tolerance":1e-9},
 {"id":"constant-gravity","keys":("SHIFT","7","3","5","EQUAL"),
  "mode":"COMP","screen":"result","number":9.80665,"abs_tolerance":1e-12},
 {"id":"convert-centimeters","keys":("5","SHIFT","8","0","2","EQUAL"),
  "mode":"COMP","screen":"result","number":1.968503937,"abs_tolerance":1e-9},
 {"id":"convert-celsius","keys":("NEG","3","1","SHIFT","8","3","8","EQUAL"),
  "mode":"COMP","screen":"result","number":-23.8},
 {"id":"stat-mean","keys":("MODE","3","1","1","EQUAL","2","EQUAL",
                         "3","EQUAL","CALC"),
  "mode":"STAT","screen":"flow-result","number":2},
 {"id":"stat-variance-menu","keys":("MODE","3","1","1","EQUAL","2","EQUAL",
                                  "3","EQUAL","SHIFT","1","5","2"),
  "mode":"STAT","screen":"flow-result","number":2},
 {"id":"table-square","keys":("MODE","7","ALPHA","LP","SQUARE","EQUAL",
                             "NEG","1","EQUAL","1","EQUAL","DOT","5","EQUAL"),
  "mode":"TABLE","screen":"table-grid","rows":5,
  "f_values":(1,.25,0,.25,1)},
 {"id":"table-linear","keys":("MODE","7","ALPHA","LP","EQUAL",
                             "0","EQUAL","2","EQUAL","1","EQUAL"),
  "mode":"TABLE","screen":"table-grid","rows":3,
  "f_values":(0,1,2)}
)
FIELDS=("model","mode","screen","input","result","error","shift","alpha",
        "angle","format","math","menuKind","menuTitle","info")

def logical(s):
    return {key:s.get(key) for key in FIELDS}

async def replay(browser,base,file,case,output):
    page=await browser.new_page(viewport={"width":1200,"height":1280},
                                device_scale_factor=1)
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(base+file+"?plus035="+case["id"],wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        trace=[]
        for key in case["keys"]:
            await page.locator("#keys button[data-key='"+key+"']").click()
            state=await page.evaluate("window.FreshCalculator.getState()")
            trace.append({"key":key,"state":logical(state)})
        s=await page.evaluate("window.FreshCalculator.getState()")
        assert s["model"]=="fx-991es-plus",(file,"wrong calculator model")
        assert s["mode"]==case["mode"],(file,case["id"],"mode",s["mode"])
        assert s["screen"]==case["screen"],(file,case["id"],"screen",s["screen"])
        if "number" in case:
            actual=s["raw"]
            assert isinstance(actual,(int,float)) and math.isfinite(actual), (
                file,case["id"],"non-finite result",actual)
            assert abs(actual-case["number"])<=case.get("abs_tolerance",1e-10), (
                file,case["id"],"number",actual,case["number"])
        if "rows" in case:
            rows=s["tableData"]["rows"]
            assert len(rows)==case["rows"],(file,case["id"],"rows",len(rows))
            for row,want in zip(rows,case["f_values"]):
                assert abs(row["f"]-want)<1e-10,(file,case["id"],row,want)
        assert not errors,(file,case["id"],errors)
        filename=file.replace(".html","")+"-"+case["id"]+".png"
        img=output/filename
        await page.locator("#lcd").screenshot(path=str(img))
        return {"publication":file,"id":case["id"],"keys":case["keys"],
                "trace":trace,"final":logical(s),"raw":s["raw"],
                "table_rows":s.get("tableData",{}).get("rows") if s.get("tableData") else None,
                "web_lcd_png":filename,
                "web_lcd_sha256":hashlib.sha256(img.read_bytes()).hexdigest(),
                "native_hardware_evidence":False}
    finally:
        await page.close()

def compare(left,right,output):
    issues=[]
    if left["trace"]!=right["trace"]:
        for index,(a,b) in enumerate(zip(left["trace"],right["trace"]),1):
            if a!=b:
                issues.append({"kind":"key_state","step":index,
                               "modular":a,"standalone":b})
        if len(left["trace"])!=len(right["trace"]):
            issues.append({"kind":"trace_length"})
    if left["raw"]!=right["raw"]:
        issues.append({"kind":"numeric","modular":left["raw"],
                       "standalone":right["raw"]})
    if left["table_rows"]!=right["table_rows"]:
        issues.append({"kind":"table_rows"})
    with Image.open(output/left["web_lcd_png"]) as a,Image.open(
            output/right["web_lcd_png"]) as b:
        if a.size!=b.size:
            issues.append({"kind":"lcd_dimensions","modular":a.size,
                           "standalone":b.size})
        else:
            diff=ImageChops.difference(a.convert("RGB"),b.convert("RGB"))
            count=sum(any(pixel) for pixel in diff.getdata())
            if count:
                issues.append({"kind":"lcd_pixels","changed":count})
                diff.save(output/(left["id"]+"-diff.png"))
    return issues

async def main():
    output=Path(os.getenv("PLUS035_CAPTURE_DIR","/tmp/plus035-browser-captures"))
    output.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus035-web-reference-v1","model":"fx-991ES PLUS (2nd edition)",
            "hardware_verified":False,"cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for case in CASES:
                    results=[]
                    for file in FILES:
                        try:
                            results.append(await replay(browser,base,file,case,output))
                        except Exception as exc:
                            report["failures"].append({"id":case["id"],
                                "publication":file,"kind":"execution","message":str(exc)})
                    discrepancies=compare(*results,output) if len(results)==2 else [
                        {"kind":"missing_publication"}]
                    report["cases"].append({"id":case["id"],"captures":results,
                                            "differences":discrepancies})
                    report["failures"].extend({"id":case["id"],**x} for x in discrepancies)
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and len(
            report["cases"])==len(CASES) else "FAIL_WEB_REFERENCE"
        (output/"plus035-report.json").write_text(json.dumps(
            report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:8]
    print("PLUS-035 PASS",len(CASES),"independent browser reference cases ×",
          len(FILES),"publications")

if __name__=="__main__":
    asyncio.run(main())
