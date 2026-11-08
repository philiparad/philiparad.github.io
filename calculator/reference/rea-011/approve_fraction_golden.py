#!/usr/bin/env python3
"""REA-011 one-time, narrowly scoped approval of fraction-result web golden.

Only the already reviewed fraction_result canvas may change. Every other
golden frame and every semantic state must be identical to the committed base.
No CASIO native/hardware data is altered, inferred or certified.
"""
import asyncio
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import zlib

HERE=Path(__file__).resolve().parent
CALCULATOR=HERE.parents[1]
GOLDEN=CALCULATOR/"reference"/"rea-006"/"web-golden.json"
MODULE=CALCULATOR/"reference"/"rea-006"/"lcd_golden.py"

def load_module():
    spec=importlib.util.spec_from_file_location("rea006_lcd",MODULE)
    m=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

def approve():
    original=json.loads(GOLDEN.read_text(encoding="utf8"))
    module=load_module()
    with tempfile.TemporaryDirectory(prefix="rea011-approved-golden-") as temp:
        output=Path(temp)
        asyncio.run(module.capture(output))
        proposal=json.loads(module.golden_from_capture(output).read_text(encoding="utf8"))
    if original.get("schema")!=proposal.get("schema") or original.get("canvas_px")!=[768,248]:
        raise RuntimeError("Unexpected source golden schema or raster")
    current={c["id"]:c for c in original["cases"]}
    suggested={c["id"]:c for c in proposal["cases"]}
    if set(current)!=set(suggested) or len(current)!=13:
        raise RuntimeError("Golden frame inventory changed; cannot auto-approve")
    changes=[]
    for id,previous in current.items():
        proposed=suggested[id]
        if previous["state"]!=proposed["state"] or previous["keys"]!=proposed["keys"]:
            raise RuntimeError("Semantic state or key sequence changed in "+id)
        if previous!=proposed:
            changes.append(id)
    if changes!=["fraction_result"]:
        raise RuntimeError("Only fraction_result may differ: "+repr(changes))
    before=current["fraction_result"]
    after=suggested["fraction_result"]
    if before["state"]["result"]!="1/3" or after["state"]["result"]!="1/3":
        raise RuntimeError("Incorrect fraction_result semantic value")
    raw=zlib.decompress(bytes.fromhex(after["rgb_zlib_hex"]))
    if len(raw)!=768*248*3 or hashlib.sha256(raw).hexdigest()!=after["rgb_sha256"]:
        raise RuntimeError("Proposed fraction RGB pixels are invalid")
    before.update({"rgb_sha256":after["rgb_sha256"],
                   "rgb_zlib_hex":after["rgb_zlib_hex"]})
    GOLDEN.write_text(json.dumps(original,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    print("REA-011: approved precisely one web-only LCD golden: fraction_result")
    print("All 12 other cases, key sequences and semantic state entries untouched")

if __name__=="__main__":
    approve()
