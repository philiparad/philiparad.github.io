#!/usr/bin/env python3
"""REA-106 browser smoke: live modular/standalone STAT numerical stability.

Runs actual Chromium module code (not real-device or LCD evidence).
python3 calculator/tests/rea106_browser_stat_stability.py
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=("index.html","fx991_fresh_standalone.html")
MODELS=("fx-991es","fx-991es-plus","fx-991es-plus-c")

async def exercise(browser,url,file,model):
    page=await browser.new_page(viewport={"width":1100,"height":1100})
    errors=[]
    page.on("pageerror",lambda error:errors.append(str(error)))
    try:
        await page.goto(f"{url}{file}?model={model}",wait_until="load")
        await page.locator("#keys button[data-key='EQUAL']").wait_for()
        await page.locator("#model-selector").wait_for()
        assert await page.locator("#model-selector").input_value()==model
        # Enter real STAT mode using the displayed calculator keypad.
        for key in ("MODE","3","1"):
            await page.locator(f"#keys button[data-key='{key}']").click()
        state=await page.evaluate("window.FreshCalculator.getState()")
        assert state["mode"]=="STAT",(file,model,state["mode"])
        result=await page.evaluate("""() => {
          const R=window.FreshStatRegression;
          const P=window.FreshStatParameters;
          const table={paired:false,frequency:false,regressionType:'1VAR',
            rows:[{X:1e50,Y:null,FREQ:1},{X:-1e50,Y:null,FREQ:1}]};
          const s=R.summary(table);
          let error=null;
          try {P.resolve('StatSumX2',table,R)} catch(e){error=e.message}
          return {mean:s.meanX,sd:s.sdX,sample:s.sampleSDX,
            varLines:R.varLines(s,false),oversizedSumError:error};
        }""")
        assert result["mean"]==0
        assert result["sd"]==1e50
        assert abs(result["sample"]/(2**0.5*1e50)-1)<1e-12
        assert result["oversizedSumError"]=="Math ERROR"
        assert any("Sigma X" in line for line in result["varLines"])
        assert not errors,(file,model,errors)
        return result
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
                for model in MODELS:
                    modular=await exercise(browser,base,FILES[0],model)
                    standalone=await exercise(browser,base,FILES[1],model)
                    assert modular==standalone,(model,modular,standalone)
                    print(model,"REA-106 browser STAT source parity: PASS")
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=="__main__":
    asyncio.run(main())
