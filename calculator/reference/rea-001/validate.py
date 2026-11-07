#!/usr/bin/env python3
"""REA-001 reference evidence gate. Stdlib-only; never substitutes app outputs."""
import argparse
import json
import pathlib
import sys

parser = argparse.ArgumentParser()
parser.add_argument("manifest", type=pathlib.Path)
parser.add_argument("--require-complete", action="store_true")
args = parser.parse_args()

base = args.manifest.parent
data = json.loads(args.manifest.read_text(encoding="utf-8"))
cases = data["cases"]
ids = [case["id"] for case in cases]
errors = []
verified = 0
if len(cases) < 100:
    errors.append("at least 100 sequences required")
if len(ids) != len(set(ids)):
    errors.append("duplicate sequence IDs")

for case in cases:
    case_id = case["id"]
    keys = case.get("keys", [])
    if not keys or not all(isinstance(key, str) and key for key in keys):
        errors.append(case_id + ": key sequence absent")
        continue
    capture = case["capture"]
    states = capture.get("observed_states")
    if not (
        capture.get("source_device")
        and capture.get("capture_date")
        and isinstance(states, list)
        and len(states) == len(keys) + 1
        and (
            capture.get("observed_result") is not None
            or capture.get("observed_error") is not None
        )
    ):
        continue
    valid = True
    for index, state in enumerate(states):
        screenshot = state.get("screenshot")
        if not screenshot:
            valid = False
            break
        path = (base / screenshot).resolve()
        if not path.is_relative_to(base.resolve()):
            valid = False
            break
        if (
            state.get("step") != index
            or (index > 0 and state.get("key") != keys[index - 1])
            or state.get("lcd_text") is None
            or not path.is_file()
            or path.suffix.lower() != ".png"
            or path.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n"
        ):
            valid = False
            break
    if valid:
        verified += 1
    else:
        errors.append(case_id + ": invalid capture state or PNG")

print(
    f"{len(cases)} sequences specified; {verified} verified source captures; "
    f"{len(cases)-verified} awaiting real device/emulator evidence."
)
for item in errors:
    print("ERROR:", item, file=sys.stderr)
if args.require_complete and verified < 100:
    errors.append("REA-001 is not complete: fewer than 100 verified reference sequences")
    print("BLOCKED:", errors[-1], file=sys.stderr)
if errors:
    sys.exit(1)
