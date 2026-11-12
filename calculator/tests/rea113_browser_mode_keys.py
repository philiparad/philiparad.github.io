#!/usr/bin/env python3
"""REA-113: physical keypad browser smoke for the PLUS model and two publications.
Tests EQN 1/2/3/4 with meaningful coefficient sets and every MODE menu entry.
This is web-behavior testing, not manufacturer hardware parity.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
MODELS=("fx-991es-plus",)
FILES=("index.html","fx991_fresh_standalone.html")
EQN_CASES=(
    ("1",(1,1,3,1,-1,1),"LINEAR2",2),
    ("2",(1,0,0,2,0,1,0,3,0,0,1,4),"LINEAR3",2),
    ("3",(1,0,-4),"QUAD",-2),
    ("4",(1,-2,-1,2),"CUBIC",-1),
)

async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+str(key)+"']").click()

async def state(page):
    return await page.evaluate("window.FreshCalculator.getState()")

def expect_ok(snapshot,model,mode,stage):
    assert snapshot["model"]==model,(stage,snapshot["model"],model)
    assert snapshot["mode"]==mode,(stage,snapshot["mode"],mode)
    assert snapshot["screen"]!="error",(stage,snapshot.get("error"))
    assert snapshot["error"]=="",(stage,snapshot["error"])

async def exercise(browser,url,file,model):
    page=await browser.new_page(viewport={"width":1150,"height":1300})
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    try:
        await page.goto(url+file+"?model="+model,wait_until="load")
        await page.locator("#keys button[data-key='MODE']").wait_for()
        menu_modes=("COMP","CMPLX","STAT","BASE-N","EQN","MATRIX","TABLE","VECTOR")
        # Each mode must be selectable by its actual numbered hardware key.
        for n,mode in enumerate(menu_modes,1):
            await press(page,"MODE",str(n))
            snap=await state(page)
            expect_ok(snap,model,mode,("mode",n))
            assert snap["screen"] in ("edit","menu","prompt"),(model,mode,snap["screen"])
            if snap["screen"] in ("menu","prompt"):
                await press(page,"AC")
        eqn_answers=[]
        for number,coefficients,kind,first_expected in EQN_CASES:
            await press(page,"MODE","5",number)
            snap=await state(page)
            expect_ok(snap,model,"EQN",("EQN type",number))
            assert snap["screen"]=="eqn-coeff",(model,number,snap["screen"])
            assert snap["eqnEditor"]["type"]==kind,(model,number,snap["eqnEditor"]["type"])
            for index,coefficient in enumerate(coefficients):
                if coefficient<0:
                    await press(page,"NEG")
                for digit in str(abs(coefficient)):
                    await press(page,digit)
                await press(page,"EQUAL")
                snap=await state(page)
                expect_ok(snap,model,"EQN",("EQN coefficient",number,index))
            assert snap["screen"]=="eqn-result",(model,number,snap["screen"])
            assert abs(snap["eqnSession"]["solutions"][0]["value"]-first_expected)<1e-8,(model,kind,snap["result"])
            eqn_answers.append((kind,snap["result"]))
            await press(page,"AC")
            assert (await state(page))["screen"]=="eqn-coeff"
        assert not errors,(file,model,errors)
        return eqn_answers
    finally:
        await page.close()

async def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/calculator/"
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for model in MODELS:
                    modular=await exercise(browser,base,FILES[0],model)
                    standalone=await exercise(browser,base,FILES[1],model)
                    assert modular==standalone,(model,modular,standalone)
                    print(model,"all MODE paths and EQN types 1-4: PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
