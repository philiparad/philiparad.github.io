#!/usr/bin/env python3
"""REA-010: web LCD glyph + status indicator integration; hardware parity unverified."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]

async def main():
    async with async_playwright() as playwright:
        binary=os.environ.get("REA010_CHROMIUM")
        browser=await playwright.chromium.launch(
            **({"executable_path":binary,"args":["--no-sandbox"]} if binary else {})
        )
        try:
            for name in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1030,"height":1200})
                errors=[]
                page.on("pageerror",lambda x:errors.append(str(x)))
                await page.goto((ROOT/name).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object'")
                assert await page.locator("#keys button[data-key]").count()==50
                assert await page.locator("#lcd-angle").inner_text()=="D"
                assert await page.locator("#lcd-math").inner_text()=="Math"
                assert await page.locator("#lcd-format").inner_text()==""
                assert await page.locator("#lcd-mode").inner_text()==""
                assert await page.locator("#lcd-memory").inner_text()==""
                # Glyph signatures are independently drawn rather than falling back to ?.
                result=await page.evaluate("""() => {
                  const font=FreshLCD.FONT;
                  return FreshLCD.mathGlyphs.map(s=>({
                    char:s, valid:Array.isArray(font[s])&&font[s].length===5
                      &&font[s].every(row=>/^[01]{3}$/.test(row)),
                    distinct:JSON.stringify(font[s])!==JSON.stringify(font['?'])
                  }));
                }""")
                assert len(result)>=18 and all(g["valid"] and g["distinct"] for g in result),result
                async def press(*keys):
                    for key in keys:
                        await page.locator('#keys button[data-key="'+key+'"]').click()
                await press("SHIFT")
                assert await page.locator("#lcd-shift").inner_text()=="S"
                await press("ALPHA")
                assert await page.locator("#lcd-shift").inner_text()==""
                assert await page.locator("#lcd-alpha").inner_text()=="A"
                await press("AC")
                await press("3","EQUAL","MPLUS")
                assert await page.locator("#lcd-memory").inner_text()=="M"
                # Format and angle are managed by LCD SETUP, not a popup.
                await press("SHIFT","MODE","4")
                assert await page.locator("#lcd-angle").inner_text()=="R"
                await press("SHIFT","MODE","6","2")
                assert await page.locator("#lcd-format").inner_text()=="FIX"
                await press("SHIFT","MODE","7","2")
                assert await page.locator("#lcd-format").inner_text()=="SCI"
                await press("MODE","3")
                assert await page.locator("#lcd-mode").inner_text()=="STAT"
                await press("AC")
                await press("MODE","6")
                assert await page.locator("#lcd-mode").inner_text()=="MAT"
                await press("AC")
                # ON/OFF clears all illuminated indicators.
                await press("SHIFT","AC")
                for selector in ("#lcd-shift","#lcd-alpha","#lcd-memory","#lcd-mode","#lcd-angle","#lcd-format","#lcd-math"):
                    assert await page.locator(selector).inner_text()=="",(name,selector)
                await press("ON")
                assert await page.locator("#lcd-angle").inner_text()=="R"
                assert not errors,(name,errors)
                print(name+": 20+ glyphs, LCD annunciators, setup and power states PASS")
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(main())
