#!/usr/bin/env python3
"""PLUS-047: CALC/SOLVE residual, registers and late cancellation protections.

Runs real calculator DOM key presses in both web releases. A deliberately
nonresponding Worker test double is used only for cancellation cases.
This is not a physical CASIO firmware or LCD certification.
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
CALC=("ALPHA","LP","ADD","3","CALC")
SOLVE=("ALPHA","LP","SUB","2","SHIFT","CALC")
STALLED_WORKER="""
window.__plus047Workers=[];
window.Worker=class ControlledWorker {
  constructor(url){this.url=url;this.terminated=false;window.__plus047Workers.push(this);}
  postMessage(message){this.lastMessage=message;}
  terminate(){this.terminated=true;}
};
"""

async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()

async def state(page):
    return await page.evaluate("window.FreshCalculator.getState()")

def close(actual,want,tolerance=1e-9):
    return isinstance(actual,(int,float)) and math.isfinite(actual) and abs(actual-want)<=tolerance

async def run_case(browser,origin,file,kind,output):
    page=await browser.new_page(viewport={"width":1200,"height":1280},device_scale_factor=1)
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    if kind.startswith("cancel-"):
        await page.add_init_script(STALLED_WORKER)
    try:
        await page.goto(origin+file+"?plus047="+kind,wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        initial=await state(page)
        assert initial["mode"]=="COMP" and initial["screen"]=="edit", (file,kind,"initial mode")
        original_ans=initial["ans"]
        original_raw=initial["raw"]
        original_x=initial["memory"]["X"]
        keys=CALC if kind=="calc-commit" else SOLVE
        trace=[]
        for key in keys:
            await press(page,key)
            snapshot=await state(page)
            trace.append({"key":key,"mode":snapshot["mode"],
                          "screen":snapshot["screen"],"input":snapshot["input"],
                          "x":snapshot["memory"]["X"],"ans":snapshot["ans"]})
        prompted=await state(page)
        assert prompted["mode"]=="COMP" and prompted["screen"]=="prompt",(
            file,kind,"prompt",prompted["screen"])
        assert prompted["flow"] is not None,(file,kind,"missing prompt")
        assert prompted["memory"]["X"]==original_x,(file,kind,"premature X mutation")
        if kind=="calc-commit":
            assert prompted["flow"]["fields"][0]["id"]=="X",(
                file,kind,"wrong CALC substitution variable")
            await press(page,"4","EQUAL")
            final=await state(page)
            assert final["screen"]=="result" and close(final["raw"],7),(
                file,kind,"CALC result",final["raw"])
            assert close(final["ans"],7) and close(final["memory"]["X"],4),(
                file,kind,"CALC register commit")
            assert final["flow"] is None and final["error"]=="",(
                file,kind,"unfinished CALC")
            session=final["calcSession"]
            assert session is not None and session["source"]=="X+3" and session["mode"]=="COMP",(
                file,kind,"CALC source",session)
            results=session["statementResults"]
            assert len(results)==1 and close(results[0]["value"],7),(
                file,kind,"CALC statement result",results)
        else:
            assert prompted["flow"]["fields"][-1]["id"]=="guess",(
                file,kind,"missing SOLVE guess")
            await press(page,"EQUAL")
            if kind=="solve-residual":
                await page.wait_for_function(
                    "() => window.FreshCalculator.getState().screen === 'flow-result'",
                    timeout=10000)
                final=await state(page)
                session=final["solveSession"]
                assert session is not None and not session.get("pending",False),(
                    file,kind,"pending SOLVE session")
                assert session["source"]=="X-2" and close(session["value"],2),(
                    file,kind,"unexpected SOLVE equation/root",session)
                assert close(session["residual"],0,1e-10),(
                    file,kind,"nonzero equation residual",session)
                assert close(final["raw"],2) and close(final["memory"]["X"],2),(
                    file,kind,"X register or result")
                assert final["ans"]==original_ans and final["flow"] is None,(
                    file,kind,"unexpected SOLVE Ans/flow mutation")
                assert final["error"]=="",(file,kind,"SOLVE error persisted")
                lines=final["outputLines"]
                assert len(lines)==3 and lines[0]=="X-2" and (
                    lines[1].startswith("X= ") and lines[2].startswith("L-R= ")),(
                    file,kind,"SOLVE diagnostics",lines)
            else:
                await page.wait_for_function(
                    "() => window.FreshCalculator.getState().screen === 'calculating'",
                    timeout=2000)
                pending=await state(page)
                assert pending["memory"]["X"]==original_x and (
                    pending["ans"]==original_ans and pending["raw"]==original_raw),(
                    file,kind,"uncommitted worker mutated calculator")
                assert pending["solveSession"] is None,(
                    file,kind,"pending worker created solved session")
                assert await page.evaluate("window.__plus047Workers.length")==1,(
                    file,kind,"missing test worker")
                await press(page,"AC" if kind=="cancel-ac" else "MODE")
                final=await state(page)
                if kind=="cancel-ac":
                    assert final["screen"]=="edit",(
                        file,kind,"AC did not return to editing")
                else:
                    assert final["screen"]=="menu" and final["menuKind"]=="mode",(
                        file,kind,"MODE did not open mode menu")
                    await press(page,"2")
                    final=await state(page)
                    assert final["mode"]=="CMPLX" and final["screen"]=="edit",(
                        file,kind,"MODE did not change mode")
                assert await page.evaluate(
                    "window.__plus047Workers[0].terminated"),(
                    file,kind,"worker not terminated")
                assert final["solveSession"] is None and final["flow"] is None,(
                    file,kind,"stale cancelled SOLVE context")
                assert final["memory"]["X"]==original_x and (
                    final["ans"]==original_ans and final["raw"]==original_raw),(
                    file,kind,"cancel changed registers")
                assert final["error"]=="",(file,kind,"cancel retained error")
                # Simulate a callback arriving after termination. It must not
                # install the rejected result or mutate any register.
                await page.evaluate("""() => {
                  const w=window.__plus047Workers[0];
                  if(w.onmessage)w.onmessage({
                    data:{id:1,ok:true,value:987654,residual:0}
                  });
                }""")
                await page.evaluate("() => Promise.resolve()")
                late=await state(page)
                assert late["memory"]["X"]==original_x and (
                    late["ans"]==original_ans and late["raw"]==original_raw),(
                    file,kind,"late worker callback committed answer")
                assert late["solveSession"] is None and late["flow"] is None,(
                    file,kind,"late worker callback restored SOLVE")
                final=late
        assert not errors,(file,kind,"page errors",errors)
        capture=file.replace(".html","")+"-"+kind+".png"
        await page.locator("#lcd").screenshot(path=str(output/capture))
        return {"publication":file,"case":kind,"trace":trace,
                "mode":final["mode"],"screen":final["screen"],
                "raw":final["raw"],"ans":final["ans"],
                "memory_x":final["memory"]["X"],"error":final["error"],
                "solve_session":final.get("solveSession"),
                "calc_session":final.get("calcSession"),
                "output_lines":final.get("outputLines"),
                "lcd":capture,"physical_hardware_verified":False}
    finally:
        await page.close()

async def main():
    output=Path(os.getenv("PLUS047_CAPTURE_DIR","/tmp/plus047-browser-captures"))
    output.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    report={"schema":"plus047-calc-solve-web-v1",
            "physical_hardware_verified":False,"cases":[],"failures":[]}
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for kind in ("calc-commit","solve-residual","cancel-ac","cancel-mode"):
                    captures=[]
                    for file in FILES:
                        try:
                            captures.append(await run_case(browser,base,file,kind,output))
                        except Exception as exc:
                            report["failures"].append({
                                "case":kind,"publication":file,"error":str(exc)})
                    if len(captures)==2:
                        left,right=captures
                        for key in ("trace","mode","screen","raw","ans",
                                    "memory_x","error","solve_session",
                                    "calc_session","output_lines"):
                            if left[key]!=right[key]:
                                report["failures"].append({
                                    "case":kind,"kind":"web_parity","field":key,
                                    "modular":left[key],"standalone":right[key]})
                        with Image.open(output/left["lcd"]) as a,Image.open(
                                output/right["lcd"]) as b:
                            if a.size!=b.size:
                                report["failures"].append({
                                    "case":kind,"kind":"lcd_dimensions"})
                            else:
                                difference=ImageChops.difference(
                                    a.convert("RGB"),b.convert("RGB"))
                                count=sum(any(pixel) for pixel in difference.getdata())
                                if count:
                                    difference.save(output/(kind+"-lcd-diff.png"))
                                    report["failures"].append({
                                        "case":kind,"kind":"lcd_pixels","count":count})
                    report["cases"].append({"id":kind,"captures":captures})
            finally:
                await browser.close()
    finally:
        server.shutdown();server.server_close()
        report["status"]="PASS_WEB_ONLY" if not report["failures"] and (
            len(report["cases"])==4) else "FAIL_WEB_REFERENCE"
        (output/"plus047-report.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf-8")
    assert report["status"]=="PASS_WEB_ONLY",report["failures"][:8]
    print("PLUS-047 WEB PASS: CALC, SOLVE and terminated worker scenarios in both web releases")

if __name__=="__main__":
    asyncio.run(main())
