#!/usr/bin/env python3
"""REA-003: check screenshot geometry against the independent 50-key web map.

Runs with the Python standard library; no React/Node/browser is required.
Does not establish native CASIO firmware scan codes or certify physical hardware.
"""
import ast
import hashlib
import json
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MAP = HERE / "key-map.json"
SOURCE = ROOT / "js" / "keypad.js"
STANDALONE = ROOT / "fx991_fresh_standalone.html"
errors = []

def source_array(text, name):
    match = re.search(r"(?:\bconst\s+|,)"+re.escape(name)+r"\s*=\s*\[",text)
    if not match:
        raise ValueError("Cannot locate JS array "+name)
    pos=match.end()-1
    start=pos
    depth=0
    quoted=False
    while pos<len(text):
        ch=text[pos]
        if ch=="'":
            quoted=not quoted
        if not quoted:
            if ch=="[":
                depth+=1
            elif ch=="]":
                depth-=1
                if depth==0:
                    return ast.literal_eval(text[start:pos+1].replace("null","None"))
        pos+=1
    raise ValueError("Unterminated JS array "+name)

data=json.loads(MAP.read_text(encoding="utf8"))
source=SOURCE.read_text(encoding="utf8")
standalone=STANDALONE.read_text(encoding="utf8")
keys=data["keys"]
if data.get("task_id")!="REA-003":
    errors.append("incorrect task ID")
if len(keys)!=50 or len({k["physical_id"] for k in keys})!=50:
    errors.append("must contain 50 distinct physical key IDs")
sha=hashlib.sha1(("blob "+str(len(source.encode("utf8")))+"\0").encode("ascii")+source.encode("utf8")).hexdigest()
if data.get("source_sha")!=sha:
    errors.append("keypad.js Git blob SHA differs from mapping source SHA")
try:
    top=source_array(source,"topSpec")
    scientific=source_array(source,"scienceSpec")
    numeric=source_array(source,"numericSpec")
    tc=source_array(source,"topCenters")
    sc=source_array(source,"scienceCols")
    sr=source_array(source,"scienceRows")
    nc=source_array(source,"numCols")
    nr=source_array(source,"numRows")
except ValueError as exc:
    errors.append(str(exc))
    top=scientific=numeric=tc=sc=sr=nc=nr=[]

expected={}
if len(top)==8 and len(scientific)==24 and len(numeric)==20:
    for i,item in enumerate(top):
        w,h=(30,20) if i in (2,5) else (20,28) if i in (3,4) else (22,22)
        expected[item[0]]=(i,tc[i][0],tc[i][1],w,h,item)
    for i,item in enumerate(scientific):
        if item is not None:
            expected[item[0]]=(i,sc[i%6],sr[i//6],32,20,item)
    for i,item in enumerate(numeric):
        expected[item[0]]=(i,nc[i%5],nr[i//5],39,29 if 5<=i<15 else 28,item)
else:
    errors.append("source keypad dimensions changed")

if len(expected)!=50:
    errors.append("source code does not expose exactly 50 keys")
if standalone.count("['RECIP','x⁻¹','x!','']")!=1 or     "null,['RECIP','x⁻¹','x!',''],['LOGBASE','log□','Σ','']" not in standalone:
    errors.append("standalone layout does not match corrected top scientific row")

for k in keys:
    name=k["physical_id"]
    if name not in expected:
        errors.append(name+": missing from source")
        continue
    slot,x,y,w,h,legends=expected[name]
    if k["grid_index"]!=slot:
        errors.append(name+": grid slot changed")
    for label,key in [(legends[1],"base_legend"),(legends[2],"shift_legend")]:
        if k[key]!=label:
            errors.append(name+": "+key+" mismatch")
    if k["alpha_legend"]!=("" if legends[3]=="dpad" else legends[3]):
        errors.append(name+": alpha legend mismatch")
    for key,value in [("center_x",x),("center_y",y),("width",w),("height",h)]:
        if abs(float(k[key])-float(value))>1e-7:
            errors.append(name+": "+key+" mismatch")
    if any(not 0<=v<=limit for v,limit in [(x-w/2,274),(x+w/2,274),(y-h/2,580),(y+h/2,580)]):
        errors.append(name+": rectangle extends outside reference face")

for i,a in enumerate(keys):
    for b in keys[i+1:]:
        overlap_x=min(a["center_x"]+a["width"]/2,b["center_x"]+b["width"]/2)-max(a["center_x"]-a["width"]/2,b["center_x"]-b["width"]/2)
        overlap_y=min(a["center_y"]+a["height"]/2,b["center_y"]+b["height"]/2)-max(a["center_y"]-a["height"]/2,b["center_y"]-b["height"]/2)
        if overlap_x>0 and overlap_y>0:
            errors.append("overlapping hit targets: "+a["physical_id"]+" / "+b["physical_id"])

native=sum(k.get("native_scancode") is not None and k.get("native_key_rect") is not None for k in keys)
if data.get("native_keycode_count")!=native:
    errors.append("native_keycode_count inconsistent")
if native<50 and data.get("status")=="VERIFIED":
    errors.append("cannot claim native verification without 50 observed native keycodes and rectangles")

for error in errors:
    print("ERROR:",error,file=sys.stderr)
print(f"REA-003: {len(keys)} keys, {len(expected)} source keys, {native} native code+rectangle matches, {len(errors)} structural issues")
print("Status: "+str(data.get("status")))
if errors:
    sys.exit(1)
