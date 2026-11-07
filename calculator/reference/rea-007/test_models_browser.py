#!/usr/bin/env python3
"""REA-007 model-profile acceptance checks in Chromium.

Tests web menu filtering and model selection only, NOT CASIO hardware parity.
Python Playwright is a development dependency, not an application dependency.
"""
import asyncio
from pathlib import Path
import os
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
PLUS_MODES=["COMP","CMPLX","STAT","BASE-N","EQN","MATRIX","TABLE","VECTOR"]
C_MODES=PLUS_MODES+["INEQ","VERIF","DIST"]
SCENARIOS=[
    ("fx-991es",PLUS_MODES),
    ("fx-991es-plus",PLUS_MODES),
    ("fx-991es-plus-c",C_MODES),
]

async def run():
    async with async_playwright() as playwright:
        executable=os.environ.get("REA007_CHROMIUM")
        browser=await playwright.chromium.launch(
            **({"executable_path":executable, "args":["--no-sandbox"]} if executable else {})
        )
        try:
            for file in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1000,"height":1100})
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                await page.goto((ROOT/file).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator !== 'undefined'")
                profiles=await page.evaluate("Object.keys(FreshCalculator.modelProfiles)")
                assert profiles==[x[0] for x in SCENARIOS],profiles
                assert await page.locator("dialog").count()==0
                for identifier,modes in SCENARIOS:
                    await page.locator("#model-selector").select_option(identifier)
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert (state["model"],state["mode"],state["screen"])==(identifier,"COMP","edit"),state
                    await page.locator('#keys button[data-key="MODE"]').click()
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["menuPage"]==0 and state["screen"]=="menu",state
                    assert len(state["menuEntries"])==len(modes),state["menuEntries"]
                    for i,mode in enumerate(modes):
                        assert mode in state["menuEntries"][i],(identifier,mode,state["menuEntries"][i])
                    await page.locator('#keys button[data-key="RIGHT"]').click()
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["menuPage"]==1,state
                    assert len(state["menu"])==len(modes)-6,state
                    if len(modes)==8:
                        assert not any(any(x in str(z) for x in ("INEQ","VERIF","DIST")) for z in state["menu"]),state
                        await page.locator('#keys button[data-key="3"]').click()
                        assert (await page.evaluate("FreshCalculator.getState()"))["screen"]=="menu"
                    await page.locator('#keys button[data-key="AC"]').click()
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["screen"]=="edit"
                    # The web calculator's independent arithmetic remains key-driven.
                    await page.locator('#keys button[data-key="2"]').click()
                    await page.locator('#keys button[data-key="ADD"]').click()
                    await page.locator('#keys button[data-key="3"]').click()
                    await page.locator('#keys button[data-key="EQUAL"]').click()
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["screen"]=="result" and state["ans"]==5,state
                # Re-enter the extra C-only INEQ mode through page 2.
                await page.locator("#model-selector").select_option("fx-991es-plus-c")
                await page.locator('#keys button[data-key="MODE"]').click()
                await page.locator('#keys button[data-key="RIGHT"]').click()
                await page.locator('#keys button[data-key="3"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["mode"]=="INEQ" and state["screen"]=="prompt",state
                # Changing the emulated physical model clears unsupported mode.
                await page.locator("#model-selector").select_option("fx-991es")
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["mode"]=="COMP" and state["screen"]=="edit",state
                assert not errors,(file,errors)
                print(file+": 3 models, 8/8/11 modes, MODE filtering, key arithmetic, model reset PASS")
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(run())
