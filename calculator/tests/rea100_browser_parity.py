#!/usr/bin/env python3
"""REA-100 modular/standalone browser comparison (web behavior, not CASIO parity)."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
MODELS=("fx-991es","fx-991es-plus","fx-991es-plus-c")
FILES=("index.html","fx991_fresh_standalone.html")
# Click exactly the same displayed calculator keys, not hidden app APIs.
CASES=(
    (("2","ADD","3","MUL","4","EQUAL"),"14"),
    (("8","DIV","2","MUL","LP","2","ADD","2","RP","EQUAL"),"16"),
    (("5","MUL","6","EQUAL"),"30"),
)

async def run_case(browser,url,model,filename,keys,want):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(f"{url}{filename}?model={model}",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await page.locator("#model-selector").wait_for()
        assert await page.locator("#model-selector").input_value()==model
        for key in keys:
            await page.locator(f"#keys button[data-key='{key}']").click()
        actual=(await page.locator("#answer-text").inner_text()).strip()
        assert actual==want,(model,filename,keys,actual,want)
        assert not errors,(model,filename,errors)
        modes=await page.evaluate("() => window.FreshModels.get(document.querySelector('#model-selector').value).modes")
        capabilities=await page.locator("#capability-rows tr").count()
        return actual,tuple(modes),capabilities
    finally:
        await page.close()

async def main():
    handler=partial(SimpleHTTPRequestHandler,directory=str(ROOT))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    url=f"http://127.0.0.1:{server.server_address[1]}/calculator/"
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch()
            try:
                for model in MODELS:
                    for keys,want in CASES:
                        modular=await run_case(browser,url,model,FILES[0],keys,want)
                        standalone=await run_case(browser,url,model,FILES[1],keys,want)
                        assert modular==standalone,(model,keys,modular,standalone)
                        print(model,want,"modular == standalone: PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
