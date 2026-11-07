#!/usr/bin/env python3
"""REA-008: fail-closed capability provenance and marketing-claims validator.

Source regression tests and web-only golden frames NEVER establish CASIO
hardware equivalence. The native evidence corpus in REA-001 is authoritative.
"""
import argparse
import json
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST=ROOT/"reference"/"rea-008"/"capabilities.json"
DEFAULT_REFERENCE=ROOT/"reference"/"rea-001"/"manifest.json"
DEFAULT_SOURCES=[ROOT/"index.html",ROOT/"README.md",ROOT/"js"/"app.js"]
STATUSES={"implemented","approximation","unsupported","hardware-verified"}
MODELS={"fx-991es","fx-991es-plus","fx-991es-plus-c"}

# Limit this to unqualified positive assertions; do NOT reject documented
# cautionary statements saying that equivalence is unknown/unverified.
UNSAFE_CLAIMS=[
    re.compile(r"\b(?:100\s*%|fully|completely|perfectly)\s+(?:CASIO\s+)?(?:compatible|equivalent|identical|accurate)\b",re.I),
    re.compile(r"\b(?:pixel[- ]perfect|exact\s+replica|firmware[- ]accurate)\b",re.I),
    re.compile(r"\b(?:all|every)\s+(?:physical|native|CASIO)\s+(?:key|feature|function)s?\s+(?:are|is)\s+(?:verified|working|matched)\b",re.I)
]
NEGATION=re.compile(r"\b(?:not|never|without|unverified|unknown|no|cannot|isn't|aren't)\b",re.I)

def genuine_reference_ids(data,root):
    valid=set()
    for case in data.get("cases",[]):
        cap=case.get("capture") or {}
        keys=case.get("keys") or []
        states=cap.get("observed_states")
        if (not cap.get("source_device") or not cap.get("capture_date") or
                not isinstance(states,list) or len(states)!=len(keys)+1 or
                (cap.get("observed_result") is None and cap.get("observed_error") is None)):
            continue
        if any(token in str(cap.get("source_device")).upper()
               for token in ("SYNTHETIC","FIXTURE","WEB-APP","WEB ONLY")):
            continue
        ok=True
        for index,frame in enumerate(states):
            if (frame.get("step")!=index or
                    (index and frame.get("key")!=keys[index-1]) or
                    frame.get("lcd_text") is None):
                ok=False;break
            filename=frame.get("screenshot")
            if not isinstance(filename,str):
                ok=False;break
            image=(root/filename).resolve()
            if (not image.is_relative_to(root.resolve()) or not image.is_file() or
                    image.read_bytes()[:8]!=b"\x89PNG\r\n\x1a\n"):
                ok=False;break
        if ok:
            valid.add(case["id"])
    return valid

def validate(manifest,reference,reference_root,source_texts=None):
    errors=[]
    if manifest.get("schema")!="fx991-rea008-capability-gate-v1":
        errors.append("Unexpected capability schema")
    features=manifest.get("features")
    if not isinstance(features,list) or not features:
        return ["No capability rows defined"]
    refs=genuine_reference_ids(reference,reference_root)
    names=set()
    model_coverage={m:0 for m in MODELS}
    for item in features:
        name=item.get("id")
        if not isinstance(name,str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",name):
            errors.append("Invalid feature id: "+repr(name));continue
        if name in names:
            errors.append("Duplicate capability: "+name)
        names.add(name)
        if not str(item.get("title","")).strip() or not str(item.get("note","")).strip():
            errors.append(name+": missing public feature description / limitation")
        status=item.get("status")
        if status not in STATUSES:
            errors.append(name+": unsupported status "+repr(status))
        models=item.get("models")
        if not isinstance(models,list) or not models or len(models)!=len(set(models)) or set(models)-MODELS:
            errors.append(name+": missing/invalid model IDs")
        else:
            for model in models:model_coverage[model]+=1
        evid=item.get("native_evidence_ids")
        if not isinstance(evid,list) or len(evid)!=len(set(evid)):
            errors.append(name+": native evidence IDs must be a unique list")
            evid=[]
        if bool(item.get("hardware_verified")) != (status=="hardware-verified"):
            errors.append(name+": hardware_verified flag and status disagree")
        unknown=set(evid)-refs
        if unknown:
            errors.append(name+": missing genuine CASIO reference evidence: "+", ".join(sorted(unknown)))
        if status=="hardware-verified" and not evid:
            errors.append(name+": cannot claim hardware verification without native evidence")
        if status=="hardware-verified" and "hardware" not in str(item.get("note","")).lower() and "CASIO" not in str(item.get("note","")):
            errors.append(name+": native claim must explain validation in public note")
    for model,count in model_coverage.items():
        if not count:
            errors.append("No feature coverage for "+model)
    any_native=any(x.get("status")=="hardware-verified" for x in features)
    if manifest.get("policy",{}).get("parity_claims_allowed") is True and not any_native:
        errors.append("Unqualified parity claims allowed without native verification")
    for path,source in (source_texts or {}).items():
        for lineno,line in enumerate(source.splitlines(),1):
            # Positive declarations cannot be made without any hardware-verified
            # feature and should instead be labeled educational approximations.
            for pattern in UNSAFE_CLAIMS:
                if pattern.search(line) and not NEGATION.search(line):
                    if not any_native:
                        errors.append(str(path)+":"+str(lineno)+": unsupported device-parity assertion")
    return errors

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest",type=Path,default=DEFAULT_MANIFEST)
    p.add_argument("--reference",type=Path,default=DEFAULT_REFERENCE)
    p.add_argument("--scan",action="append",type=Path)
    p.add_argument("--json-out",type=Path)
    args=p.parse_args()
    manifest=json.loads(args.manifest.read_text(encoding="utf8"))
    ref=json.loads(args.reference.read_text(encoding="utf8"))
    sources={path:path.read_text(encoding="utf8") for path in (args.scan or DEFAULT_SOURCES)}
    issues=validate(manifest,ref,args.reference.parent,sources)
    stats={status:sum(item.get("status")==status for item in manifest.get("features",[]))
           for status in sorted(STATUSES)}
    report={"schema":"fx991-rea008-acceptance-report-v1",
            "task":"REA-008","passed":not issues,"feature_count":len(manifest.get("features",[])),
            "counts":stats,"genuine_reference_count":len(genuine_reference_ids(ref,args.reference.parent)),
            "issues":issues}
    if args.json_out:
        args.json_out.parent.mkdir(parents=True,exist_ok=True)
        args.json_out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("REA-008 acceptance gate:",report["counts"],
          "genuine native references:",report["genuine_reference_count"])
    for issue in issues:print("ERROR:",issue,file=sys.stderr)
    print("PASS: public capability status supported by evidence" if not issues
          else "FAIL: device parity claim or manifest status not justified")
    return int(bool(issues))

if __name__=="__main__":
    raise SystemExit(main())
