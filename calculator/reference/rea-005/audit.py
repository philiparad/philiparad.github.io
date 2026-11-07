#!/usr/bin/env python3
"""REA-005: source-observed 50-key x 3 modifier x 11 mode audit.

Browser UI is exercised using its actual public key callback, from a clean page
for every context. Results are NEVER proof of real CASIO device equivalence.
Requires Python Playwright, Chromium, and Python >=3.10. No Node or React.
"""
import argparse
import asyncio
import collections
import hashlib
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
CALCULATOR = HERE.parents[1]
KEY_MANIFEST = HERE.parents[0] / "rea-003" / "key-map.json"
MODIFIERS = ("normal", "shift", "alpha")
MODES = ("COMP", "CMPLX", "STAT", "BASE-N", "EQN", "MATRIX", "TABLE", "VECTOR",
         "INEQ", "VERIF", "DIST")
EXPECTED_COUNT = 50 * 3 * len(MODES)

def fingerprint(state):
    """Only actual calculator signals; never label a modifier reset as success."""
    fields = ("power", "mode", "screen", "input", "cursor", "result", "raw",
              "ans", "preAns", "angle", "format", "digits", "math",
              "insert", "error", "menuTitle", "menuPage", "menu",
              "outputLines", "outputPage", "decimal", "hyp", "memory", "flow")
    return {field: state.get(field) for field in fields}

def classify(before, after, prior_notice, next_notice, key):
    changed = [name for name, value in fingerprint(before).items()
               if fingerprint(after)[name] != value]
    notice_changed = prior_notice != next_notice
    shift_changed = before.get("shift") != after.get("shift")
    alpha_changed = before.get("alpha") != after.get("alpha")
    if any(x in changed for x in ("error", "screen")) and after.get("screen") == "error":
        observed = "ERROR_STATE"
    elif changed:
        observed = "OBSERVED_STATE_CHANGE"
    elif key in ("SHIFT", "ALPHA") and (shift_changed or alpha_changed):
        observed = "MODIFIER_TOGGLE_ONLY"
    elif shift_changed or alpha_changed:
        observed = "MODIFIER_CONSUMED_WITHOUT_OBSERVED_EFFECT"
    elif notice_changed:
        observed = "NOTICE_ONLY"
    else:
        observed = "NO_OBSERVABLE_EFFECT"
    return {"web_observation":observed, "changed_fields":changed,
            "notification_changed":notice_changed,
            "native_reference_status":"UNVERIFIED",
            "device_behavior_claim":False}

async def audit(args):
    from playwright.async_api import async_playwright
    manifest = json.loads(KEY_MANIFEST.read_text(encoding="utf8"))
    keys = [item["physical_id"] for item in manifest["keys"]]
    if len(keys) != 50 or len(set(keys)) != 50:
        raise ValueError("REA-003 must identify exactly 50 unique physical keys")
    modes = list(MODES if not args.mode else args.mode)
    modifiers = list(MODIFIERS if not args.modifier else args.modifier)
    chosen_keys = keys if not args.key else args.key
    unknown_keys = set(chosen_keys) - set(keys)
    if unknown_keys:
        raise ValueError("Unexpected physical keys: " + str(sorted(unknown_keys)))
    if args.limit is not None and args.limit < 1:
        raise ValueError("--limit must be >= 1")
    plan = [(mode, mod, key) for mode in modes
            for mod in modifiers for key in chosen_keys]
    if args.limit is not None:
        plan = plan[:args.limit]
    source = CALCULATOR / "js" / "app.js"
    app_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    results = []
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=True,
            **({"executable_path":args.chromium} if args.chromium else {}),
            args=["--no-sandbox"] if args.chromium else []
        )
        page = await browser.new_page(viewport={"width":1000,"height":1100},
                                      device_scale_factor=1)
        failures = []
        page.on("pageerror", lambda e: failures.append(str(e)))
        try:
            for ordinal, (mode, modifier, key) in enumerate(plan, 1):
                record = {"id":f"AUD-{ordinal:04d}",
                          "mode":mode,"modifier":modifier,"physical_key":key,
                          "native_reference_status":"UNVERIFIED",
                          "web_observation":"NOT_RUN",
                          "device_behavior_claim":False}
                try:
                    await page.goto((CALCULATOR/"index.html").resolve().as_uri(),
                                    wait_until="load", timeout=20000)
                    await page.wait_for_function(
                        "typeof FreshCalculator !== 'undefined' && "
                        "document.querySelectorAll('#keys button[data-key]').length === 50",
                        timeout=10000
                    )
                    # MODE menu has 6 choices/page. Advanced mode enters a wizard,
                    # which is explicitly exited to give a repeatable edit baseline.
                    if mode != "COMP":
                        idx = MODES.index(mode)
                        await page.evaluate("FreshCalculator.press('MODE')")
                        if idx >= 6:
                            await page.evaluate("FreshCalculator.press('RIGHT')")
                        await page.evaluate("(x) => FreshCalculator.press(String(x))", (idx % 6) + 1)
                        await page.evaluate("FreshCalculator.press('AC')")
                    active = await page.evaluate("FreshCalculator.getState().mode")
                    if active != mode:
                        raise RuntimeError(f"mode navigation failed: {active}")
                    if modifier != "normal":
                        await page.evaluate("(k)=>FreshCalculator.press(k)",modifier.upper())
                    before = await page.evaluate("FreshCalculator.getState()")
                    previous = await page.locator("#notice").inner_text()
                    await page.locator(f'#keys button[data-key="{key}"]').click(timeout=8000)
                    after = await page.evaluate("FreshCalculator.getState()")
                    subsequent = await page.locator("#notice").inner_text()
                    record.update(classify(before, after, previous, subsequent, key))
                    record["screen_before"] = before.get("screen")
                    record["screen_after"] = after.get("screen")
                    record["mode_after"] = after.get("mode")
                    record["input_after"] = str(after.get("input", ""))[:180]
                    record["result_after"] = str(after.get("result", ""))[:180]
                    record["notice_after"] = subsequent[:180]
                    record["modifier_consumed"] = bool(
                        (before.get("shift") and not after.get("shift")) or
                        (before.get("alpha") and not after.get("alpha")))
                except Exception as error:
                    record["web_observation"] = "AUDIT_EXCEPTION"
                    record["exception"] = str(error)[:300]
                results.append(record)
                if args.progress and ordinal % args.progress == 0:
                    print(f"Audited {ordinal}/{len(plan)} contexts", flush=True)
        finally:
            await browser.close()
    counts = dict(sorted(collections.Counter(
        record["web_observation"] for record in results).items()))
    complete = (len(results) == EXPECTED_COUNT and
                not args.mode and not args.modifier and not args.key and
                args.limit is None)
    report = {
        "schema":"fx991-rea005-key-context-audit-v1",
        "task":"REA-005",
        "model":"fx-991ES PLUS C 2nd edition (web approximation)",
        "reference_code_coverage":0,
        "actual_native_device_tested":False,
        "source":"independent web calculator DOM actions",
        "source_app_sha256":app_hash,
        "reference_dependency":"REA-003 native mappings and REA-004 genuine captures pending",
        "scope":{"keys":len(chosen_keys),"modifiers":modifiers,"modes":modes,
                 "planned_contexts":len(plan),"full_grid":complete},
        "counts":counts,
        "entries":results
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n",encoding="utf8")
    markdown = args.out.with_suffix(".md")
    lines = ["# REA-005 — source-observed key context matrix", "",
             "**NOT DEVICE VERIFIED.** Web behavior classification is not proof of the physical CASIO key action.",
             "", f"- Contexts attempted: **{len(results)}** / {EXPECTED_COUNT}",
             f"- Complete matrix: **{complete}**",
             "- Native reference keys verified: **0 / 50**",
             "", "## Web-observed classifications", "", "| Classification | Count |",
             "|---|---:|"]
    lines += [f"| {name} | {count} |" for name,count in counts.items()]
    lines += ["", "## No-effect and exception contexts", "",
              "| Mode | Modifier | Key | Classification |", "|---|---|---|---|"]
    for item in results:
        if item["web_observation"] not in ("OBSERVED_STATE_CHANGE","MODIFIER_TOGGLE_ONLY"):
            lines.append(f"| {item['mode']} | {item['modifier']} | {item['physical_key']} | {item['web_observation']} |")
    markdown.write_text("\n".join(lines)+"\n",encoding="utf8")
    print(f"REA-005: {len(results)} contexts; {counts}; native CASIO verified: 0",flush=True)
    return int(bool(counts.get("AUDIT_EXCEPTION")) or
               (args.require_full and not complete))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--mode",action="append",choices=MODES)
    p.add_argument("--modifier",action="append",choices=MODIFIERS)
    p.add_argument("--key",action="append")
    p.add_argument("--limit",type=int)
    p.add_argument("--chromium",help="Use installed Chromium binary path")
    p.add_argument("--progress",type=int,default=100)
    p.add_argument("--require-full",action="store_true")
    args=p.parse_args()
    try:
        return asyncio.run(audit(args))
    except ImportError:
        print("Install Python Playwright and Chromium browser for the live web audit",file=sys.stderr)
        return 2

if __name__=="__main__":
    raise SystemExit(main())
