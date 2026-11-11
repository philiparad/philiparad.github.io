#!/usr/bin/env python3
"""REA-102: browser key trace for original fx-991ES STAT Q(t).

Requires Python Playwright + Chromium:
  python3 calculator/tests/rea102_browser_stat_q.py
Compares modular/standalone web output, NOT genuine CASIO hardware.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
CASES=((0,0.0),(1,0.341344746068543),(-1,-0.341344746068543),
       (2,0.477249868051821),(-2,-0.477249868051821))


async def press(page,*keys):
    for key in keys:
        await page.locator(f"#keys button[data-key='{key}']").click()


async def run_case(browser,base,filename,t):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    problems=[]
    page.on("pageerror",lambda exc:problems.append(str(exc)))
    try:
        await page.goto(base+filename+"?model=fx-991es",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await press(page,"MODE","3","1")    # original STAT, 1-VAR
        await press(page,"SHIFT","1","7","2") # STAT → Distr → Q(
        expression=await page.locator("#expression-text").inner_text()
        assert "Q(" in expression,(filename,t,"missing Q(",expression)
        if t<0:
            await press(page,"NEG")
        for digit in str(abs(t)):
            await press(page,digit)
        await press(page,"RP","EQUAL")
        display=(await page.locator("#answer-text").inner_text()).strip()
        assert not problems,(filename,t,problems)
        return float(display)
    finally:
        await page.close()


async def main():
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    root=f"http://127.0.0.1:{server.server_address[1]}/calculator/"
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for t,want in CASES:
                    outputs=[]
                    for filename in FILES:
                        value=await run_case(browser,root,filename,t)
                        assert abs(value-want)<1e-8,(filename,t,value,want)
                        outputs.append(value)
                    assert abs(outputs[0]-outputs[1])<1e-11,(t,outputs)
                    print(f"REA-102 web Q({t}) modular == standalone: PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__=="__main__":
    asyncio.run(main())
