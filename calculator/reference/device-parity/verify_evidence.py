#!/usr/bin/env python3
"""Provenance-aware CASIO evidence verifier.

This does NOT create native/physical observations. It verifies the declared
origin, actual file hashes, matching models/key sequences and explicit human
review before reporting any case as parity-reviewed.

Usage:
  python3 calculator/reference/device-parity/verify_evidence.py \
    calculator/reference/device-parity/browser-evidence/report.json
  python3 calculator/reference/device-parity/verify_evidence.py \
    calculator/reference/device-parity/browser-evidence/report.json \
    --native calculator/reference/device-parity/private-native-evidence.json
"""
import argparse
import hashlib
import json
from pathlib import Path

MODELS = {"fx-991es", "fx-991es-plus", "fx-991es-plus-c"}
NATIVE_ORIGINS = {"physical_device", "licensed_emulator"}
REPORT_SCHEMA = "casio-parity-browser-evidence-v1"
NATIVE_SCHEMA = "casio-parity-native-evidence-v1"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_image(base, filename, expected_hash):
    if not isinstance(filename, str) or not filename or not isinstance(expected_hash, str):
        return False
    relative = Path(filename)
    if relative.is_absolute() or any(part in (".", "..") for part in relative.parts):
        return False
    image = (base / relative).resolve()
    root = base.resolve()
    if not image.is_relative_to(root) or not image.is_file():
        return False
    if image.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        return False
    return digest(image) == expected_hash.lower()


def validate(report_path, native_path=None):
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("schema") != REPORT_SCHEMA:
        raise ValueError("Unexpected browser report schema")
    native = {}
    if native_path:
        data = json.loads(native_path.read_text(encoding="utf-8"))
        if data.get("schema") != NATIVE_SCHEMA:
            raise ValueError("Unexpected native report schema")
        for item in data.get("observations", []):
            key = (item.get("model"), item.get("scenario_id"))
            if key in native:
                raise ValueError("Duplicate native observation: " + repr(key))
            native[key] = item

    seen = set()
    evaluated = []
    for item in report.get("records", []):
        model, scenario = item.get("model"), item.get("scenario_id", item.get("scenario"))
        key = model, scenario
        if model not in MODELS or not isinstance(scenario, str) or key in seen:
            raise ValueError("Invalid or duplicate browser case: " + repr(key))
        seen.add(key)
        # An HTML-exported report without the actual LCD PNG is still useful
        # as a behavior-only test, but never eligible for parity certification.
        browser_image_ok = safe_image(
            report_path.parent, item.get("browser_lcd"), item.get("browser_lcd_sha256")
        )
        browser_behavior_ok = item.get("browser_pass") is True
        obs = native.get(key)
        origin_ok = bool(obs and obs.get("origin") in NATIVE_ORIGINS)
        native_image_ok = bool(obs and native_path and safe_image(
            native_path.parent, obs.get("lcd_file"), obs.get("lcd_sha256")
        ))
        keylog_match = bool(obs and obs.get("keys") == item.get("keys"))
        reviewed = bool(
            obs and obs.get("reviewed_by") and obs.get("reviewed_at_utc")
            and obs.get("review_method") == "human_side_by_side"
            and obs.get("result_matches") is True
            and obs.get("lcd_matches") is True
            and obs.get("key_behavior_matches") is True
        )
        # A reviewer has to sign off on all three dimensions; image files
        # and logs alone are NOT automatically taken as exact pixel parity.
        parity_reviewed = bool(
            browser_behavior_ok and browser_image_ok and origin_ok and
            native_image_ok and keylog_match and reviewed
        )
        status = (
            "physical_device_reviewed" if parity_reviewed and obs["origin"] == "physical_device"
            else "licensed_emulator_reviewed" if parity_reviewed
            else "browser_pass_native_missing" if browser_behavior_ok and not obs
            else "browser_pass_native_unreviewed" if browser_behavior_ok
            else "browser_failed"
        )
        evaluated.append({
            "model": model,
            "scenario_id": scenario,
            "browser_pass": browser_behavior_ok,
            "browser_image_hash_valid": browser_image_ok,
            "native_origin": obs.get("origin") if origin_ok else None,
            "native_image_hash_valid": native_image_ok,
            "native_keylog_matches": keylog_match,
            "reviewed": reviewed,
            "parity_reviewed": parity_reviewed,
            "status": status,
        })
    return {
        "schema": "casio-parity-verified-summary-v1",
        "cases": len(evaluated),
        "browser_pass": sum(r["browser_pass"] for r in evaluated),
        "native_reviewed": sum(r["parity_reviewed"] for r in evaluated),
        "physical_device_reviewed": sum(r["status"] == "physical_device_reviewed" for r in evaluated),
        "native_evidence_supplied": bool(native_path),
        "note": "Reviewed parity is an explicit human assertion backed by matched evidence, not an automatic CASIO equivalence guarantee.",
        "records": evaluated,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("browser_report", type=Path)
    parser.add_argument("--native", type=Path, default=None, help="Human-entered evidence file, never a simulator export")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--require-complete", action="store_true",
                        help="Fail if any browser case has no reviewed native reference")
    args = parser.parse_args()
    result = validate(args.browser_report.resolve(),
                      args.native.resolve() if args.native else None)
    encoded = json.dumps(result, indent=2) + "\n"
    if args.output:
        args.output.write_text(encoded, encoding="utf-8")
    print("Browser pass:", result["browser_pass"], "/", result["cases"])
    print("Native reviewed:", result["native_reviewed"], "/", result["cases"])
    print("Physical-device reviewed:", result["physical_device_reviewed"])
    if args.require_complete and result["native_reviewed"] != result["cases"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
