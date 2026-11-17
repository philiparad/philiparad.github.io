#!/usr/bin/env python3
"""CAL-012: compare real WebView2 and Chromium LCD element screenshots.

Requires Pillow. This checks emulated DPR 1/1.25/1.5/2, NOT actual
Windows monitor scaling or physical CASIO LCD pixel parity.
"""
import html
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageOps, ImageStat

FACTORS = [1, 1.25, 1.5, 2]
CASES = [
    "ans", "mode", "eqnTypes", "eqnCoefficients", "fraction",
    "nestedRoot", "fractionAnswer", "engineering",
]
# The shared calculator stylesheet applies global border-box sizing to canvas.
# CSS width=480,height=155 therefore already includes the 8px border.
BASE_SIZE = (480, 155)
# The tiny antialiased font can vary between two independent Chromium builds.
# Require a matching shape and nonblank text rather than exact RGB equality.
MAX_MEAN_CHANNEL_ERROR = 24.0
MIN_INK_IOU = 0.58


def mask(image):
    return ImageOps.grayscale(image).point(
        lambda value: 255 if value < 130 else 0
    ).convert("1")


def compare(native_file, chrome_file, factor, diffs):
    with Image.open(native_file) as source_a, Image.open(chrome_file) as source_b:
        a, b = source_a.convert("RGB"), source_b.convert("RGB")
    expected = tuple(round(x * factor) for x in BASE_SIZE)
    # Actual canvas screenshot sizes must reflect the requested device scale.
    for label, image in (("WebView2", a), ("Chromium", b)):
        if any(abs(actual - target) > 2 for actual, target in zip(image.size, expected)):
            raise ValueError(f"{label} screenshot dimensions {image.size}, expected {expected}")
    if a.size != b.size:
        # Edge and Chromium may round fractional-DPR screenshot extents by
        # one pixel differently. Crop at most two physical edge pixels;
        # larger dimension mismatches were already rejected above.
        common = (min(a.width, b.width), min(a.height, b.height))
        a = a.crop((0, 0, *common))
        b = b.crop((0, 0, *common))
    border = round(8 * factor)
    inner = (border, border, a.width - border, a.height - border)
    a, b = a.crop(inner), b.crop(inner)
    if min(a.size) < 10:
        raise ValueError("Empty LCD inner region")
    am, bm = mask(a), mask(b)
    aa = [bool(pixel) for pixel in am.getdata()]
    bb = [bool(pixel) for pixel in bm.getdata()]
    ink_a, ink_b = sum(aa), sum(bb)
    if min(ink_a, ink_b) < 40:
        raise ValueError(f"Blank or nearly blank LCD frame: ink {ink_a}/{ink_b}")
    intersection = sum(one and two for one, two in zip(aa, bb))
    union = sum(one or two for one, two in zip(aa, bb))
    iou = intersection / union if union else 0.0
    difference = ImageChops.difference(a, b)
    mae = sum(ImageStat.Stat(difference).mean) / 3
    ImageEnhance.Contrast(difference).enhance(3).save(diffs)
    return {
        "webview2_ink": ink_a, "chromium_ink": ink_b,
        "ink_iou": round(iou, 4), "mean_color_error": round(mae, 3),
        "width": a.width, "height": a.height,
        "passed": iou >= MIN_INK_IOU and mae <= MAX_MEAN_CHANNEL_ERROR,
    }


def main():
    if len(sys.argv) != 2:
        print("Usage: compare_lcd_cross_engine.py <lcd-cross-engine-folder>", file=sys.stderr)
        return 2
    root = Path(sys.argv[1])
    native, chrome = root / "webview2", root / "chromium"
    rows = []
    for folder in (native, chrome):
        if not (folder / "manifest.json").is_file():
            raise FileNotFoundError(f"Missing capture manifest: {folder}")
    native_manifest = json.loads((native / "manifest.json").read_text(encoding="utf-8"))
    chrome_manifest = json.loads((chrome / "manifest.json").read_text(encoding="utf-8"))
    required = {(case, factor) for case in CASES for factor in FACTORS}
    for label, manifest in (("WebView2", native_manifest), ("Chromium", chrome_manifest)):
        actual = [(entry["scenario"], entry["factor"]) for entry in manifest]
        if set(actual) != required or len(actual) != len(required):
            raise ValueError(f"{label} incomplete/duplicate scenario coverage")
    diff_folder = root / "diffs"
    diff_folder.mkdir(parents=True, exist_ok=True)
    for factor in FACTORS:
        for case in CASES:
            suffix = str(factor).replace(".", "_")
            filename = f"{case}-dpr-{suffix}.png"
            difference = diff_folder / filename
            entry = {"scenario": case, "dpr": factor, "file": filename}
            try:
                entry.update(compare(native / filename, chrome / filename, factor, difference))
            except Exception as error:
                entry.update({"passed": False, "error": str(error)})
            rows.append(entry)
    passed = sum(bool(row["passed"]) for row in rows)
    report = {
        "task": "CAL-012", "status": "pass" if passed == len(required) else "fail",
        "note": "WebView2 vs Chromium at emulated device pixel ratios; not physical OS scaling or CASIO hardware parity.",
        "required_pairs": len(required), "passed_pairs": passed,
        "thresholds": {"minimum_inner_ink_iou": MIN_INK_IOU,
                       "maximum_mean_channel_error": MAX_MEAN_CHANNEL_ERROR},
        "rows": rows
    }
    (root / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    cards = []
    for row in rows:
        name = html.escape(row["file"])
        title = html.escape(f'{row["scenario"]} — {row["dpr"] * 100:g}%')
        if "error" in row:
            metrics = html.escape(row["error"])
        else:
            metrics = html.escape(
                f'Ink IoU {row["ink_iou"]:.3f}, mean error {row["mean_color_error"]:.2f}')
        status = "PASS" if row["passed"] else "FAIL"
        cards.append(f'<section><h2>{title}: {status}</h2><p>{metrics}</p>'
                     f'<figure><figcaption>WebView2</figcaption><img src="webview2/{name}"></figure>'
                     f'<figure><figcaption>Chromium</figcaption><img src="chromium/{name}"></figure>'
                     f'<figure><figcaption>Difference ×3</figcaption><img src="diffs/{name}"></figure></section>')
    page = ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<title>CAL-012 WebView2 / Chromium comparison</title>'
            '<style>body{font:15px system-ui;margin:22px;background:#eef2ef;color:#203027}'
            'section{background:white;padding:16px;margin:16px 0;border:1px solid #bcd;'
            'border-radius:9px}figure{display:inline-block;margin:8px}img{max-width:520px}'
            'h2{font-size:17px}</style>'
            f'<h1>CAL-012: {passed}/{len(required)} cross-engine pairs pass</h1>'
            '<p>Device-pixel-ratio emulation, not physical Windows monitor scaling.</p>'
            + "".join(cards) + '</html>')
    (root / "index.html").write_text(page, encoding="utf-8")
    print(f'CAL-012: {passed}/{len(required)} WebView2/Chromium pairs PASS')
    for row in rows:
        if not row["passed"]:
            details = (row["error"] if "error" in row else
                       f'IoU={row["ink_iou"]} mean={row["mean_color_error"]}')
            print("FAIL", row["scenario"], row["dpr"], details)
    return 0 if passed == len(required) else 1


if __name__ == "__main__":
    sys.exit(main())
