#!/usr/bin/env python3
"""REA-006: deterministic LCD pixel snapshots with immutable golden checksums.

Records independent WEB calculator screenshots only. No synthetic screenshot
may be presented as an observed CASIO emulator/hardware reference.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
CASES=(
    ("edit_empty", ()),
    ("edit_with_cursor", ("1","ADD","2","LEFT")),
    ("result", ("1","ADD","2","EQUAL")),
    ("error", ("EQUAL",)),
    ("mode_menu", ("MODE",)),
    ("mode_menu_next", ("MODE","RIGHT")),
    ("stat_prompt", ("MODE","3")),
    ("stat_result", ("MODE","3","EQUAL")),
    ("fraction_result", ("1","DIV","3","EQUAL")),
    ("fraction_conversion", ("1","DIV","3","EQUAL","SD")),
    ("shift_annunciator", ("SHIFT",)),
    ("alpha_annunciator", ("ALPHA",)),
    ("history_recall", ("2","ADD","3","EQUAL","UP")),
)
CANVAS_SIZE=(768,248)
GOLDEN=HERE/"web-golden.json"

async def capture(out,chromium=None):
    from playwright.async_api import async_playwright
    out.mkdir(parents=True,exist_ok=True)
    cases=[]
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(headless=True,
            **({"executable_path":chromium} if chromium else {}),
            args=["--no-sandbox"] if chromium else [])
        page=await browser.new_page(viewport={"width":980,"height":1000},device_scale_factor=1)
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        try:
            for name,keys in CASES:
                await page.goto((ROOT/"index.html").resolve().as_uri(),wait_until="load")
                await page.wait_for_function("typeof FreshCalculator !== 'undefined' && document.querySelector('#lcd')",timeout=10000)
                for key in keys:
                    matches=page.locator('#keys button[data-key="'+key+'"]')
                    if await matches.count()!=1:
                        raise RuntimeError(f"{name}: absent/duplicate physical key {key}")
                    await matches.click(timeout=5000)
                frame=page.locator("#lcd")
                dimensions=await frame.evaluate("(el)=>[el.width,el.height]")
                if tuple(dimensions)!=CANVAS_SIZE:
                    raise RuntimeError(f"{name}: unexpected canvas size {dimensions}")
                target=out/(name+".png")
                await frame.screenshot(path=str(target))
                actual=target.read_bytes()
                state=await page.evaluate("""() => {
                    const s=FreshCalculator.getState();
                    const el=document.getElementById('lcd');
                    return {screen:s.screen,mode:s.mode,angle:s.angle,
                        input:s.input,result:s.result,error:s.error,
                        modifier:{shift:s.shift,alpha:s.alpha},
                        menuPage:s.menuPage,outputPage:s.outputPage,
                        lcdLabel:el.getAttribute('aria-label'),
                        annunciators:['lcd-shift','lcd-alpha','lcd-angle','lcd-math'].map(id=>document.getElementById(id)?.textContent)};
                }""")
                cases.append({"id":name,"keys":list(keys),"png":target.name,
                              "png_sha256":hashlib.sha256(actual).hexdigest(),
                              "state":state})
        finally:
            await browser.close()
    if errors:
        raise RuntimeError("Javascript errors: "+repr(errors[:10]))
    document={"schema":"rea006-web-lcd-frames-v1","status":"WEB_CALCULATOR_ONLY_NOT_HARDWARE_GOLDEN",
              "canvas_px":list(CANVAS_SIZE),"cases":cases,
              "rendering":"Chromium, DPR=1, canvas-only PNG (HTML annunciators stored separately)"}
    (out/"captured.json").write_text(json.dumps(document,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    return document

def compare(out,golden,threshold=0):
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow required for pixel comparison (pip install Pillow)") from exc
    observed=json.loads((out/"captured.json").read_text(encoding="utf8"))
    expected=json.loads(golden.read_text(encoding="utf8"))
    if observed["schema"]!="rea006-web-lcd-frames-v1" or expected["schema"]!="rea006-web-golden-v1":
        raise ValueError("unexpected schema")
    if observed["canvas_px"]!=expected["canvas_px"]:
        raise ValueError("canvas dimensions changed")
    base={x["id"]:x for x in expected["cases"]}
    current={x["id"]:x for x in observed["cases"]}
    if set(base)!=set(current):
        raise ValueError(f"scenario IDs differ: missing {sorted(set(base)-set(current))}; new {sorted(set(current)-set(base))}")
    reports=[]
    for name in base:
        exp=base[name]
        actual=current[name]
        issues=[]
        if exp["keys"]!=actual["keys"]:
            issues.append("key_sequence_changed")
        if exp["state"]!=actual["state"]:
            issues.append("semantic_state_changed")
        frame=out/actual["png"]
        if frame.read_bytes()[:8]!=b"\x89PNG\r\n\x1a\n":
            raise ValueError(name+": invalid PNG")
        with Image.open(frame) as image:
            image=image.convert("RGB")
            if image.size!=tuple(observed["canvas_px"]):
                raise ValueError(name+": screenshot dimensions differ")
            # Goldens store exact per-pixel RGB bytes as zlib compressed/hex
            # alongside SHA256. Pixel data are committed to the repo as
            # independently captured golden evidence, never regenerated at test time.
            import zlib
            gold=zlib.decompress(bytes.fromhex(exp["rgb_zlib_hex"]))
            candidate=image.tobytes()
            if len(gold)!=len(candidate):
                raise ValueError(name+": incompatible RGB golden length")
            n=0; error_sum=0; diff=bytearray(len(candidate))
            for offset in range(0,len(candidate),3):
                d=max(abs(candidate[offset+j]-gold[offset+j]) for j in range(3))
                if d>threshold:
                    n+=1
                error_sum+=d
                for j in range(3):
                    diff[offset+j]=255 if j==0 and d>threshold else min(255,abs(candidate[offset+j]-gold[offset+j])*6)
            if n:
                Image.frombytes("RGB",image.size,bytes(diff)).save(out/(name+".diff.png"))
                issues.append("pixel_mismatch")
            total=image.size[0]*image.size[1]
            reports.append({"id":name,"pass":not issues,"issues":issues,"pixels_changed":n,
                            "total_pixels":total,"mismatch_ratio":n/total,
                            "mean_max_channel_error":error_sum/total,
                            "golden_rgb_sha256":exp["rgb_sha256"],
                            "actual_rgb_sha256":hashlib.sha256(candidate).hexdigest()})
    summary={"schema":"rea006-visual-regression-report-v1",
             "golden_source":"independent web calculator; NOT CASIO hardware",
             "tolerance_max_channel":threshold,
             "passed":sum(x["pass"] for x in reports),
             "failed":sum(not x["pass"] for x in reports),
             "scenarios":reports}
    (out/"comparison.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf8")
    lines=["# REA-006 LCD regression results","","Golden screenshots originate from this independent web implementation, not real CASIO firmware.","","| Scenario | Result | Changed pixels | Mismatch |","|---|---|---:|---:|"]
    for row in reports:
        lines.append(f"| {row['id']} | {'PASS' if row['pass'] else 'FAIL'} | {row['pixels_changed']} | {row['mismatch_ratio']:.4%} |")
    (out/"comparison.md").write_text("\n".join(lines)+"\n",encoding="utf8")
    return summary

def golden_from_capture(out):
    """Emit a baseline CANDIDATE for human approval; never silently overwrite."""
    from PIL import Image
    import zlib
    data=json.loads((out/"captured.json").read_text(encoding="utf8"))
    cases=[]
    for item in data["cases"]:
        with Image.open(out/item["png"]) as im:
            rgb=im.convert("RGB").tobytes()
        cases.append({"id":item["id"],"keys":item["keys"],"state":item["state"],
                      "rgb_sha256":hashlib.sha256(rgb).hexdigest(),
                      "rgb_zlib_hex":zlib.compress(rgb,9).hex()})
    result={"schema":"rea006-web-golden-v1",
            "status":"WEB_BASELINE_CANDIDATE_NOT_NATIVE_CASIO_EVIDENCE",
            "canvas_px":data["canvas_px"],"cases":cases}
    candidate=out/"web-golden.candidate.json"
    candidate.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    return candidate

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--golden",type=Path,default=GOLDEN)
    p.add_argument("--capture-only",action="store_true",help="Create candidate baselines for review; do not compare")
    p.add_argument("--chromium",help="Optional explicit Chromium executable path")
    p.add_argument("--threshold",type=int,default=0)
    args=p.parse_args()
    if not 0<=args.threshold<=255:p.error("threshold must be 0..255")
    try:
        asyncio.run(capture(args.out,args.chromium))
        if args.capture_only:
            print("Baseline candidate:",golden_from_capture(args.out))
            return 0
        result=compare(args.out,args.golden,args.threshold)
        print(f"REA-006 web pixel goldens: {result['passed']} PASS, {result['failed']} FAIL; not native CASIO evidence")
        return 1 if result["failed"] else 0
    except (RuntimeError,ValueError,FileNotFoundError) as exc:
        print("REA-006 failed:",exc,file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
