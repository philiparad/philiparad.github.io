#!/usr/bin/env python3
"""REA-017: deterministic browser audit of screenshot-space case and key geometry.

The 274x580 source is a screenshot crop, NOT a CASIO DLL geometry observation.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
REFERENCE=json.loads((HERE.parent/"rea-003"/"key-map.json").read_text(encoding="utf8"))
SPEC=json.loads((HERE/"geometry.json").read_text(encoding="utf8"))
OUTPUT=Path("/tmp/rea017-geometry-report.json")
TOL=SPEC["tolerances"]["key_center_px_at_reference"]

async def audit():
    cases=[]
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1300,"height":1100})
                errors=[]
                page.on("pageerror",lambda e:errors.append(str(e)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshKeypad==='object' && typeof FreshCalculator==='object'")
                for width in (274,334,220):
                    observed=await page.evaluate("""width=>{
                       const face=document.querySelector('.face');
                       face.style.width=width+'px';
                       face.style.maxWidth='none';
                       const f=face.getBoundingClientRect();
                       const r=el=>{
                         const b=el.getBoundingClientRect();
                         return {x:(b.left-f.left)/f.width*274,y:(b.top-f.top)/f.height*580,
                           w:b.width/f.width*274,h:b.height/f.height*580};
                       };
                       return {body:{w:f.width,h:f.height},
                         bezel:r(document.querySelector('.lcd-frame')),
                         solar:r(document.querySelector('.solar-recess')),
                         brand:r(document.querySelector('.brand')),
                         keys:Object.fromEntries([...document.querySelectorAll('#keys .key-unit')].map(el=>
                           [el.querySelector('button').dataset.key,r(el)])),
                         badTopLegends:[...document.querySelectorAll('.key-unit.top .alpha-label')]
                            .map(x=>x.textContent),
                         color:{
                           shell:getComputedStyle(face).backgroundImage,
                           sci:getComputedStyle(document.querySelector('.key-unit.scientific button')).backgroundImage,
                           numeric:getComputedStyle(document.querySelector('.key-unit.numeric button')).backgroundImage,
                           del:getComputedStyle(document.querySelector('[data-key="DEL"]')).backgroundImage,
                           solar:getComputedStyle(document.querySelector('.solar-cells')).backgroundImage},
                         sourceCount:FreshKeypad.keys.length};
                     }""",width)
                    assert observed["sourceCount"]==50,(build,width,observed["sourceCount"])
                    assert len(observed["keys"])==50,(build,width)
                    assert not observed["badTopLegends"],(build,width,observed["badTopLegends"])
                    assert abs(observed["body"]["h"]/observed["body"]["w"]-580/274)<SPEC["tolerances"]["face_aspect_ratio_fraction"]*580/274,observed["body"]
                    worst=0
                    for key in REFERENCE["keys"]:
                        item=observed["keys"][key["physical_id"]]
                        for attr,expected in [("x",key["center_x"]-key["width"]/2),
                                             ("y",key["center_y"]-key["height"]/2),
                                             ("w",key["width"]),("h",key["height"])]:
                            delta=abs(item[attr]-expected)
                            worst=max(worst,delta)
                            assert delta<TOL,(build,width,key["physical_id"],attr,delta,expected,item[attr])
                    bezel=observed["bezel"]
                    for attr,expected in [("x",20.99),("y",79.982),("w",231.01),("h",102.022)]:
                        assert abs(bezel[attr]-expected)<SPEC["tolerances"]["landmark_px_at_reference"],(build,width,"bezel",attr,bezel[attr])
                    solar=observed["solar"]
                    for attr,expected in [("x",141.11),("y",26.97),("w",100.01),("h",39.15)]:
                        assert abs(solar[attr]-expected)<SPEC["tolerances"]["landmark_px_at_reference"],(build,width,"solar",attr,solar[attr])
                    for kind,css in observed["color"].items():
                        assert "gradient" in css,(build,width,kind,css)
                    cases.append({"build":build,"width_px":width,"key_count":50,"max_error_in_reference_px":round(worst,3)})
                for model,legend,edition in [
                    ("fx-991es","fx-991ES",""),
                    ("fx-991es-plus","fx-991ES PLUS","2nd edition"),
                    ("fx-991es-plus-c","fx-991ES PLUS C","2nd edition")]:
                    await page.locator("#model-selector").select_option(model)
                    assert await page.locator(".case-model-id").inner_text()==legend
                    assert await page.locator(".edition-mark").inner_text()==edition
                await page.locator('#keys button[data-key="2"]').click()
                await page.locator('#keys button[data-key="ADD"]').click()
                await page.locator('#keys button[data-key="3"]').click()
                await page.locator('#keys button[data-key="EQUAL"]').click()
                state=await page.evaluate("FreshCalculator.getState()")
                assert state["ans"]==5 and state["screen"]=="result",state
                assert not errors,(build,errors)
                print(build+": geometry 50/50 at 274, 334, 220 CSS px; face labels and keys PASS")
                await page.close()
        finally:
            await browser.close()
    OUTPUT.write_text(json.dumps({"schema":"rea017-screenshot-geometry-v1","native_verified":False,
         "source":"274x580 photographed body crop, REA-003 key map",
         "cases":cases},indent=2)+"\n",encoding="utf8")

if __name__=="__main__":
    asyncio.run(audit())
