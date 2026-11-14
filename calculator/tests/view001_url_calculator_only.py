#!/usr/bin/env python3
"""VIEW-001 URL-only calculator presentation, on both publications."""
import asyncio
import functools
import http.server
import pathlib
import threading
from playwright.async_api import async_playwright

ROOT=pathlib.Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

async def inspect(browser,base,name,width,height):
    context=await browser.new_context(viewport={"width":width,"height":height})
    page=await context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    await page.goto(base+"/calculator/"+name+"?key=calculator")
    await page.locator(".key-unit button").first.wait_for()
    result=await page.evaluate("""() => {
      const $=s=>document.querySelector(s);
      const hidden=s=>getComputedStyle($(s)).display==='none';
      const rect=$('#face').getBoundingClientRect();
      return {active:document.body.classList.contains('calculator-only'),
        earlyActive:document.documentElement.classList.contains('calculator-only'),
        bootstrap:document.documentElement.dataset.calculatorView,
        companionsHidden:hidden('.companion'),
        actionsHidden:hidden('.face-actions'),
        diagnosticsHidden:hidden('.diagnostic-tools'),
        face:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},
        totalButtons:document.querySelectorAll('.key-unit button').length,
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth,
        verticalOverflow:document.documentElement.scrollHeight>window.innerHeight};
    }""")
    assert result["active"] and result["earlyActive"] and result["bootstrap"]=="only" and all(result[k] for k in ("companionsHidden","actionsHidden","diagnosticsHidden")),result
    assert result["totalButtons"]==50,result
    assert result["face"]["w"]<=width and result["face"]["h"]<=height,result
    assert abs(result["face"]["x"]-(width-result["face"]["w"])/2)<2,result
    assert abs(result["face"]["y"]-(height-result["face"]["h"])/2)<3,result
    assert not result["horizontalOverflow"] and not result["verticalOverflow"],result
    await page.evaluate("""() => ['2','ADD','3','EQUAL'].forEach(k=>window.FreshCalculator.press(k))""")
    state=await page.evaluate("() => window.FreshCalculator.getState()")
    assert state["ans"]==5 and state["screen"]=="result",state
    assert not errors,errors
    await page.goto(base+"/calculator/"+name)
    assert not await page.evaluate("() => document.body.classList.contains('calculator-only') || document.documentElement.classList.contains('calculator-only')")
    assert await page.locator(".companion").is_visible()
    assert await page.locator(".face-actions").is_visible()
    await context.close()
    print("PASS",name,width,height,"calculator-only and normal modes; 2+3=5")

async def main():
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(headless=True)
            base="http://127.0.0.1:"+str(server.server_address[1])
            for name in ("index.html","fx991_fresh_standalone.html"):
                for w,h in ((1440,900),(390,844),(320,600)):
                    await inspect(browser,base,name,w,h)
            await browser.close()
    finally:
        server.shutdown()
if __name__=="__main__":
    asyncio.run(main())
