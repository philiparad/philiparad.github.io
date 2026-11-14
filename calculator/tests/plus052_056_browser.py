#!/usr/bin/env python3
"""PLUS-052..056: browser acceptance tests for web-only emulator extras."""
import asyncio
import functools
import http.server
import pathlib
import threading
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

async def verify(browser,page_name,base):
    context=await browser.new_context(accept_downloads=True)
    page=await context.new_page()
    errors=[]
    page.on("pageerror",lambda e: errors.append(str(e)))
    await page.goto(base+"/calculator/"+page_name)
    await page.locator("#calculator-help").wait_for()
    assert await page.evaluate("() => !!window.FreshCalculator && !!window.FreshEmulatorExtras")
    initial=await page.locator("#face").evaluate("(el) => el.getBoundingClientRect().width")
    await page.locator("#fit-face").click()
    fit=await page.locator("#face").evaluate("(el) => el.getBoundingClientRect().width")
    assert fit>=190 and fit<=470,(page_name,fit)
    await page.locator("#normal-face").click()
    restored=await page.locator("#face").evaluate("(el) => el.getBoundingClientRect().width")
    assert abs(restored-initial)<1,(page_name,initial,restored)

    await page.locator("#calculator-help").click()
    assert await page.get_by_role("dialog").count()==1
    assert await page.get_by_role("link",name="Official calculator manual").count()==1
    await page.keyboard.press("Escape")
    assert await page.get_by_role("dialog").count()==0

    await page.evaluate("() => {window.FreshCalculator.press('MODE');window.FreshCalculator.press('0');}")
    await page.get_by_role("dialog").wait_for()
    demo=await page.get_by_role("dialog").locator("code").inner_text()
    assert len(demo)==24
    assert await page.get_by_role("dialog").locator("svg rect").count()>100
    await page.keyboard.press("Escape")
    assert (await page.evaluate("() => window.FreshCalculator.getState().screen"))=="menu"

    await page.locator("#keylog-toggle").click()
    await page.locator("#record-keylog").click()
    await page.evaluate("() => {window.FreshCalculator.press('1');window.FreshCalculator.press('SHIFT');window.FreshCalculator.press('2');}")
    details=await page.evaluate("() => {const canvas=window.FreshEmulatorExtras.renderKeylog();return [canvas.width,canvas.height,window.FreshCalculator.getState().keylog.length];}")
    assert details[0]>100 and details[1]>40 and details[2]>=3,(page_name,details)
    async with page.expect_download() as download:
        await page.locator("#export-graphic-keys").click()
    assert (await download.value).suggested_filename=="calculator-keylog.png"

    async with page.expect_popup() as pop:
        await page.locator("#popout-lcd").click()
    child=await pop.value
    await child.locator("#remote-lcd").wait_for()
    await page.evaluate("() => window.FreshCalculator.press('AC')")
    await page.wait_for_timeout(250)
    pixels=await child.locator("#remote-lcd").evaluate("(canvas) => ({width:canvas.width,height:canvas.height,pixel:canvas.getContext('2d').getImageData(0,0,1,1).data.length})")
    assert pixels["width"]==960 and pixels["height"]==310 and pixels["pixel"]==4,(page_name,pixels)
    await child.close()
    assert not errors,(page_name,errors)
    await context.close()
    print("PASS",page_name,": fit/normal, Help, MODE0 ID/QR, KeyLog PNG, pop-up LCD")

async def main():
    handler=functools.partial(Handler,directory=str(ROOT))
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:
        async with async_playwright() as playwright:
            browser=await playwright.chromium.launch(headless=True)
            for name in ("index.html","fx991_fresh_standalone.html"):
                await verify(browser,name,"http://127.0.0.1:"+str(server.server_address[1]))
            await browser.close()
    finally:
        server.shutdown()
if __name__=="__main__":
    asyncio.run(main())
