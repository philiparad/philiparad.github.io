#!/usr/bin/env python3
"""PLUS-050: browser keypad stress of SOLVE, SUM, integration, ON/AC/MODE.

Actual DOM key sequences are used in both calculator publications. Worker is
a deterministic browser test double; tests are not native-device evidence.
"""
import asyncio
import json
import math
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
SOLVE=("ALPHA","LP","SUB","2","SHIFT","CALC","EQUAL")
SUM=("SHIFT","LOGBASE","ALPHA","LP","RIGHT","1","RIGHT","3","RIGHT","EQUAL")
INTEGRAL=("INTEGRAL","ALPHA","LP","RIGHT","0","RIGHT","1","RIGHT","EQUAL")
CASES=(
 {"id":"solve-on-restart","keys":SOLVE,"interrupt":("ON",),"next":SOLVE,"kind":"SOLVE"},
 {"id":"solve-mode-restart","keys":SOLVE,"interrupt":("MODE","2","MODE","1"),
  "next":SOLVE,"kind":"SOLVE"},
 {"id":"solve-rapid-ac","keys":SOLVE,"interrupt":("7","8","AC"),
  "next":SOLVE,"kind":"SOLVE"},
 {"id":"sum-to-integral","keys":SUM,"interrupt":("AC",),
  "next":INTEGRAL,"kind":"INTEGRAL"},
 {"id":"integral-to-sum","keys":INTEGRAL,"interrupt":("AC",),
  "next":SUM,"kind":"SUM"}
)
CONTROLLED_WORKER="""
window.__plus050Workers=[];
window.Worker=class ControlledWorker {
 constructor(url){this.url=url;this.terminated=false;
   window.__plus050Workers.push(this);}
 postMessage(payload){this.request=payload;}
 terminate(){this.terminated=true;}
};
"""

async def press(page,keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()

async def state(page):
    return await page.evaluate("window.FreshCalculator.getState()")

async def late(page,index,value):
    await page.evaluate("""([index,value]) => {
      const w=window.__plus050Workers[index];
      if(w.onmessage)w.onmessage({data:{id:1,ok:true,value,residual:0}});
    }""",[index,value])
    await page.evaluate("() => Promise.resolve()")

async def run_case(browser,origin,file,case,folder):
    page=await browser.new_page(viewport={"width":1200,"height":1280},
                                device_scale_factor=1)
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    await page.add_init_script(CONTROLLED_WORKER)
    try:
        await page.goto(origin+file+"?plus050="+case["id"],wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        initial=await state(page)
        before_x=initial["memory"]["X"]
        before_ans=initial["ans"]
        await press(page,case["keys"])
        first=await state(page)
        assert first["screen"]=="calculating",(
            file,case["id"],"first operation not pending",first["screen"],first["input"])
        assert await page.evaluate("window.__plus050Workers.length")==1
        workers=await page.evaluate("""() => window.__plus050Workers.map(w=>({
          task:w.request?.task?.kind,terminated:w.terminated
        }))""")
        assert workers[0]["task"]==("SOLVE" if case["keys"]==SOLVE
                                   else "SUM" if case["keys"]==SUM else "INTEGRAL"),(
            file,case["id"],"first task",workers)
        await press(page,case["interrupt"])
        interrupted=await state(page)
        assert interrupted["memory"]["X"]==before_x and (
            interrupted["ans"]==before_ans),(file,case["id"],"cancel mutated registers")
        assert interrupted["screen"]=="edit",(file,case["id"],"cancel screen",interrupted["screen"])
        assert await page.evaluate(
            "window.__plus050Workers[0].terminated"),(
            file,case["id"],"first worker not terminated")
        await press(page,case["next"])
        next_state=await state(page)
        assert next_state["screen"]=="calculating",(
            file,case["id"],"second operation not pending",next_state["screen"],next_state["input"])
        assert await page.evaluate("window.__plus050Workers.length")==2,(
            file,case["id"],"second worker not created")
        next_kind=await page.evaluate(
            "window.__plus050Workers[1].request.task.kind")
        assert next_kind==case["kind"],(file,case["id"],"wrong replacement task",next_kind)
        await late(page,0,987654321)
        after_stale=await state(page)
        assert after_stale["screen"]=="calculating" and (
            after_stale["memory"]["X"]==before_x and
            after_stale["ans"]==before_ans),(
            file,case["id"],"stale worker committed result")
        assert after_stale["solveSession"] is None,(
            file,case["id"],"stale SOLVE session")
        # For a linear X-2 SOLVE, the controlled worker returns root 2.
        value=2 if case["kind"]=="SOLVE" else (0.5 if case["kind"]=="INTEGRAL" else 6)
        await late(page,1,value)
        await page.wait_for_function("""() => {
          const s=window.FreshCalculator.getState();
          return s.screen==='flow-result' || s.screen==='result';
        }""",timeout=3000)
        final=await state(page)
        assert final["memory"]["X"]==(
            2 if case["kind"]=="SOLVE" else before_x),(
            file,case["id"],"wrong final X")
        assert math.isfinite(final["raw"]) and abs(final["raw"]-value)<1e-9,(
            file,case["id"],"wrong result",final["raw"])
        assert await page.evaluate(
            "window.__plus050Workers[1].terminated"),(
            file,case["id"],"replacement worker not terminated")
        assert not errors,(file,case["id"],errors)
        png=file.replace(".html","")+"-"+case["id"]+".png"
        await page.locator("#lcd").screenshot(path=str(folder/png))
        return {"publication":file,"id":case["id"],
                "mode":final["mode"],"screen":final["screen"],
                "result":final["result"],"raw":final["raw"],
                "x":final["memory"]["X"],"ans":final["ans"],
                "solve":final.get("solveSession"),
                "lines":final.get("outputLines"),"png":png,
                "hardware_verified":False}
    finally:
        await page.close()

async def main():
    folder=Path(os.getenv("PLUS050_CAPTURE_DIR","/tmp/plus050-browser-captures"))
    folder.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus050-numeric-keypad-v1","native_hardware_verified":False,
            "cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for case in CASES:
                    captures=[]
                    for file in FILES:
                        try:
                            captures.append(await run_case(browser,origin,file,case,folder))
                        except Exception as exc:
                            report["failures"].append({"case":case["id"],
                                "publication":file,"error":str(exc)})
                    if len(captures)==2:
                        a,b=captures
                        for key in ("mode","screen","result","raw","x","ans","solve","lines"):
                            if a[key]!=b[key]:
                                report["failures"].append({"case":case["id"],
                                    "field":key,"kind":"web_parity",
                                    "modular":a[key],"standalone":b[key]})
                        with Image.open(folder/a["png"]) as left,Image.open(folder/b["png"]) as right:
                            if left.size!=right.size:
                                report["failures"].append({"case":case["id"],
                                    "kind":"lcd_dimensions"})
                            else:
                                delta=ImageChops.difference(left.convert("RGB"),right.convert("RGB"))
                                pixels=sum(any(pixel) for pixel in delta.getdata())
                                if pixels:
                                    delta.save(folder/(case["id"]+"-lcd-diff.png"))
                                    report["failures"].append({"case":case["id"],
                                        "kind":"lcd_pixels","count":pixels})
                    report["cases"].append({"id":case["id"],"captures":captures})
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and (
            len(report["cases"])==len(CASES)) else "FAIL_WEB_REFERENCE"
        (folder/"plus050-report.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:8]
    print("PLUS-050 WEB PASS:",len(CASES),"scenarios in both web releases")

if __name__=="__main__":
    asyncio.run(main())
