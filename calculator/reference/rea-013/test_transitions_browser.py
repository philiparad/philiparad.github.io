#!/usr/bin/env python3
"""REA-013 key-by-key MODE, SETUP and function-prompt transition regression.

Compares reproducible *web* sequences. Not evidence of native CASIO firmware:
REA-001 remains without real emulator screenshots.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
REPORT=Path("/tmp/rea013-transition-report.json")
MODEL_MODES={
    "fx-991es":8,
    "fx-991es-plus":8,
    "fx-991es-plus-c":11,
}

async def main():
    traces=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1020,"height":1180})
                exceptions=[]
                page.on("pageerror",lambda e:exceptions.append(str(e)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator === 'object'")
                async def press(*keys):
                    for key in keys:
                        button=page.locator('#keys button[data-key="'+key+'"]')
                        assert await button.count()==1,(build,key,"ambiguous physical key")
                        await button.click()
                async def state(label):
                    s=await page.evaluate("FreshCalculator.getState()")
                    relevant={k:s.get(k) for k in ("mode","screen","menuTitle","menuPage","menuPageSize",
                        "menuKind","menu","angle","format","result","outputPage")}
                    if s.get("flow"):
                        relevant["field"]={k:s["flow"].get(k) for k in ("title","index","buffer","cursor","editing","values")}
                    traces.append({"build":build,"checkpoint":label,"state":relevant})
                    return s
                for model, count in MODEL_MODES.items():
                    await page.locator("#model-selector").select_option(model)
                    await press("MODE")
                    s=await state(model+" mode first")
                    assert s["screen"]=="menu" and len(s["menu"])==6
                    assert [x["number"] for x in s["menu"]]==[1,2,3,4,5,6],s["menu"]
                    await press("RIGHT")
                    s=await state(model+" mode second")
                    assert s["menuPage"]==1 and len(s["menu"])==count-6
                    assert [x["number"] for x in s["menu"]]==list(range(1,count-5))
                    await press("LEFT","AC")
                    s=await state(model+" escape menu")
                    assert s["screen"]=="edit"
                    await press("SHIFT","MODE","DOWN")
                    s=await state(model+" setup second")
                    assert s["screen"]=="menu" and s["menuKind"]=="setup"
                    assert s["menuPage"]==1 and len(s["menu"]) in (6,8)
                    assert [str(x["number"]) for x in s["menu"]]==[str(i) for i in range(1,len(s["menu"])+1)]
                    await press("UP","4")
                    s=await state(model+" angle rad")
                    assert s["screen"]=="edit" and s["angle"]=="RAD"
                # Compare a function form workflow independently of the menu page checks.
                await page.locator("#model-selector").select_option("fx-991es-plus-c")
                await press("MODE","3")
                s=await state("stat prompt initial")
                assert s["mode"]=="STAT" and s["screen"]=="prompt" and s["flow"]["index"]==0,s
                assert s["flow"]["editing"] is False and s["flow"]["buffer"]=="1,2,3,4,5",s
                # Typing should replace the tutorial value, not append to it.
                await press("1","2","3")
                s=await state("stat entered 123")
                assert s["flow"]["buffer"]=="123" and s["flow"]["cursor"]==3,s
                await press("LEFT","LEFT","9")
                s=await state("stat insert at cursor")
                assert s["flow"]["buffer"]=="1923" and s["flow"]["cursor"]==2,s
                await press("DEL")
                s=await state("stat deletion")
                assert s["flow"]["buffer"]=="123" and s["flow"]["cursor"]==1,s
                await press("AC")
                s=await state("stat form escaped")
                assert s["screen"]=="edit" and s["flow"] is None,s
                # A two-field FREQ form must preserve the edited field on UP/DOWN.
                await press("SHIFT","MODE","DOWN","4","1","MODE","3")
                s=await state("freq prompt first")
                assert s["screen"]=="prompt" and s["flow"]["index"]==0
                await press("8","DOWN")
                s=await state("freq prompt second")
                assert s["flow"]["index"]==1 and s["flow"]["values"]["data"]=="8",s
                await press("UP")
                s=await state("freq back")
                assert s["flow"]["index"]==0 and s["flow"]["buffer"]=="8",s
                await press("DOWN","AC")
                # Enforce correct second-page SETUP item numbering and nested choices.
                await press("SHIFT","MODE","DOWN","5")
                s=await state("TABLE function count menu")
                assert s["screen"]=="menu" and [x["number"] for x in s["menu"]]==["1","2"],s
                await press("2")
                s=await state("TABLE selected double")
                assert s["screen"]=="edit" and s["tableFunctions"]==2,s
                # Numerical SOLVE should be reachable using the calculator SHIFT key.
                await press("SHIFT","CALC")
                s=await state("SOLVE input prompt")
                assert s["screen"]=="prompt" and s["flow"]["index"]==0,s
                await press("AC")
                assert not exceptions,(build,exceptions)
                print(build+": MODE/SETUP numbering, prompt cursor, UP/DOWN, DEL and AC passed")
                await page.close()
        finally:
            await browser.close()
    report={"schema":"fx991-rea013-web-transitions-v1",
            "hardware_verified":False,
            "reference_source":"independent web app only; no genuine CASIO LCD captures",
            "checkpoints":traces}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
    print("REA-013: recorded",len(traces),"reproducible web-only transitions")

if __name__=="__main__":
    asyncio.run(main())
