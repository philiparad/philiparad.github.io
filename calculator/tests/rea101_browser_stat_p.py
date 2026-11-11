#!/usr/bin/env python3
"""REA-101: browser key-trace for original fx-991ES STAT Distr P(t).

Run: python3 calculator/tests/rea101_browser_stat_p.py
Requires playwright and chromium. Browser parity is not physical CASIO evidence.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")

async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()

async def run_case(browser,base,filename,model,t):
    page=await browser.new_page()
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(base+filename+"?model="+model,wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await press(page,"MODE","3","1") # STAT / 1-VAR
        await press(page,"SHIFT","1","7","1")
        if model!="fx-991es":
            assert "P(" not in await page.locator("#expression-text").inner_text()
            return "unsupported"
        assert "P(" in await page.locator("#expression-text").inner_text()
        if t<0: await press(page,"NEG")
        for digit in str(abs(t)):
            await press(page,digit)
        await press(page,"RP","EQUAL")
        assert not errors,(filename,errors)
        result=await page.locator("#answer-text").inner_text()
        assert result.strip()!=""
        return result.strip()
    finally:
        await page.close()

async def main():
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    try:
        async with async_playwright() as playwright:
            browser=await playwright.chromium.launch()
            try:
                for t,expected in [(0,0.5),(1,0.841344746068543),(-1,0.158655253931457)]:
                    outputs=[]
                    for filename in FILES:
                        text=await run_case(browser,base,filename,"fx-991es",t)
                        actual=float(text)
                        assert abs(actual-expected)<1e-8,(filename,t,text,expected)
                        outputs.append(actual)
                    assert abs(outputs[0]-outputs[1])<1e-11
                    print("original STAT P("+str(t)+") modular == standalone PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
