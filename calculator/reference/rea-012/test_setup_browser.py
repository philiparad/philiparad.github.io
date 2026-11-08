#!/usr/bin/env python3
"""REA-012: physical-key SETUP sequences for original, PLUS, and PLUS C models."""
import asyncio
from pathlib import Path
import os
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
MODELS={
 "fx-991es":(["ab/c","d/c","CMPLX","STAT","Disp","CONT"],6),
 "fx-991es-plus":(["ab/c","d/c","CMPLX","STAT","Disp","CONT"],6),
 "fx-991es-plus-c":(["ab/c","d/c","CMPLX","STAT","TABLE","Rdec","Disp","CONT"],8)
}
FIRST=["MthIO","LineIO","Deg","Rad","Gra","Fix","Sci","Norm"]

async def audit(page,name):
    async def press(*keys):
        for k in keys:
            el=page.locator('#keys button[data-key="'+k+'"]')
            assert await el.count()==1,(name,"key missing",k)
            await el.click()
    async def state():
        return await page.evaluate("FreshCalculator.getState()")
    async def setup(*keys):
        await press("SHIFT","MODE",*keys)
        return await state()
    async def verify(model):
        current=await state()
        assert current["model"]==model,current
        expected, n=MODELS[model]
        st=await setup()
        assert st["screen"]=="menu" and st["menuKind"]=="setup" and st["menuPageSize"]==8,st
        assert [e["label"] for e in st["menu"]]==FIRST,st["menu"]
        assert [str(e["number"]) for e in st["menu"]]==list("12345678"),st["menu"]
        await press("DOWN")
        st=await state()
        assert st["menuPage"]==1 and len(st["menu"])==n,st
        assert [e["label"] for e in st["menu"]]==expected,st["menu"]
        await press("UP","AC")
    async def check(property,expected,*keys):
        st=await setup(*keys)
        assert st[property]==expected,(name,keys,property,st[property],expected)
        assert st["screen"]=="edit",st
    for model in MODELS:
        await page.locator("#model-selector").select_option(model)
        await verify(model)
        # Native menu sequence for first page: 1=MthIO,2=LineIO,3=Deg,4=Rad,5=Gra.
        await check("math",False,"2")
        await check("math",True,"1","2")
        assert (await state())["outputMath"] is False
        await check("math",True,"1","1")
        assert (await state())["outputMath"] is True
        await check("angle","RAD","4")
        await check("angle","GRAD","5")
        await check("angle","DEG","3")
        await check("format","Fix","6","0")
        assert (await state())["digits"]==0
        await check("format","Sci","7","9")
        assert (await state())["digits"]==9
        await check("format","Norm2","8","2")
        await check("format","Norm1","8","1")
        # Fractions & complex display on page 2.
        await check("fractionStyle","mixed","DOWN","1")
        await check("fractionStyle","improper","DOWN","2")
        await check("complexFormat","polar","DOWN","3","2")
        await check("complexFormat","rectangular","DOWN","3","1")
        await check("statFrequency",True,"DOWN","4","1")
        await check("statFrequency",False,"DOWN","4","2")
        if model=="fx-991es-plus-c":
            await check("tableFunctions",1,"DOWN","5","1")
            await check("tableFunctions",2,"DOWN","5","2")
            await check("recurringDecimal",False,"DOWN","6","2")
            await check("recurringDecimal",True,"DOWN","6","1")
            disp="7";contrast="8"
        else:
            disp="5";contrast="6"
        await check("decimalSeparator","comma","DOWN",disp,"2")
        await check("decimalSeparator","dot","DOWN",disp,"1")
        await check("contrast",4,"DOWN",contrast,"4")
        # Settings are active in actual calculation display.
        await check("math",False,"2")
        await press("AC","1","DIV","2","EQUAL")
        st=await state()
        assert st["result"]=="0.5",st
        await check("math",True,"1","1")
        await press("AC","1","DIV","2","EQUAL")
        st=await state()
        assert st["resultPresentation"]["chosen"]["kind"]=="fraction",st
        # Restore manual defaults by the calculator's shifted CLR Setup menu.
        await press("AC","SHIFT","9","2")
        st=await state()
        assert st["format"]=="Norm1" and st["math"] and st["outputMath"],st
        assert not st["statFrequency"] and st["fractionStyle"]=="improper",st
        assert st["recurringDecimal"] and st["decimalSeparator"]=="dot",st
        assert st["contrast"]==5,st
        print(name,model+": two 8-slot pages and all 16 SETUP actions PASS")
    # Persisted FREQ switches STAT entry fields.
    await page.locator("#model-selector").select_option("fx-991es-plus-c")
    await setup("DOWN","4","1")
    await press("MODE","3")
    st=await state()
    assert st["mode"]=="STAT" and st["screen"]=="prompt" and len(st["flow"]["fields"])==2,st
    await press("AC")
    # TABLE choice controls single versus two editable expressions.
    await setup("DOWN","5","1")
    await press("MODE","RIGHT","1")
    st=await state()
    assert st["mode"]=="TABLE" and len(st["flow"]["fields"])==4,st
    await press("AC")
    await setup("DOWN","5","2")
    await press("MODE","RIGHT","1")
    st=await state()
    assert st["mode"]=="TABLE" and len(st["flow"]["fields"])==5,st
    print(name+": FREQ / TABLE mode effects PASS")

async def main():
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(
            **({"executable_path":os.environ["REA012_CHROMIUM"],"args":["--no-sandbox"]}
               if "REA012_CHROMIUM" in os.environ else {}))
        try:
            for name in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1000,"height":1250})
                problems=[]
                page.on("pageerror",lambda error:problems.append(str(error)))
                await page.goto((ROOT/name).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object'")
                await audit(page,name)
                assert not problems,(name,problems)
                await page.close()
        finally:
            await browser.close()

if __name__=="__main__":
    asyncio.run(main())
