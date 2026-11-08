#!/usr/bin/env python3
"""REA-018: CASIO emulator PC keyboard mappings and web accessibility guards.

Reference: CASIO fx-ES PLUS Emulator Subscription User's Guide, EN-2.
This verifies keyboard-to-physical-key routing, not native DLL key codes.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
REPORT=Path("/tmp/rea018-keyboard-audit.json")
KEYS={"F1":["SHIFT"],"F2":["ALPHA"],"F3":["MODE"],"F4":["ON"],"Home":["MODE"],
      "Enter":["EQUAL"],"Backspace":["DEL"],"Delete":["DEL"],"ArrowDown":["DOWN"],
      "ArrowUp":["UP"],"ArrowRight":["RIGHT"],"ArrowLeft":["LEFT"],
      "^":["POWER"],"(":["LP"],")":["RP"],"+":["ADD"],"-":["SUB"],
      "*":["MUL"],"/":["DIV"],".":["DOT"],"=":["EQUAL"]}
async def main():
    checkpoints=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1060,"height":1150})
                errors=[]
                page.on("pageerror",lambda error:errors.append(str(error)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshKeyboard==='object'&&typeof FreshCalculator==='object'")
                async def focus():
                    await page.locator("#face").focus()
                async def press(*keys):
                    await focus()
                    for key in keys:
                        await page.keyboard.press(key)
                async def st():return await page.evaluate("FreshCalculator.getState()")
                async def track(name):
                    s=await st()
                    checkpoints.append({"build":build,"check":name,"screen":s["screen"],
                       "input":s["input"],"shift":s["shift"],"alpha":s["alpha"],
                       "power":s["power"],"mode":s["mode"]})
                    return s
                # Exhaustive guide-derived single-key resolver with face focus.
                check=await page.evaluate("""items=>{
                    const face=document.getElementById('face');
                    return Object.fromEntries(Object.keys(items).map(k=>{
                       const e={key:k,target:face,shiftKey:k==='^'||k==='+'};
                       const result=FreshKeyboard.translate(e,{screen:'edit'});
                       return [k,result?.keys||null];
                    }));
                }""",KEYS)
                assert check==KEYS,(build,"guide-key mapping",check)
                for n in "0123456789":
                    output=await page.evaluate("""key=>FreshKeyboard.translate({
                        key,target:document.getElementById('face')},{screen:'edit'}).keys""",n)
                    assert output==[n],(build,n,output)
                # All guided keys run through actual document keydown handling.
                await press("2","+","3","Enter")
                s=await track("2+3 Enter")
                assert s["screen"]=="result" and s["ans"]==5,s
                await press("Escape")
                s=await track("Escape clears")
                assert s["input"]=="",s
                await press("1","2","3","Backspace")
                assert (await st())["input"]=="12"
                await press("Delete")
                assert (await st())["input"]=="1"
                await press("F1")
                s=await track("F1 SHIFT")
                assert s["shift"] and not s["alpha"],s
                await press("F2")
                s=await track("F2 ALPHA")
                assert s["alpha"] and not s["shift"],s
                await page.locator('#keys button[data-key="NEG"]').click()
                assert (await st())["input"].endswith("A"),await st()
                await press("F3")
                s=await track("F3 MODE")
                assert s["screen"]=="menu",s
                await press("Escape","Home")
                assert (await st())["screen"]=="menu"
                await press("Escape")
                await press("F1","Tab")
                s=await track("F1 Tab power off")
                assert not s["power"] and (await page.evaluate("document.activeElement.id"))=="face",s
                await press("F4")
                assert (await st())["power"],await st()
                # TAB is only AC when *face* has focus. Browser navigation elsewhere
                # must remain available, including ordinary Shift+Tab.
                await press("4","5","Tab")
                s=await track("Tab AC when face focused")
                assert s["input"]=="",s
                await page.locator("#model-selector").focus()
                await page.keyboard.press("F3")
                assert (await st())["screen"]=="edit","F3 modified while select focused"
                await page.keyboard.press("Tab")
                assert await page.evaluate("document.activeElement.id")!="model-selector"
                # Space on face = AC; Space on an actual key should activate it.
                await press("6"," ")
                assert (await st())["input"]==""
                await page.locator('#keys button[data-key="7"]').focus()
                await page.keyboard.press("Space")
                assert (await st())["input"]=="7",await st()
                await press("Escape","F3","3")
                assert (await st())["screen"]=="prompt",await st()
                await press("x",",","2")
                s=await track("prompt text including comma")
                assert s["flow"]["buffer"]=="x,2",s
                await press("Escape")
                # Comma is a calculator argument separator rather than keyboard
                # modifier toggling; pending SHIFT state must not be cancelled.
                await press("1",",","2")
                assert (await st())["input"]=="1,2",await st()
                # Browser copy or text-selection shortcuts are not overridden.
                sample=await page.evaluate("""()=>{
                    const calc=document.getElementById('face');
                    const outside=document.getElementById('model-selector');
                    const e=(key,target,opts={})=>Object.assign({key,target},opts);
                    return {
                      copy:FreshKeyboard.translate(e('c',calc,{ctrlKey:true}),{}),
                      copyInsert:FreshKeyboard.translate(e('Insert',calc,{ctrlKey:true}),{}),
                      browserCopy:FreshKeyboard.translate(e('c',outside,{ctrlKey:true}),{}),
                      alt:FreshKeyboard.translate(e('F3',calc,{altKey:true}),{}),
                      composition:FreshKeyboard.translate(e('1',calc,{isComposing:true}),{}),
                      numpad:FreshKeyboard.translate(e('NumpadEnter',calc),{}),
                      spaceButton:FreshKeyboard.translate(e(' ',document.querySelector('[data-key="7"]')),{})
                    };
                }""")
                assert sample["copy"]["action"]=="capture" and sample["copyInsert"]["action"]=="capture",sample
                assert sample["browserCopy"] is None and sample["alt"] is None and sample["composition"] is None,sample
                assert sample["numpad"]["keys"]==["EQUAL"] and sample["spaceButton"] is None,sample
                assert not errors,(build,errors)
                print(build+": 27 official PC keys, browser focus, F1–F4, operators, prompts and clipboard routing PASS")
                await page.close()
        finally:
            await browser.close()
    REPORT.write_text(json.dumps({"schema":"rea018-keyboard-audit-v1",
      "source":"CASIO fx-ES PLUS Emulator Subscription User's Guide EN-2",
      "hardware_verified":False,"runs":checkpoints},indent=2)+"\n",encoding="utf8")
    print("REA-018:",len(checkpoints),"stateful keyboard audit records")

if __name__=="__main__":
    asyncio.run(main())
