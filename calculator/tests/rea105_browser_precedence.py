#!/usr/bin/env python3
"""REA-105: key-driven browser parity for fx-991ES PLUS in both I/O modes.

Run: python3 calculator/tests/rea105_browser_precedence.py
Requires Playwright Chromium. Web behavior is not physical CASIO certification.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading

from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
MODELS=("fx-991es-plus",)
CASES=(
    (("8","DIV","2","LP","2","ADD","2","RP","EQUAL"),1.0),
    (("1","2","DIV","3","LP","1","ADD","3","RP","EQUAL"),1.0),
    (("LP","1","ADD","2","RP","3","EQUAL"),9.0),
    (("8","DIV","2","MUL","LP","2","ADD","2","RP","EQUAL"),16.0),
)

async def press(page,*keys):
    for key in keys:
        await page.locator(f"#keys button[data-key='{key}']").click()

async def exercise(browser,base,file,model,format_mode,keys,expected):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(f"{base}{file}?model={model}",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        if format_mode=="LineIO":
            await press(page,"SHIFT","MODE","2")
        settings=await page.evaluate("window.FreshCalculator.getState()")
        assert settings["math"]==(format_mode=="MathIO"),(file,model,format_mode,settings["math"])
        await press(page,*keys)
        answer=(await page.locator("#answer-text").inner_text()).strip()
        value=float(answer)
        assert abs(value-expected)<1e-9,(file,model,format_mode,keys,answer,expected)
        assert not errors,(file,model,format_mode,errors)
        if keys==CASES[0][0]:
            # Ans must preserve the calculated PLUS result.
            await press(page,"AC","ANS","ADD","1","EQUAL")
            ans=float((await page.locator("#answer-text").inner_text()).strip())
            assert abs(ans-(expected+1))<1e-9,(file,model,ans,expected)
            # Normal error recovery must not commit an invalid answer.
            await press(page,"AC","1","DIV","0","EQUAL")
            error_state=await page.evaluate("window.FreshCalculator.getState()")
            assert error_state["screen"]=="error",(file,model,error_state["screen"])
            await press(page,"AC")
            await press(page,"ANS","EQUAL")
            restored=float((await page.locator("#answer-text").inner_text()).strip())
            assert abs(restored-(expected+1))<1e-9,(file,model,restored)
        return value
    finally:
        await page.close()

async def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_address[1]}/calculator/"
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            try:
                for model in MODELS:
                    for format_mode in ("MathIO","LineIO"):
                        for keys,expected in CASES:
                            values=[]
                            for file in FILES:
                                values.append(await exercise(
                                    browser,base,file,model,format_mode,keys,expected))
                            assert values[0]==values[1],(model,format_mode,keys,values)
                            print(model,format_mode,keys,"both publications PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
