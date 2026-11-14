#!/usr/bin/env python3
"""PLUS-037: real-key CALC/SOLVE and deterministic numeric-worker cancellation.

The stalled worker in cancellation cases is a deliberately controlled browser
test double, NOT physical-device behavior. Compare both web publications.
"""
import asyncio
import json
import os
import threading
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
SOLVE=("ALPHA","LP","SUB","2","SHIFT","CALC")
CALC=("ALPHA","LP","ADD","3","CALC")
STALLED_WORKER=r"""
window.__plus037Workers = [];
window.Worker = class ControlledWorker {
    constructor(url) {
        this.url = url; this.terminated = false;
        window.__plus037Workers.push(this);
    }
    postMessage(message) { this.lastMessage = message; }
    terminate() { this.terminated = true; }
};
"""

async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()

async def state(page):
    return await page.evaluate("window.FreshCalculator.getState()")

async def run_case(browser,base,file,kind,folder):
    page=await browser.new_page()
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    if kind.startswith("cancel-"):
        await page.add_init_script(STALLED_WORKER)
    trace=[]
    try:
        await page.goto(base+file+"?plus037="+kind,wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        sequence=CALC if kind=="calc-substitution" else SOLVE
        for key in sequence:
            await press(page,key)
            s=await state(page)
            trace.append({"key":key,"mode":s["mode"],"screen":s["screen"],
                          "input":s["input"],"memory_x":s["memory"]["X"]})
        s=await state(page)
        assert s["screen"]=="prompt",(file,kind,"prompt",s["screen"],s.get("error"))
        if kind=="calc-substitution":
            assert s["flow"]["fieldId"]=="X",(file,kind,s["flow"])
            await press(page,"4","EQUAL")
            s=await state(page)
            assert s["screen"]=="result" and abs(s["raw"]-7)<1e-10,(file,kind,s["screen"],s["raw"])
            assert s["memory"]["X"]==4,(file,kind,"register not committed")
        else:
            before=s["memory"]["X"]
            await press(page,"EQUAL")
            if kind=="solve-success":
                await page.wait_for_function(
                    "() => window.FreshCalculator.getState().screen === 'flow-result'",
                    timeout=10000)
                s=await state(page)
                assert abs(s["raw"]-2)<1e-8,(file,kind,"root",s["raw"])
                assert abs(s["memory"]["X"]-2)<1e-8,(file,kind,"X not committed")
                assert s["solveSession"] is not None,(file,kind,"session missing")
            else:
                await page.wait_for_function(
                    "() => window.FreshCalculator.getState().screen === 'calculating'",
                    timeout=2000)
                s=await state(page)
                assert s["memory"]["X"]==before,(file,kind,"premature register mutation")
                assert await page.evaluate("window.__plus037Workers.length")==1,(file,kind,"worker not created")
                await press(page,"AC" if kind=="cancel-ac" else "MODE")
                s=await state(page)
                if kind=="cancel-ac":
                    assert s["screen"]=="edit" and s["flow"] is None,(file,kind,s["screen"])
                else:
                    assert s["screen"]=="menu" and s["menuKind"]=="mode",(file,kind,s["screen"])
                    await press(page,"2")
                    s=await state(page)
                    assert s["mode"]=="CMPLX" and s["screen"]=="edit",(file,kind,s["screen"])
                assert s["memory"]["X"]==before,(file,kind,"cancel updated memory")
                assert await page.evaluate(
                    "window.__plus037Workers[0].terminated"),(file,kind,"worker not terminated")
        assert not errors,(file,kind,errors)
        image=file.replace(".html","")+"-"+kind+".png"
        await page.locator("#lcd").screenshot(path=str(folder/image))
        return {"file":file,"case":kind,"trace":trace,"mode":s["mode"],
                "screen":s["screen"],"memory_x":s["memory"]["X"],
                "raw":s["raw"],"lcd_png":image,"physical_hardware_verified":False}
    finally:
        await page.close()

async def main():
    folder=Path(os.getenv("PLUS037_CAPTURE_DIR","/tmp/plus037-browser-captures"))
    folder.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus037-advanced-numeric-web-v1","physical_hardware_verified":False,
            "cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for kind in ("calc-substitution","solve-success","cancel-ac","cancel-mode"):
                    outcomes=[]
                    for file in FILES:
                        try:
                            outcomes.append(await run_case(browser,base,file,kind,folder))
                        except Exception as exc:
                            report["failures"].append({"case":kind,"file":file,"error":str(exc)})
                    if len(outcomes)==2:
                        for key in ("trace","mode","screen","memory_x","raw"):
                            if outcomes[0][key]!=outcomes[1][key]:
                                report["failures"].append({"case":kind,
                                    "kind":"modular_standalone_difference","field":key,
                                    "modular":outcomes[0][key],"standalone":outcomes[1][key]})
                        with Image.open(folder/outcomes[0]["lcd_png"]) as left, Image.open(
                                folder/outcomes[1]["lcd_png"]) as right:
                            if left.size!=right.size:
                                report["failures"].append({"case":kind,
                                    "kind":"lcd_dimensions",
                                    "modular":list(left.size),"standalone":list(right.size)})
                            else:
                                delta=ImageChops.difference(
                                    left.convert("RGB"),right.convert("RGB"))
                                pixels=sum(any(pixel) for pixel in delta.getdata())
                                if pixels:
                                    delta.save(folder/(kind+"-lcd-diff.png"))
                                    report["failures"].append({"case":kind,
                                        "kind":"lcd_pixels","differing_pixels":pixels})
                    report["cases"].append({"id":kind,"outcomes":outcomes})
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and len(
            report["cases"])==4 else "FAIL_WEB_REFERENCE"
        (folder/"plus037-report.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:8]
    print("PLUS-037 WEB PASS: four CALC/SOLVE/cancellation cases across two browser builds")

if __name__=="__main__":
    asyncio.run(main())
