#!/usr/bin/env python3
"""REA-014: keypad-only insert/overwrite, structural cursor and lossless DEL tests.

Verifies the independent web implementation, NOT CASIO firmware equivalence.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]

async def run():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1020,"height":1140})
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object'")
                async def press(*keys):
                    for key in keys:
                        selector='#keys button[data-key="'+key+'"]'
                        assert await page.locator(selector).count()==1,(build,key)
                        await page.locator(selector).click()
                async def state():return await page.evaluate("FreshCalculator.getState()")
                async def tree():return await page.evaluate("FreshCalculator.getStructured()")
                async def clean():
                    await press("AC")
                    assert (await state())["insert"] is True
                # Root-level plain-text editing in insert, overwrite and DEL modes.
                await clean()
                await press("1","2","3","LEFT","LEFT")
                s=await state()
                assert (s["input"],s["cursor"])==("123",1),s
                await press("SHIFT","DEL")
                assert (await state())["insert"] is False
                await press("9")
                s=await state()
                assert s["input"]=="193" and s["cursor"]==2,s
                await press("SHIFT","DEL","8")
                s=await state()
                assert s["input"]=="1983" and s["cursor"]==3,s
                await press("DEL")
                s=await state()
                assert s["input"]=="193" and s["cursor"]==2,s

                # Fraction fields: switching UP/DOWN must preserve sibling input.
                await clean()
                await press("FRAC","1","2","DOWN","3","4","UP")
                t=await tree()
                assert len(t["root"])==1 and t["root"][0]["type"]=="fraction",t
                assert "".join(n["value"] for n in t["root"][0]["parts"]["numerator"])=="12",t
                assert "".join(n["value"] for n in t["root"][0]["parts"]["denominator"])=="34",t
                await press("DOWN","LEFT","LEFT","SHIFT","DEL","8")
                t=await tree()
                assert "".join(n["value"] for n in t["root"][0]["parts"]["denominator"])=="84",t
                assert "".join(n["value"] for n in t["root"][0]["parts"]["numerator"])=="12",t
                await press("RIGHT","RIGHT")
                assert (await tree())["path"]==[],await tree()
                # LEFT from the right boundary must enter the last template slot.
                await press("LEFT")
                t=await tree()
                assert t["path"] and t["path"][-1]["field"]=="denominator",t
                # Backspace on a filled formula boundary must enter, not erase,
                # an entire nested subtree silently.
                await press("RIGHT","DEL")
                t=await tree()
                assert t["root"][0]["type"]=="fraction",t

                # Overwrite cannot replace a whole square-root template.
                await clean()
                await press("1","SQRT","9","RIGHT","2")
                t=await tree()
                assert [n["type"] for n in t["root"]]==["char","squareRoot","char"],t
                await press("LEFT","LEFT")
                assert (await tree())["path"][-1]["field"]=="radicand"
                await press("LEFT","SHIFT","DEL","7")
                t=await tree()
                assert [n["type"] for n in t["root"]]==["char","squareRoot","char"],t
                assert t["root"][1]["parts"]["radicand"][0]["value"]=="7",t

                # Empty template can be cancelled without corrupting neighbors.
                await clean()
                await press("5","FRAC","DEL")
                s=await state()
                assert s["input"]=="5",s
                assert len((await tree())["root"])==1,await tree()

                # Function prompt editing honors insert/overwrite and caret.
                await clean()
                await press("MODE","3","1","2","3","LEFT","LEFT","SHIFT","DEL","9")
                s=await state()
                assert s["screen"]=="prompt" and s["flow"]["buffer"]=="193",s
                await press("SHIFT","DEL","8")
                s=await state()
                assert s["flow"]["buffer"]=="1983",s

                assert not errors,(build,errors)
                print(build+": root, numerator/denominator, root, prompt, DEL and SHIFT+DEL PASS")
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(run())
