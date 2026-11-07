#!/usr/bin/env python3
"""REA-009: browser-driven structured expression editor tests.

Physical calculator key buttons and LCD are used for every calculation.
No React, Node.js, or test-only expression evaluator is needed.
"""
import asyncio
from pathlib import Path
import os
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
CASES=[
    ("fraction_auto",["2","FRAC","3","EQUAL"],2/3,"fraction"),
    ("fraction_explicit",["FRAC","1","DOWN","2","RIGHT","EQUAL"],.5,"fraction"),
    ("power",["2","POWER","3","RIGHT","EQUAL"],8,"power"),
    ("square_root",["SQRT","9","RIGHT","EQUAL"],3,"squareRoot"),
    ("cube_root",["SHIFT","SQRT","8","RIGHT","EQUAL"],2,"cubeRoot"),
    ("nth_root",["SHIFT","POWER","3","RIGHT","8","RIGHT","EQUAL"],2,"nthRoot"),
    ("mixed_number",["SHIFT","FRAC","1","RIGHT","1","RIGHT","2","RIGHT","EQUAL"],1.5,"mixed"),
    ("nested_sqrt",["FRAC","1","DOWN","SQRT","4","RIGHT","RIGHT","EQUAL"],0.5,"fraction"),
    ("ordinary",["2","ADD","3","MUL","4","EQUAL"],14,None),
]

async def run():
    async with async_playwright() as playwright:
        binary=os.environ.get("REA009_CHROMIUM")
        browser=await playwright.chromium.launch(
            **({"executable_path":binary,"args":["--no-sandbox"]} if binary else {})
        )
        try:
            for file in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1030,"height":1250})
                problems=[]
                page.on("pageerror",lambda e:problems.append(str(e)))
                await page.goto((ROOT/file).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator === 'object'")
                assert await page.locator("#keys button[data-key]").count()==50
                for name,keys,expected,kind in CASES:
                    await page.locator('#keys button[data-key="AC"]').click()
                    # Begin with default mode and a clean tree.
                    assert (await page.evaluate("FreshCalculator.getState()"))["mode"]=="COMP"
                    for key in keys:
                        await page.locator('#keys button[data-key="'+key+'"]').click()
                    state=await page.evaluate("FreshCalculator.getState()")
                    assert state["screen"]=="result",(file,name,state["screen"],state["error"],state["input"])
                    assert abs(state["ans"]-expected)<1e-9,(file,name,state["ans"],expected)
                    if kind:
                        tree=await page.evaluate("FreshCalculator.getStructured()")
                        assert any(n["type"]==kind for n in tree["root"]),(file,name,tree)
                    print(file,name,"PASS")
                # Incomplete mathematical template must error, never evaluate '?'.
                await page.locator('#keys button[data-key="AC"]').click()
                await page.locator('#keys button[data-key="FRAC"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert not state["input"]=="/" and "?" in state["input"],state
                await page.locator('#keys button[data-key="EQUAL"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["screen"]=="error",state
                # Empty placeholder DEL must remove its associated template.
                await page.locator('#keys button[data-key="AC"]').click()
                await page.locator('#keys button[data-key="FRAC"]').click()
                await page.locator('#keys button[data-key="DEL"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["input"]=="" and not state["editor"]["root"],state
                # Confirm that root-level cursor movement edits at the right position.
                await page.locator('#keys button[data-key="1"]').click()
                await page.locator('#keys button[data-key="3"]').click()
                await page.locator('#keys button[data-key="LEFT"]').click()
                await page.locator('#keys button[data-key="2"]').click()
                await page.locator('#keys button[data-key="EQUAL"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["ans"]==123,state
                # MODE LCD menu still operates normally.
                await page.locator('#keys button[data-key="MODE"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["screen"]=="menu" and len(state["menu"])==6,state
                assert not problems,(file,problems)
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(run())
