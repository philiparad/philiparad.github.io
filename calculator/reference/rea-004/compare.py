#!/usr/bin/env python3
"""REA-004: compare REAL CASIO reference sequences with independently captured web states.

No manufacturer firmware/artwork is redistributed. Web traces never count as CASIO
reference evidence. Missing real captures are BLOCKED, not passing fixtures.
"""
import argparse
import json
from pathlib import Path
import sys

def normalize(value):
    return None if value is None else str(value).strip()

def validate_reference(case, root):
    cap = case.get("capture") or {}
    keys = case.get("keys") or []
    frames = cap.get("observed_states")
    if not all(cap.get(name) for name in ("source_device", "capture_date")):
        return "source_device or capture_date missing"
    if not isinstance(frames, list) or len(frames) != len(keys) + 1:
        return "initial and per-key native LCD frames absent"
    if cap.get("observed_result") is None and cap.get("observed_error") is None:
        return "native observed result/error absent"
    for index, frame in enumerate(frames):
        if frame.get("step") != index or (index > 0 and frame.get("key") != keys[index-1]):
            return f"native step {index} key sequence inconsistent"
        rel = frame.get("screenshot")
        if frame.get("lcd_text") is None or not isinstance(rel, str):
            return f"native step {index} has missing text/screenshot"
        path = (root / rel).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():
            return f"native step {index} PNG missing/unsafe"
        if path.read_bytes()[:8] != b"\\x89PNG\\r\\n\\x1a\\n":
            return f"native step {index} not a PNG"
    return None

def validate_web(case, keys, root):
    if not case:
        return "web capture missing"
    if case.get("capture_status") != "CAPTURED":
        return "web capture not completed: " + str(case.get("capture_status", "unknown"))
    frames = case.get("states")
    if case.get("keys") != keys or not isinstance(frames, list) or len(frames) != len(keys) + 1:
        return "web key sequence or number of LCD states differs"
    if case.get("source") != "web-app":
        return "web trace must identify itself as web-app"
    for index, frame in enumerate(frames):
        if frame.get("step") != index or (index > 0 and frame.get("key") != keys[index-1]):
            return f"web step {index} key mismatch"
        rel = frame.get("screenshot")
        if frame.get("lcd_text") is None or not isinstance(rel, str):
            return f"web step {index} text/screenshot missing"
        path = (root / rel).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():
            return f"web step {index} PNG missing/unsafe"
        if path.read_bytes()[:8] != b"\\x89PNG\\r\\n\\x1a\\n":
            return f"web step {index} not a PNG"
    return None

def compare(reference, web, reference_dir, web_dir, pixels=False, threshold=0):
    try:
        from PIL import Image, ImageChops
    except ImportError:
        Image = ImageChops = None
    observed = {x["id"]: x for x in web.get("cases", [])}
    results = []
    totals = {"PASS":0, "FAIL":0, "BLOCKED_REFERENCE":0,
              "BLOCKED_WEB":0, "BLOCKED_PIXEL_ALIGNMENT":0}
    for case in reference["cases"]:
        key = case["id"]
        result = {"id":key, "name":case.get("name"), "status":"BLOCKED_REFERENCE",
                  "mismatches":[], "frame_comparisons":[]}
        reason = validate_reference(case, reference_dir)
        if reason:
            result["reason"] = reason
            results.append(result)
            totals[result["status"]]+=1
            continue
        got = observed.get(key)
        reason = validate_web(got, case["keys"], web_dir)
        if reason:
            result["status"]="BLOCKED_WEB"
            result["reason"]=reason
            results.append(result)
            totals[result["status"]]+=1
            continue
        cap = case["capture"]
        if normalize(cap.get("observed_result")) != normalize(got.get("result")):
            result["mismatches"].append({"field":"result","expected":cap.get("observed_result"),"actual":got.get("result")})
        if normalize(cap.get("observed_error")) != normalize(got.get("error")):
            result["mismatches"].append({"field":"error","expected":cap.get("observed_error"),"actual":got.get("error")})
        for index, (ref_frame, web_frame) in enumerate(zip(cap["observed_states"],got["states"])):
            if normalize(ref_frame["lcd_text"]) != normalize(web_frame["lcd_text"]):
                result["mismatches"].append({"step":index,"field":"lcd_text",
                    "expected":ref_frame["lcd_text"],"actual":web_frame["lcd_text"]})
            comparison={"step":index,"key":ref_frame.get("key")}
            if not pixels:
                comparison["pixel_status"]="SKIPPED_NOT_REQUESTED"
            elif Image is None:
                comparison["pixel_status"]="BLOCKED_PILLOW_MISSING"
            else:
                ref_file=reference_dir/ref_frame["screenshot"]
                web_file=web_dir/web_frame["screenshot"]
                with Image.open(ref_file) as a, Image.open(web_file) as b:
                    if a.size != b.size:
                        comparison.update(pixel_status="BLOCKED_DIMENSIONS",
                                          reference_size=list(a.size),web_size=list(b.size))
                    else:
                        aa=a.convert("RGBA");bb=b.convert("RGBA")
                        pa=aa.tobytes();pb=bb.tobytes()
                        n=sum(1 for pos in range(0,len(pa),4) if max(abs(pa[pos+j]-pb[pos+j]) for j in range(3))>threshold)
                        comparison.update(pixel_status="MEASURED",different_pixels=n,
                                          pixels=a.size[0]*a.size[1],
                                          fraction_different=n/(a.size[0]*a.size[1]))
                        if n:
                            result["mismatches"].append({"step":index,"field":"pixel_difference",
                                "different_pixels":n, "total_pixels":comparison["pixels"]})
            result["frame_comparisons"].append(comparison)
        blocked = pixels and any(x["pixel_status"].startswith("BLOCKED") for x in result["frame_comparisons"])
        result["status"]="FAIL" if result["mismatches"] else "BLOCKED_PIXEL_ALIGNMENT" if blocked else "PASS"
        totals[result["status"]]+=1
        results.append(result)
    return {"schema":"fx991-rea004-differential-report-v1",
            "target_model":reference.get("target_model"),
            "reference_case_count":len(reference["cases"]),
            "web_case_count":len(web.get("cases",[])),
            "pixel_comparison_requested":pixels,
            "pixel_threshold_per_rgb_channel":threshold,
            "totals":totals,"results":results,
            "device_verified_count":sum(totals.get(k,0) for k in ("PASS","FAIL","BLOCKED_PIXEL_ALIGNMENT")),
            "caution":"Only source-observed screenshots count as CASIO reference. A PASS without pixel comparison is semantic-only, not pixel parity."}

def markdown(report):
    rows=["# REA-004 differential report", "",
          "Native CASIO evidence is required for certification. This report does not manufacture it.", "",
          "| Status | Count |","|---|---:|"]
    rows += [f"| {k} | {v} |" for k,v in report["totals"].items()]
    rows += ["", "| Case | Status | Details |","|---|---|---|"]
    for r in report["results"]:
        details = str(r.get("reason") or "; ".join(str(x) for x in r["mismatches"][:3]) or "No detected semantic differences")
        details=details.replace("|","\\|").replace("\n"," ")
        rows.append(f"| {r['id']} | {r['status']} | {details[:230]} |")
    return "\n".join(rows)+"\n"

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--reference",type=Path,default=Path(__file__).resolve().parents[1]/"rea-001"/"manifest.json")
    p.add_argument("--web",type=Path,required=True,help="Web capture manifest from capture_browser.py")
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--pixels",action="store_true",help="Compare unscaled exact same-size PNG pixels; Pillow required")
    p.add_argument("--threshold",type=int,default=0)
    p.add_argument("--require-verified",action="store_true",help="Fail until 100+ real-device cases pass all requested comparisons")
    args=p.parse_args(argv)
    if not 0<=args.threshold<=255:p.error("threshold must be 0..255")
    ref=json.loads(args.reference.read_text(encoding="utf8"))
    web=json.loads(args.web.read_text(encoding="utf8"))
    if ref.get("schema")!="casio-reference-corpus-v1":p.error("unexpected reference schema")
    if web.get("schema")!="fx991-rea004-web-capture-v1":p.error("unexpected web schema")
    out=compare(ref,web,args.reference.parent,args.web.parent,args.pixels,args.threshold)
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/"report.json").write_text(json.dumps(out,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    (args.out/"report.md").write_text(markdown(out),encoding="utf8")
    print("REA-004: "+str(out["totals"]))
    if args.require_verified and (out["totals"]["PASS"]<100 or any(out["totals"][k] for k in ("FAIL","BLOCKED_PIXEL_ALIGNMENT"))):
        print("NOT CERTIFIED: fewer than 100 reference-backed passes or unresolved mismatches",file=sys.stderr)
        return 1
    return 0

if __name__=="__main__":
    raise SystemExit(main())
