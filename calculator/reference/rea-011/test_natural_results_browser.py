#!/usr/bin/env python3
"""REA-011: physical-button tests for natural results in both calculator builds."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as pw:
        binary=os.environ.get("REA011_CHROMIUM")
        browser=await pw.chromium.launch(**({"executable_path":binary,"args":["--no-sandbox"]} if binary else {}))
        try:
            for page_name in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1024,"height":1200})
                errors=[]
                page.on("pageerror",lambda err:errors.append(str(err)))
                await page.goto((ROOT/page_name).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object' && typeof FreshResults==='object'")
                async def press(*keys):
                    for key in keys:
                        await page.locator('#keys button[data-key="'+key+'"]').click()
                async def check(keys,kind,text,expected):
                    await press("AC",*keys)
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["screen"]=="result",(page_name,keys,state["screen"],state["error"],state["input"])
                    assert abs(state["ans"]-expected)<1e-9,(page_name,keys,state["ans"],expected)
                    assert state["resultPresentation"]["chosen"]["kind"]==kind,(page_name,keys,state["resultPresentation"])
                    assert state["result"]==text,(page_name,keys,state["result"],text)
                await check(["2","FRAC","3","EQUAL"],"fraction","2/3",2/3)
                await press("SD")
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["decimal"] and state["resultPresentation"]["chosen"]["kind"]=="decimal",state
                await press("SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["result"]=="2/3"
                await check(["3","FRAC","2","EQUAL"],"fraction","3/2",1.5)
                await press("SHIFT","SD")
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["result"]=="1 1/2" and state["resultPresentation"]["chosen"]["kind"]=="mixed",state
                await press("SHIFT","SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["result"]=="3/2"
                await check(["SQRT","2","RIGHT","EQUAL"],"surd","√2",2**0.5)
                await press("SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["resultPresentation"]["chosen"]["kind"]=="decimal"
                await check(["SHIFT","EXP","DIV","6","EQUAL"],"pi","1/6π",3.141592653589793/6)
                await press("SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["resultPresentation"]["chosen"]["kind"]=="decimal"
                await check(["1","DIV","2","EQUAL"],"fraction","1/2",0.5)
                await press("ENG")
                st=await page.evaluate("FreshCalculator.getState()")
                assert st["resultPresentation"]["chosen"]["kind"]=="engineering",st
                assert st["result"].endswith("×10^-3"),st["result"]
                await check(["2","ADD","3","EQUAL"],"decimal","5",5)
                await press("SHIFT","MODE","RIGHT","2","3")
                await check(["1","DIV","4","EQUAL"],"decimal","0.25",.25)
                st=await page.evaluate("FreshCalculator.getState()")
                assert st["format"]=="Fix"
                # On LINE output, S⇔D still converts between decimal and fraction.
                await press("SHIFT","MODE","RIGHT","1")
                await press("SHIFT","MODE","5")
                await check(["1","DIV","5","EQUAL"],"decimal","0.2",.2)
                await press("SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["result"]=="1/5"
                await press("SD")
                assert (await page.evaluate("FreshCalculator.getState()"))["result"]=="0.2"
                assert not errors,(page_name,errors)
                print(page_name+": fraction, decimal, mixed, pi, sqrt, ENG, FIX, S-D PASS")
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(main())
