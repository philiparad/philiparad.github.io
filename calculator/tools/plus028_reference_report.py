#!/usr/bin/env python3
"""PLUS-028: produce a reproducible, hardware-free validation report.

Authoritative references: CASIO fx-991ES PLUS (2nd edition) User's Guide.
This is a reference-conformance record, NEVER native hardware certification.
The reference runner fails if any documented case disagrees.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "tests" / "plus028-casio-manual-examples.cjs"
HARDWARE = ROOT / "reference" / "plus-028" / "hardware-evidence.json"
URLS = [
    "https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/equation_calculations.html",
    "https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/cmplx.html",
    "https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html",
    "https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/metric_conversion.html",
    "https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/calculation_ranges.html"
]


def produce():
    corpus_digest = hashlib.sha256(SCRIPT.read_bytes()).hexdigest()
    result = subprocess.run(["node", str(SCRIPT)], cwd=ROOT.parent,
                            text=True, capture_output=True, check=False)
    hardware = json.loads(HARDWARE.read_text(encoding="utf-8"))
    if hardware.get("schema") != "plus028-hardware-parity-v1":
        raise ValueError("Invalid hardware evidence schema")
    if hardware.get("model") != "fx-991ES PLUS (2nd edition)":
        raise ValueError("Wrong evidence model")
    native_cases = hardware.get("cases")
    if not isinstance(native_cases, list):
        raise ValueError("Invalid native evidence cases")
    passed = result.returncode == 0 and "PLUS-028 ALT PASS: 30" in result.stdout
    report = {
        "schema": "plus028-reference-conformance-v1",
        "target_model": "fx-991ES PLUS (2nd edition)",
        "test_source": "calculator/tests/plus028-casio-manual-examples.cjs",
        "test_sha256": corpus_digest,
        "manufacturer_references": URLS,
        "reported_reference_cases": 30 if passed else 0,
        "reference_tests_passed": passed,
        "reference_tests_output": result.stdout.strip(),
        "reference_tests_error": result.stderr.strip(),
        "native_evidence_cases": len(native_cases),
        "native_hardware_parity_certified": False,
        "lcd_pixel_parity_verified": False,
        "status": "REFERENCE_CASES_PASSED_HARDWARE_UNVERIFIED" if passed else
                  "REFERENCE_CASES_FAILED",
        "limitations": [
            "CASIO manual examples cover documented behavior only",
            "No unmeasured physical LCD resolution, glyph pixel placement or timing is inferred",
            "Browser tests must run separately on modular and standalone pages",
            "Native firmware/keylog parity remains unverified without device observations"
        ]
    }
    report["report_sha256"] = hashlib.sha256(
        json.dumps(report, sort_keys=True, ensure_ascii=False,
                   separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    try:
        report = produce()
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8")
        print(report["status"], "reference cases:", report["reported_reference_cases"])
        return 0 if report["reference_tests_passed"] else 1
    except (ValueError, OSError) as exc:
        print("PLUS-028 ALT error:", exc, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
