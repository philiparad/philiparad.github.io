#!/usr/bin/env python3
"""REA-101: original STAT P(t) UI trace in modular and generated standalone.

Requires Playwright + Chromium. Source/web evidence only, not a physical
CASIO observation or precision certificate.
"""
import asyncio
import math
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
MODELS=("fx-991es","fx-991es-plus","fx-991es-plus-c")


async def keys(page, sequence):
    for key in sequence:
        await page.locator("#keys button[data-key='"+key+"']").click()


async def state(page):
    return await page.evaluate("() => window.FreshCalculator.getState()")


async def enter_one_var(page):
    await keys(page,("MODE","3","1"))
    current=await state(page)
    assert current["mode"]=="STAT",current
    assert current["statTable"]["regressionType"]=="1VAR",current
    return current


async def open_distr_p(page):
    await keys(page,("SHIFT","1"))
    current=await state(page)
    assert current["screen"]=="menu"
    assert any("Distr" in x for x in current["menuEntries"]),current
    await keys(page,("7",))
    current=await state(page)
    assert current["menuTitle"]=="STAT Distr",current
    assert any("1. P(" in x for x in current["menuEntries"]),current
    await keys(page,("1",))
    current=await state(page)
    assert current["screen"]=="prompt" and current["flow"]["title"]=="STAT P(",current


async def main():
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    prefix="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    try:
        async with async_playwright() as playwright:
            browser=await playwright.chromium.launch()
            try:
                for filename in FILES:
                    for model in MODELS:
                        page=await browser.new_page(viewport={"width":1080,"height":1100})
                        errors=[]
                        page.on("pageerror",lambda error: errors.append(str(error)))
                        try:
                            await page.goto(prefix+filename+"?model="+model,wait_until="load")
                            await page.locator("#keys button[data-key='EQUAL']").wait_for()
                            await enter_one_var(page)
                            await keys(page,("SHIFT","1"))
                            present=await state(page)
                            found=any("Distr" in x for x in present["menuEntries"])
                            assert found==(model=="fx-991es"),(filename,model,present["menuEntries"])
                            if model!="fx-991es":
                                await keys(page,("AC",))
                                assert (await state(page))["screen"]!="prompt"
                                assert not errors,(filename,model,errors)
                                continue
                            await keys(page,("7","1","EQUAL"))
                            zero=await state(page)
                            assert zero["screen"]=="flow-result",zero
                            assert zero["ans"]==0.5,zero
                            assert zero["outputLines"][0]=="P(0)",zero
                            await keys(page,("AC",))
                            await open_distr_p(page)
                            await keys(page,("NEG","8","EQUAL"))
                            lower=await state(page)
                            want=6.22096057427178e-16
                            assert math.isclose(lower["ans"],want,rel_tol=2e-12),lower
                            assert lower["outputLines"][0]=="P(-8)",lower
                            await keys(page,("AC",))
                            current=await state(page)
                            assert math.isclose(current["ans"],want,rel_tol=2e-12),current
                            await open_distr_p(page)
                            await keys(page,("1","DIV","0","EQUAL"))
                            bad=await state(page)
                            assert bad["screen"]=="prompt",bad
                            assert "ERROR" in (bad["info"] or ""),bad
                            assert math.isclose(bad["ans"],want,rel_tol=2e-12),bad
                            await keys(page,("AC",))
                            assert (await state(page))["flow"] is None
                            assert not errors,(filename,model,errors)
                            print(filename,model,"P(0), P(-8), math error, cancel, isolation PASS")
                        finally:
                            await page.close()
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__=="__main__":
    asyncio.run(main())
