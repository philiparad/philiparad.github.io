#!/usr/bin/env python3
"""REA-103 browser key trace: original STAT R(t), modular versus standalone.

Run: python3 calculator/tests/rea103_browser_stat_r.py
Requires Playwright Chromium; this is NOT physical CASIO verification.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
CASES=((0,0.5),(1,0.158655253931457),(-1,0.841344746068543),
       (2,0.0227501319481792),(-2,0.977249868051821),
       (5,2.86651571879193e-7))


async def press(page,*keys):
    for key in keys:
        await page.locator(f"#keys button[data-key='{key}']").click()


async def run_case(browser,base,filename,t):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(base+filename+"?model=fx-991es",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await press(page,"MODE","3","1")
        await press(page,"SHIFT","1","7","3")
        expression=(await page.locator("#expression-text").inner_text()).strip()
        assert "R(" in expression,(filename,t,expression)
        if t<0:
            await press(page,"NEG")
        for digit in str(abs(t)):
            await press(page,digit)
        await press(page,"RP","EQUAL")
        value=(await page.locator("#answer-text").inner_text()).strip()
        assert not errors,(filename,t,errors)
        return float(value)
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
                for t,want in CASES:
                    outputs=[]
                    for file in FILES:
                        actual=await run_case(browser,base,file,t)
                        assert abs(actual-want)<max(1e-9,abs(want)*1e-6),(file,t,actual,want)
                        outputs.append(actual)
                    assert abs(outputs[0]-outputs[1])<1e-10
                    print(f"REA-103 R({t}) modular == standalone: PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__=="__main__":
    asyncio.run(main())
