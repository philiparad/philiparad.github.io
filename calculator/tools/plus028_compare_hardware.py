#!/usr/bin/env python3
"""PLUS-028: compare independent CASIO hardware and web-simulator evidence.

Evidence must be a real physical fx-991ES PLUS (2nd edition) capture.
This program does not collect hardware evidence or certify an empty corpus.
Requires Pillow for PNG pixel comparison (pip install Pillow).
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

MODEL = "fx-991ES PLUS (2nd edition)"
SCHEMA = "plus028-hardware-parity-v1"


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, ensure_ascii=False,
                      separators=(",", ":")).encode("utf-8")


def image_difference(hardware, simulator):
    from PIL import Image, ImageChops
    with Image.open(hardware) as a, Image.open(simulator) as b:
        if a.format != "PNG" or b.format != "PNG":
            raise ValueError("LCD images must be PNG")
        if a.size != b.size:
            return {"dimensions_match": False,
                    "hardware_size": list(a.size), "simulator_size": list(b.size),
                    "differing_pixels": None, "total_pixels": None}
        first, second = a.convert("RGBA"), b.convert("RGBA")
        # Pixel equality only; no guessed geometry or resampling.
        diff = ImageChops.difference(first, second)
        changed = sum(1 for pixel in diff.getdata() if any(pixel))
        return {"dimensions_match": True,
                "hardware_size": list(first.size), "simulator_size": list(second.size),
                "differing_pixels": changed, "total_pixels": first.width * first.height}


def file_evidence(root, entry, role):
    if not isinstance(entry, dict) or not isinstance(entry.get("png"), str):
        raise ValueError(role + " must contain a PNG path and sha256")
    if not isinstance(entry.get("sha256"), str) or len(entry["sha256"]) != 64:
        raise ValueError(role + " requires an explicit SHA-256 digest")
    relative = Path(entry["png"])
    if relative.is_absolute() or ".." in relative.parts or relative.suffix.lower() != ".png":
        raise ValueError(role + " invalid PNG path")
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()) or not target.is_file():
        raise ValueError(role + " missing PNG file: " + entry["png"])
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    if digest.lower() != entry["sha256"].lower():
        raise ValueError(role + " SHA-256 mismatch: " + entry["png"])
    return target


def compare(manifest, root):
    if manifest.get("schema") != SCHEMA or manifest.get("model") != MODEL:
        raise ValueError("Evidence schema or device model does not match PLUS-028")
    cases = manifest.get("cases", [])
    if not isinstance(cases, list):
        raise ValueError("cases must be a list")
    seen = set()
    results = []
    for entry in cases:
        case_id = entry.get("id")
        if not isinstance(case_id, str) or not case_id or case_id in seen:
            raise ValueError("Missing or duplicate case id")
        seen.add(case_id)
        if entry.get("capture_type") != "physical-device":
            raise ValueError(case_id + ": physical-device provenance required")
        if not all(isinstance(entry.get(k), str) and entry[k].strip()
                   for k in ("device_serial_redacted", "capture_date",
                             "operator", "source_description")):
            raise ValueError(case_id + ": incomplete physical-device provenance")
        hardware = entry.get("hardware", {})
        simulated = entry.get("simulator", {})
        keys = entry.get("keys")
        if not isinstance(keys, list) or not keys or not all(
                isinstance(k, str) and k.strip() for k in keys):
            raise ValueError(case_id + ": physical key sequence required")
        if hardware.get("keys") != keys or simulated.get("keys") != keys:
            raise ValueError(case_id + ": physical and simulated keylogs differ")
        h_png = file_evidence(root, hardware, case_id + " hardware")
        s_png = file_evidence(root, simulated, case_id + " simulator")
        diff = image_difference(h_png, s_png)
        h_num, s_num = hardware.get("numeric"), simulated.get("numeric")
        numeric_match = None
        if h_num is not None or s_num is not None:
            if not isinstance(h_num, (int, float)) or not isinstance(s_num, (int, float)):
                raise ValueError(case_id + ": both numeric outputs required")
            if not (math.isfinite(h_num) and math.isfinite(s_num)):
                raise ValueError(case_id + ": nonfinite numerical value")
            atol = entry.get("absolute_tolerance", 1e-9)
            rtol = entry.get("relative_tolerance", 1e-9)
            if not all(isinstance(t, (int, float)) and math.isfinite(t) and t >= 0
                       for t in (atol, rtol)):
                raise ValueError(case_id + ": invalid numeric tolerances")
            numeric_match = math.isclose(h_num, s_num, abs_tol=atol, rel_tol=rtol)
        matches = diff["dimensions_match"] and diff["differing_pixels"] == 0
        if numeric_match is False:
            matches = False
        results.append({"id": case_id, "keys": keys, "pixels": diff,
                        "numeric_match": numeric_match, "matches": matches})
    passed = sum(r["matches"] for r in results)
    report = {"schema": SCHEMA, "model": MODEL,
              "status": ("BLOCKED_NO_DEVICE_EVIDENCE" if not results else
                         "PASS_CAPTURED_CASES_ONLY" if passed == len(results) else
                         "FAIL_CAPTURED_CASES"),
              "cases_total": len(results), "cases_matching": passed,
              "cases_different": len(results) - passed,
              "native_hardware_parity_certified": False,
              "limitations": ("No genuine captures" if not results else
                              "Only supplied hardware cases compared; full device parity unverified"),
              "results": results}
    report["sha256"] = hashlib.sha256(canonical_json(report)).hexdigest()
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    parser.add_argument("--sign-private-key", type=Path,
                        help="Optional operator-managed OpenSSL private key (never commit)")
    parser.add_argument("--require-evidence", action="store_true")
    args = parser.parse_args(argv)
    try:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        report = compare(manifest, args.manifest.parent)
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n",
                               encoding="utf-8")
        if args.sign_private_key:
            if not report["cases_total"]:
                raise ValueError("Cannot sign a report with zero hardware cases")
            subprocess.run(["openssl", "dgst", "-sha256", "-sign",
                            str(args.sign_private_key), "-out", str(args.report) + ".sig",
                            str(args.report)], check=True)
        print(report["status"], report["cases_matching"], "/", report["cases_total"])
        return 2 if args.require_evidence and not report["cases_total"] else 0 if (
            report["cases_matching"] == report["cases_total"]) else 1
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as exc:
        print("PLUS-028 evidence validation failed:", exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
