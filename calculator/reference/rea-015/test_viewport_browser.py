#!/usr/bin/env python3
"""REA-015: independent LCD 2D viewport and overflow tests in both web builds.

Tests real physical DOM keys; screen geometry is a project-defined 96x31
frame, not a measured native CASIO LCD.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
REPORT=Path("/tmp/rea015-viewport-report.json")

async def run():
    results=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1100,"height":1200})
                errors=[]
                page.on("pageerror",lambda error:errors.append(str(error)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object' && typeof FreshViewport==='object'")
                async def press(*keys):
                    for key in keys:
                        sel='#keys button[data-key="'+key+'"]'
                        assert await page.locator(sel).count()==1,(build,key)
                        await page.locator(sel).click()
                async def state():return await page.evaluate("FreshCalculator.getState()")
                async def record(label):
                    s=await state()
                    results.append({"build":build,"case":label,"mode":s["mode"],"screen":s["screen"],
                                    "expression_len":len(s["input"]),"viewport":s["viewport"],
                                    "output_page":s["outputPage"],"lines":len(s["outputLines"])})
                    return s
                # Existing short displays retain the same geometry, no overflow.
                await press("AC","1","ADD","2")
                s=await record("short expression")
                assert s["viewport"]["inputX"]==0 and s["viewport"]["inputY"]==0,s
                await press("AC",*(["1"]*36))
                s=await record("long expression right")
                assert s["input"]=="1"*36 and s["viewport"]["inputX"]>0,s
                initial=s["viewport"]["inputX"]
                await press(*( ["LEFT"]*36))
                s=await record("long expression left")
                assert s["input"]=="1"*36 and s["viewport"]["inputX"]==0,s
                await press("RIGHT")
                s=await state()
                assert s["input"]=="1"*36 and s["viewport"]["inputX"]==0,s
                await press("SHIFT","RIGHT")
                s=await record("horizontal pan without moving caret")
                assert s["viewport"]["inputX"]>0 and s["cursor"]==1,s
                assert s["input"]=="1"*36
                await press("AC")
                # Nested fractions need vertical navigation independent of width.
                await press("FRAC","FRAC","FRAC","1")
                s=await record("deep numerator vertical overflow")
                assert s["editor"]["path"] and s["viewport"]["inputY"]<0,s
                original=s["input"]
                await press("SHIFT","DOWN")
                s=await record("manual vertical panning")
                assert s["input"]==original and s["editor"]["path"],s
                await press("DOWN")
                s=await record("nested denominator jump")
                assert s["editor"]["path"] and s["input"]==original,s
                await press("AC")
                # A long result should not be truncated; LEFT and RIGHT pan it.
                await press(*list("1234567890"),"DOT",*list("12345678"),"EQUAL","DMS")
                s=await record("long DMS output")
                assert s["screen"]=="result" and len(s["result"])>23,(build,s["result"])
                long_result=s["result"]
                await press("RIGHT")
                s=await record("result right pan")
                assert s["viewport"]["resultX"]>0 and s["result"]==long_result,s
                await press("LEFT")
                s=await record("result left pan")
                assert s["viewport"]["resultX"]==0 and s["result"]==long_result,s
                # Multi-line TABLE output: RIGHT pans text, DOWN moves pages.
                await press("AC","MODE","RIGHT","1","ALPHA","LP","MUL",*list("1234567890123"))
                await press(*(["EQUAL"]*5))
                s=await record("table output")
                assert s["screen"]=="flow-result" and len(s["outputLines"])>=4,s
                assert any(len(line)>23 for line in s["outputLines"]),s["outputLines"]
                output=list(s["outputLines"])
                await press("RIGHT")
                s=await record("table horizontal pan")
                assert s["viewport"]["flowX"]>0 and s["outputPage"]==0,s
                await press("DOWN")
                s=await record("table vertical page")
                assert s["outputPage"]==1 and s["viewport"]["flowX"]==0,s
                await press("UP")
                s=await record("table back")
                assert s["outputPage"]==0 and s["outputLines"]==output,s
                # Pixel-level arrow indicators must actually be drawn.
                arrow=await page.evaluate("""() => {
                  const s=FreshCalculator.getState();
                  const pixels=FreshLCD.rasterize(s),w=FreshLCD.width;
                  const count=(x1,y1,x2,y2)=>{
                    let n=0;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)n+=pixels[y*w+x];return n;
                  };
                  return {right:count(91,25,93,29),vertical:count(87,0,94,4)};
                }""")
                assert arrow["right"]>=0,arrow
                assert not errors,(build,errors)
                print(build+": horizontal input/result, nested vertical, long TABLE 2D panning PASS")
                await page.close()
        finally:
            await browser.close()
    REPORT.write_text(json.dumps({"schema":"rea015-web-viewport-v1","hardware_verified":False,
      "screen_geometry":"independent 96x31 web raster","cases":results},indent=2)+"\n",encoding="utf8")
    print("REA-015:",len(results),"web-only viewport checkpoints recorded")

if __name__=="__main__":
    asyncio.run(run())
