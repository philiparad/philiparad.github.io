#!/usr/bin/env python3
"""REA-004 optional Playwright browser trace capture.

Presses real DOM calculator buttons. Screenshots are WEB outputs, never native
CASIO proof. Does not claim that MODE wizard sequences match the actual device.
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys

DEFAULT_REFERENCE=Path(__file__).resolve().parents[1]/"rea-001"/"manifest.json"
DEFAULT_APP=Path(__file__).resolve().parents[2]/"index.html"

async def capture(args):
    from playwright.async_api import async_playwright
    reference=json.loads(args.reference.read_text(encoding="utf8"))
    choices=set(args.case or [])
    cases=[c for c in reference["cases"] if not choices or c["id"] in choices]
    if choices-{c["id"] for c in cases}:
        raise ValueError("Unknown case IDs: "+", ".join(sorted(choices-{c["id"] for c in cases})))
    if args.limit:
        cases=cases[:args.limit]
    args.out.mkdir(parents=True,exist_ok=True)
    outputs=[]
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(headless=True)
        page=await browser.new_page(viewport={"width":1050,"height":1200},device_scale_factor=1)
        try:
            for case in cases:
                out={"id":case["id"],"name":case["name"],"keys":case["keys"],
                     "setup":case["setup"],"source":"web-app","capture_status":"BLOCKED_SETUP",
                     "states":[],"result":None,"error":None}
                outputs.append(out)
                setup=case["setup"]
                # MODE and setup workflows have not been proven to map to real device
                # from a clean state. Refuse to fake nondefault initial conditions.
                if setup.get("mode")!="COMP" or setup.get("angle")!="DEG" or setup.get("format")!="Norm2":
                    out["reason"]="No verified setup/navigation sequence for non-default mode"
                    continue
                try:
                    if args.url:
                        await page.goto(args.url,wait_until="domcontentloaded",timeout=30000)
                    else:
                        await page.goto(args.app.resolve().as_uri(),wait_until="domcontentloaded",timeout=30000)
                    await page.wait_for_function("typeof FreshCalculator === 'object' && typeof FreshCalculator.getState === 'function'",timeout=15000)
                    folder=args.out/"captures"/case["id"]
                    folder.mkdir(parents=True,exist_ok=True)
                    async def observe(index,key):
                        state=await page.evaluate("""() => {
                            const s=FreshCalculator.getState();
                            const lcd=document.getElementById('lcd');
                            return {screen:s.screen,mode:s.mode,angle:s.angle,input:s.input,
                                result:s.result,error:s.error,ans:s.ans,
                                lcd_accessibility: lcd.getAttribute('aria-label')};
                        }""")
                        filename=f"captures/{case['id']}/step-{index:03d}.png"
                        await page.locator("#lcd").screenshot(path=str(args.out/filename))
                        # Semantic rendering is independent of manufacturer LCD transcriptions.
                        # Keep visible/accessibility text as WEB observation; never as device.
                        return {"step":index,"key":key,"screenshot":filename,
                                "lcd_text":state["lcd_accessibility"],"state":state}
                    out["states"].append(await observe(0,None))
                    for index,key in enumerate(case["keys"],1):
                        button=page.locator('#keys button[data-key]').filter(has=None)
                        match=page.locator('#keys button[data-key="'+key+'"]')
                        if await match.count()!=1:
                            raise ValueError("Key not in UI: "+key)
                        await match.click(timeout=5000)
                        out["states"].append(await observe(index,key))
                    final=await page.evaluate("FreshCalculator.getState()")
                    out["result"]=final.get("result") if final.get("screen")!="error" else None
                    out["error"]=final.get("error") if final.get("screen")=="error" else None
                    out["capture_status"]="CAPTURED"
                except Exception as exc:
                    out["capture_status"]="CAPTURE_ERROR"
                    out["reason"]=str(exc)[:400]
        finally:
            await browser.close()
    result={"schema":"fx991-rea004-web-capture-v1",
            "source":"independent-browser-calculator",
            "reference_manifest":str(args.reference),
            "cases":outputs}
    (args.out/"web-capture.json").write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print("REA-004: captured",sum(x["capture_status"]=="CAPTURED" for x in outputs),"of",len(outputs))
    if any(x["capture_status"]=="CAPTURE_ERROR" for x in outputs):
        return 1
    return 0

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference",type=Path,default=DEFAULT_REFERENCE)
    parser.add_argument("--app",type=Path,default=DEFAULT_APP)
    parser.add_argument("--url",help="Optional live app URL; otherwise use local index.html")
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--case",action="append",help="Reference case ID, repeatable")
    parser.add_argument("--limit",type=int,default=0,help="Limit first N cases, 0 = all")
    args=parser.parse_args()
    try:
        return asyncio.run(capture(args))
    except ImportError:
        print("Python Playwright missing: pip install playwright && python -m playwright install chromium",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
