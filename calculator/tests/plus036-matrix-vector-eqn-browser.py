#!/usr/bin/env python3
"""PLUS-036: reference-grounded MATRIX/VECTOR/EQN browser keypad parity.

All cases use actual calculator keys, document expected algebraic outcomes,
and compare modular/standalone key traces and LCD screenshots. This is
software-reference validation, not physical CASIO firmware certification.
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

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
CASES=(
 {"id":"matrix-det",
  "keys":("MODE","6","1","5","2","EQUAL","1","EQUAL","1","EQUAL","1","EQUAL",
          "SHIFT","4","7","SHIFT","4","3","RP","EQUAL"),
  "mode":"MATRIX","screen":"matrix-scalar","number":1},
 {"id":"matrix-transpose",
  "keys":("MODE","6","1","5","2","EQUAL","1","EQUAL","1","EQUAL","1","EQUAL",
          "SHIFT","4","8","SHIFT","4","3","RP","EQUAL"),
  "mode":"MATRIX","screen":"matrix-result","matrix":[[2,1],[1,1]]},
 {"id":"vector-add",
  "keys":("MODE","8","1","1","1","EQUAL","2","EQUAL",
          "SHIFT","5","1","2","1","3","EQUAL","4","EQUAL",
          "SHIFT","5","3","ADD","SHIFT","5","4","EQUAL"),
  "mode":"VECTOR","screen":"vector-result","vector":[4,6]},
 {"id":"vector-dot",
  "keys":("MODE","8","1","1","1","EQUAL","2","EQUAL",
          "SHIFT","5","1","2","1","3","EQUAL","4","EQUAL",
          "SHIFT","5","3","SHIFT","5","7","SHIFT","5","4","EQUAL"),
  "mode":"VECTOR","screen":"vector-scalar","number":11},
 {"id":"eqn-linear",
  "keys":("MODE","5","1","1","EQUAL","2","EQUAL","3","EQUAL",
          "2","EQUAL","3","EQUAL","4","EQUAL"),
  "mode":"EQN","screen":"eqn-result","solutions":[-1,2]},
 {"id":"eqn-cubic",
  "keys":("MODE","5","4","1","EQUAL","NEG","2","EQUAL",
          "NEG","1","EQUAL","2","EQUAL"),
  "mode":"EQN","screen":"eqn-result","solutions":[-1,2,1]},
 {"id":"eqn-error-coefficient",
  "keys":("MODE","5","3","1","EQUAL","0","EQUAL","0","EQUAL"),
  "mode":"EQN","screen":"eqn-coeff","coefficient_error":True},
)
FIELDS=("model","mode","screen","input","result","error","shift","alpha",
        "menuTitle","menuKind","info")
def logical(snapshot):
    return {field:snapshot.get(field) for field in FIELDS}
async def replay(browser,base,file,case,folder):
    page=await browser.new_page(viewport={"width":1200,"height":1280},
                                device_scale_factor=1)
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(base+file+"?plus036="+case["id"],wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        trace=[]
        for key in case["keys"]:
            await page.locator("#keys button[data-key='"+key+"']").click()
            snapshot=await page.evaluate("window.FreshCalculator.getState()")
            trace.append({"key":key,"state":logical(snapshot)})
        s=await page.evaluate("window.FreshCalculator.getState()")
        assert s["model"]=="fx-991es-plus",(file,case["id"],"model")
        assert s["mode"]==case["mode"],(file,case["id"],"mode",s["mode"])
        assert s["screen"]==case["screen"],(file,case["id"],"screen",s["screen"],s["error"])
        if "number" in case:
            assert abs(s["raw"]-case["number"])<1e-9,(file,case["id"],"numeric",s["raw"])
        if "matrix" in case:
            assert s["matrices"]["MatAns"]["data"]==case["matrix"],(file,case["id"],"matrix")
        if "vector" in case:
            assert s["vectors"]["VctAns"]["data"]==case["vector"],(file,case["id"],"vector")
        if "solutions" in case:
            values=[solution["value"] for solution in s["eqnSession"]["solutions"]]
            assert len(values)==len(case["solutions"]),(file,case["id"],values)
            assert all(abs(actual-expected)<1e-8 for actual,expected in zip(
                values,case["solutions"])),(file,case["id"],values)
        if case.get("coefficient_error"):
            assert s["eqnEditor"]["values"]["a"]==1,(file,case["id"],"coefficient state")
            assert s["eqnEditor"]["type"]=="QUAD",(file,case["id"],"equation type")
        assert not errors,(file,case["id"],errors)
        image=file.replace(".html","")+"-"+case["id"]+".png"
        png=folder/image
        await page.locator("#lcd").screenshot(path=str(png))
        return {"publication":file,"id":case["id"],"trace":trace,
                "final":logical(s),"raw":s.get("raw"),
                "matrix":s.get("matrices",{}).get("MatAns"),
                "vector":s.get("vectors",{}).get("VctAns"),
                "eqn":s.get("eqnSession"),"coeff":s.get("eqnEditor"),
                "image":image,"sha256":hashlib.sha256(png.read_bytes()).hexdigest(),
                "native_hardware_evidence":False}
    finally:
        await page.close()
def compare(a,b,folder):
    mismatches=[]
    for field in ("trace","final","raw","matrix","vector","eqn","coeff"):
        if a[field]!=b[field]:
            mismatches.append({"kind":field,"modular":a[field],"standalone":b[field]})
    with Image.open(folder/a["image"]) as x,Image.open(folder/b["image"]) as y:
        if x.size!=y.size:
            mismatches.append({"kind":"lcd_dimensions","modular":x.size,"standalone":y.size})
        else:
            delta=ImageChops.difference(x.convert("RGB"),y.convert("RGB"))
            count=sum(any(pixel) for pixel in delta.getdata())
            if count:
                mismatches.append({"kind":"lcd_pixels","count":count})
                delta.save(folder/(a["id"]+"-diff.png"))
    return mismatches
async def main():
    folder=Path(os.environ.get("PLUS036_CAPTURE_DIR","/tmp/plus036-browser-captures"))
    folder.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus036-web-algebra-v1","model":"fx-991ES PLUS (2nd edition)",
            "hardware_verified":False,"cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for case in CASES:
                    captures=[]
                    for file in FILES:
                        try:
                            captures.append(await replay(browser,base,file,case,folder))
                        except Exception as error:
                            report["failures"].append({"id":case["id"],"publication":file,
                                "kind":"execution","error":str(error)})
                    differences=compare(*captures,folder) if len(captures)==2 else [
                        {"kind":"missing_publication"}]
                    report["cases"].append({"id":case["id"],"captures":captures,
                                            "differences":differences})
                    report["failures"].extend({"id":case["id"],**entry}
                                              for entry in differences)
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and len(
            report["cases"])==len(CASES) else "FAIL_WEB_REFERENCE"
        (folder/"plus036-report.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:8]
    print("PLUS-036 PASS",len(CASES),"algebraic keypad cases across two browser publications")
if __name__=="__main__":
    asyncio.run(main())
