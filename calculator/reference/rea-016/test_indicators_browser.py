#!/usr/bin/env python3
"""REA-016 CASIO-style LCD indicator state transitions in both HTML builds.

Manufacturer documentation grounds flag meaning, not exact LCD pixels.
"""
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
IDS=("shift","alpha","memory","pending","mode","angle","format","math","replay","disp")
REPORT=Path("/tmp/rea016-indicators-report.json")

async def run():
    records=[]
    async with async_playwright() as pw:
        browser=await pw.chromium.launch()
        try:
            for build in ("index.html","fx991_fresh_standalone.html"):
                page=await browser.new_page(viewport={"width":1000,"height":1200})
                errors=[]
                page.on("pageerror",lambda error:errors.append(str(error)))
                await page.goto((ROOT/build).resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator==='object' && typeof FreshIndicators==='object'")
                async def press(*keys):
                    for key in keys:
                        el=page.locator('#keys button[data-key="'+key+'"]')
                        assert await el.count()==1,(build,key)
                        await el.click()
                async def check(name,**expected):
                    flags=await page.evaluate("""() => {
                      const names=['shift','alpha','memory','pending','mode','angle','format','math','replay','disp'];
                      return Object.fromEntries(names.map(n=>[n,document.getElementById('lcd-'+n)?.textContent]));
                    }""")
                    assert all(v is not None for v in flags.values()),(build,flags)
                    for key,value in expected.items():
                        assert flags[key]==value,(build,name,key,flags[key],value)
                    records.append({"build":build,"scenario":name,"flags":flags})
                    return flags
                await check("initial",shift="",alpha="",memory="",pending="",mode="",
                            angle="D",format="",math="Math",replay="",disp="")
                await press("SHIFT")
                await check("shift",shift="S",alpha="")
                await press("ALPHA")
                await check("alpha",shift="",alpha="A")
                await press("AC")
                await check("modifier cleared",shift="",alpha="")
                await press("3","EQUAL","MPLUS")
                await check("independent memory",memory="M",replay="▲")
                await press("RCL")
                await check("recall standby",pending="RCL")
                await press("AC")
                await check("recall cancel",pending="",memory="M")
                await press("SHIFT","RCL")
                await check("store standby",pending="STO")
                await press("AC")
                await check("store cancel",pending="")
                await press("SHIFT","MODE","4")
                await check("radians",angle="R")
                await press("SHIFT","MODE","5")
                await check("grads",angle="G")
                await press("SHIFT","MODE","3")
                await check("degrees",angle="D")
                await press("SHIFT","MODE","6","2")
                await check("fixed",format="FIX")
                await press("SHIFT","MODE","7","2")
                await check("scientific",format="SCI")
                await press("SHIFT","MODE","8","1")
                await check("norm",format="")
                await press("SHIFT","MODE","2")
                await check("linear IO",math="")
                await press("SHIFT","MODE","1","1")
                await check("natural IO",math="Math")
                await press("AC","MODE","3")
                await check("statistics mode",mode="STAT",math="")
                await press("AC","MODE","2")
                await check("complex mode",mode="CMPLX",math="Math")
                await press("AC","MODE","6")
                await check("matrix mode",mode="MAT",math="")
                await press("AC","MODE","RIGHT","2")
                await check("vector mode",mode="VCT",math="")
                await press("AC","MODE","1")
                await check("COMP mode",mode="",math="Math")
                await press("SHIFT","9","1")
                await check("memory clear",memory="")
                # Paged MODE menu should expose ▼ on page 1, ▲ on last page.
                await press("MODE")
                await check("menu first page",replay="▼")
                await press("RIGHT")
                await check("menu second page",replay="▲")
                await press("AC")
                await press("SHIFT","AC")
                off=await check("power off",shift="",alpha="",memory="",pending="",mode="",
                                angle="",format="",math="",replay="",disp="")
                await press("ON")
                await check("power restored",angle="D",math="Math")
                # Pure state coverage for flow output, history and intermediate Disp.
                sample=await page.evaluate("""() => {
                  const f=FreshIndicators.derive;
                  const base={power:true,mode:'COMP',angle:'DEG',math:true,format:'Norm1',
                    shift:false,alpha:false,memory:{M:0},history:[],storedInputs:[],
                    menuEntries:[],menuPage:0,outputPage:0,outputLines:[],screen:'edit'};
                  return {
                    flow:f({...base,screen:'flow-result',outputLines:['a','b','c','d','e'],outputPage:0}).replay,
                    flowLast:f({...base,screen:'flow-result',outputLines:['a','b','c','d'],outputPage:1}).replay,
                    history:f({...base,history:[{source:'1'},{source:'2'}],storedInputs:[0]}).replay,
                    interim:f({...base,screen:'intermediate'}).disp,
                    dead:f({...base,power:false,shift:true,alpha:true,memory:{M:5}})
                  };
                }""")
                assert sample["flow"]=="▼",sample
                assert sample["flowLast"]=="▲",sample
                assert sample["history"]=="▲",sample
                assert sample["interim"]=="Disp",sample
                assert all(v=="" for v in sample["dead"].values()),sample
                assert not errors,(build,errors)
                print(build+": 24 display-state checkpoints and synthetic continuation modes PASS")
                await page.close()
        finally:
            await browser.close()
    REPORT.write_text(json.dumps({"schema":"rea016-web-indicators-v1","hardware_verified":False,
       "reference":"CASIO user guides for indicators only; no native LCD captures",
       "checkpoints":records},indent=2)+"\n",encoding="utf8")
    print("REA-016:",len(records),"captured indicator states")

if __name__=="__main__":
    asyncio.run(run())
