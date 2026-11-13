#!/usr/bin/env python3
"""PLUS-026: real browser physical-button checks and full policy inventory.
Runs on both modular and standalone calculator. Not real-device parity.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")

async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()

async def snapshot(page):
    return await page.evaluate("window.FreshCalculator.getState()")

async def fresh(page,root,file,case):
    await page.goto(root+file+"?plus026="+case,wait_until="load")
    await page.locator("#keys button[data-key='MODE']").wait_for()

async def verify(page,root,file):
    data=await page.evaluate("""() => ({
      physical:[...document.querySelectorAll('#keys button[data-key]')].map(x=>x.dataset.key),
      rows:window.FreshCalculator.legendInventory(),
      model:Object.keys(window.FreshCalculator.modelProfiles)
    })""")
    assert data["model"]==["fx-991es-plus"],(file,"model")
    assert len(data["physical"])==50 and len(set(data["physical"]))==50,(file,"key count")
    assert len(data["rows"])==28800,(file,"inventory count",len(data["rows"]))
    assert len(set((r["key"],r["modifier"],r["mode"],r["screen"]) for r in data["rows"]))==28800,(file,"duplicate policy")

    # Press the actual physical numeric/operator buttons, not an internal evaluator.
    await fresh(page,root,file,"ordinary")
    await press(page,"1","ADD","2","EQUAL")
    s=await snapshot(page)
    assert s["screen"]=="result" and abs(s["raw"]-3)<1e-12,(file,"arithmetic",s["result"])
    await press(page,"AC")
    await press(page,"SHIFT","7")
    s=await snapshot(page)
    assert s["screen"]=="constant-code",(file,"SHIFT+7",s["screen"])
    await press(page,"2","8")
    s=await snapshot(page)
    assert s["screen"]=="edit" and s["input"],(file,"constant insertion",s["screen"])

    await fresh(page,root,file,"mode-shift")
    await press(page,"MODE","4")
    s=await snapshot(page)
    assert s["mode"]=="BASE-N",(file,"BASE-N",s["mode"])
    await press(page,"MODE","1")
    s=await snapshot(page)
    assert s["mode"]=="COMP",(file,"return COMP",s["mode"])

    # SHIFT+2 is contextual and must not silently change into CMPLX mode.
    await press(page,"SHIFT","2")
    s=await snapshot(page)
    assert s["mode"]=="COMP",(file,"SHIFT+2 changed MODE",s["mode"])

    await fresh(page,root,file,"alpha")
    await press(page,"ALPHA","LP")
    s=await snapshot(page)
    assert s["screen"]=="edit" and "X" in s["input"],(file,"ALPHA X",s["input"])

    # An actual focused physical button should invoke only one action on Enter.
    await fresh(page,root,file,"enter")
    await page.locator("#keys button[data-key='3']").focus()
    await page.keyboard.press("Enter")
    s=await snapshot(page)
    assert s["input"]=="3",(file,"button native Enter",s["input"])
    print("PLUS-026 PASS",file,"28800 policy entries and actual key sequences")

async def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    root="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page()
                    errors=[]
                    page.on("pageerror",lambda e:errors.append(str(e)))
                    await fresh(page,root,file,"inventory")
                    await verify(page,root,file)
                    assert not errors,(file,errors)
                    await page.close()
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__": asyncio.run(main())
