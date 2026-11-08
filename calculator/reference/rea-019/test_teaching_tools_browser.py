#!/usr/bin/env python3
"""REA-019: independent view-only KeyLog and LCD capture acceptance tests.

The official CASIO emulator guide informs UI functions, not native bitmap parity.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=Path("/tmp/rea019-teaching-tools-report.json")

async def run():
    observations=[]
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1100,"height":1200},accept_downloads=True)
                problems=[]
                page.on("pageerror",lambda error:problems.append(str(error)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshTeachingTools==='object'&&typeof FreshCalculator==='object'")
                await page.evaluate("""() => {
                   window.__copiedText=null;
                   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
                     writeText:async text=>{window.__copiedText=text;},
                     write:async items=>{window.__copiedItems=items;}
                   }});
                }""")
                async def press(*keys):
                    for key in keys:
                        await page.locator('#keys button[data-key="'+key+'"]').click()
                async def state():
                    return await page.evaluate("FreshCalculator.getState()")
                await page.locator("#keylog-toggle").click()
                assert await page.locator("#keylog-panel").is_visible()
                await page.locator("#record-keylog").click()
                await press("AC","2","ADD","3","EQUAL")
                baseline=await state()
                assert baseline["screen"]=="result" and baseline["ans"]==5,baseline
                assert len(baseline["keylog"])==5,baseline["keylog"]
                await page.locator("#record-keylog").click()
                assert await page.locator(".keylog-entry").count()==5
                # Clicking/selecting entries never calls calculator.press.
                await page.locator(".keylog-entry").nth(1).click()
                await page.locator(".keylog-entry").nth(3).click(modifiers=["Control"])
                selected=await page.locator(".keylog-entry[aria-pressed='true']").all_text_contents()
                assert selected==["2","3"],selected
                await page.locator("#keylog-copy").click()
                copied=await page.evaluate("window.__copiedText")
                assert copied=="2 3",copied
                assert (await state())["ans"]==5 and (await state())["input"]=="2+3"
                await page.locator(".keylog-entry").nth(0).click()
                await page.locator(".keylog-entry").nth(4).click(modifiers=["Shift"])
                assert await page.locator(".keylog-entry[aria-pressed='true']").count()==5
                await page.locator("#keylog-copy").click()
                copied=await page.evaluate("window.__copiedText")
                assert copied=="AC 2 + 3 =",copied
                await page.locator("#keylog-decrease").click()
                assert await page.locator("#keylog-list").evaluate("(el)=>el.style.getPropertyValue('--keylog-size')")=="17px"
                await page.locator("#keylog-increase").click()
                assert await page.locator("#keylog-list").evaluate("(el)=>el.style.getPropertyValue('--keylog-size')")=="19px"
                await page.locator("#keylog-select-all").click()
                assert await page.locator(".keylog-entry[aria-pressed='true']").count()==5
                # No mathematical action is carried out by viewing/copying log.
                s=await state()
                assert s["ans"]==5 and s["screen"]=="result" and s["input"]=="2+3",s
                await page.locator("#capture-options-toggle").click()
                assert await page.locator("#capture-options").is_visible()
                assert await page.locator("#capture-options-toggle").get_attribute("aria-expanded")=="true"
                dims=await page.evaluate("""() => {
                  const source=document.getElementById('lcd'),T=FreshTeachingTools;
                  const raw=T.createImage(source,{zoom:1,frame:false});
                  const framed=T.createImage(source,{zoom:2,frame:true});
                  const large=T.createImage(source,{zoom:6,frame:false});
                  return {raw:[raw.width,raw.height],
                    framed:[framed.width,framed.height],
                    large:[large.width,large.height],
                    config:T.captureConfig({zoom:200,frame:true})};
                }""")
                assert dims["raw"]==[768,248],dims
                assert dims["framed"]==[1560,520],dims
                assert dims["large"]==[4608,1488],dims
                assert dims["config"]=={"zoom":1,"frame":True},dims
                await page.locator("#capture-zoom").select_option("3")
                await page.locator("#capture-frame").uncheck()
                async with page.expect_download() as download:
                    await page.locator("#capture").click()
                artifact=await download.value
                assert artifact.suggested_filename=="independent-calculator-lcd.png",artifact.suggested_filename
                local=await artifact.path()
                assert Path(local).stat().st_size>300
                await page.locator("#copy-lcd").click()
                await page.wait_for_function("Boolean(window.__copiedItems)")
                assert (await state())["ans"]==5
                # Export JSON is a non-executing log export.
                async with page.expect_download() as dl:
                    await page.locator("#export-keylog").click()
                d=await dl.value
                exported=json.loads(Path(await d.path()).read_text())
                assert exported["schema"]=="fresh-calculator-keylog-v2",exported
                assert exported["formattedTrace"]=="AC 2 + 3 =",exported
                assert len(exported["selectedIndices"])==5
                await page.locator("#clear-keylog").click()
                assert await page.locator(".keylog-entry").count()==0
                assert (await state())["ans"]==5
                assert not problems,(build,problems)
                observations.append({"build":build,"logged":5,"selected":5,"clipboard":copied,
                    "capture_dimensions":dims,"capture_bytes":Path(local).stat().st_size})
                print(build+": KeyLog selection/copy/zoom and x1-x6 LCD capture/frame PASS")
                await page.close()
        finally:
            await browser.close()
    OUT.write_text(json.dumps({"task":"REA-019","native_reference_verified":False,
                               "observations":observations},indent=2)+"\n")
    print("REA-019:",len(observations),"calculator builds fully verified")

if __name__=="__main__":
    asyncio.run(run())
