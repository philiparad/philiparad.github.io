#!/usr/bin/env python3
"""REA-104 — Browser key trace: original STAT X▶t plus P/Q/R reuse.

Run: python3 calculator/tests/rea104_browser_stat_t.py
Requires Playwright + Chromium. Web comparison is not hardware parity.
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


async def run_case(browser,base,file):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(base+file+"?model=fx-991es",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await press(page,"MODE","3","1")  # STAT, 1-VAR
        # Store three samples. '=' commits current value and advances a row.
        await press(page,"2","EQUAL","4","EQUAL","6","EQUAL","AC")
        await press(page,"6","SHIFT","1","7","4")  # 6▶t
        expression=(await page.locator("#expression-text").inner_text()).strip()
        assert "▶t" in expression,(file,expression)
        await press(page,"EQUAL")
        result=float((await page.locator("#answer-text").inner_text()).strip())
        assert abs(result-1.224744871391589)<1e-8,(file,result)
        # The normalized value is saved in Ans, so standard-normal P can
        # immediately consume it through the ordinary STAT calculation line.
        await press(page,"AC","SHIFT","1","7","1","ANS","RP","EQUAL")
        probability=float((await page.locator("#answer-text").inner_text()).strip())
        assert abs(probability-0.8896643190400766)<1e-8,(file,probability)
        assert not errors,(file,errors)
        return result,probability
    finally:
        await page.close()


async def main():
    server=ThreadingHTTPServer(("127.0.0.1",0),
        partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                results=[await run_case(browser,base,file) for file in FILES]
                assert all(abs(a-b)<1e-12 for a,b in zip(results[0],results[1]))
                print("REA-104 original STAT X▶t and P(Ans): modular == standalone PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__=="__main__":
    asyncio.run(main())
