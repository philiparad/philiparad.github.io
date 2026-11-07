#!/usr/bin/env python3
"""REA-008: browser-check public evidence matrix, model filtering and parity labels."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

REPO=Path(__file__).resolve().parents[3]
MANIFEST=Path(__file__).with_name("capabilities.json")

async def main():
    import json
    doc=json.loads(MANIFEST.read_text(encoding="utf-8"))
    handler=partial(SimpleHTTPRequestHandler,directory=str(REPO))
    server=ThreadingHTTPServer(("127.0.0.1",0),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    url="http://127.0.0.1:"+str(server.server_address[1])+"/calculator/"
    try:
        async with async_playwright() as browser_tool:
            browser=await browser_tool.chromium.launch()
            try:
                for filename in ("index.html","fx991_fresh_standalone.html"):
                    page=await browser.new_page(viewport={"width":1080,"height":1100})
                    errors=[]
                    page.on("pageerror",lambda err:errors.append(str(err)))
                    await page.goto(url+filename,wait_until="load")
                    await page.locator("#capability-rows tr").first.wait_for(timeout=15000)
                    for model in ("fx-991es","fx-991es-plus","fx-991es-plus-c"):
                        await page.locator("#model-selector").select_option(model)
                        await page.wait_for_function("(model)=>document.querySelector('#model-label').textContent.includes('fx-991')",arg=model)
                        expected=[f for f in doc["features"] if model in f["models"]]
                        rows=page.locator("#capability-rows tr")
                        assert await rows.count()==len(expected),(filename,model,await rows.count(),len(expected))
                        statuses=await rows.evaluate_all("(items)=>items.map(item=>item.dataset.status)")
                        assert statuses==[f["status"] for f in expected]
                        assert "0 hardware-verified" in await page.locator("#capability-summary").inner_text()
                        assert not any(s=="hardware-verified" for s in statuses)
                    assert not errors,(filename,errors)
                    print(filename+": 3 models and public capability statuses PASS")
                    await page.close()
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
