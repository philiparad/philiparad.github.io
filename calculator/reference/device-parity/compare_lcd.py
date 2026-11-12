#!/usr/bin/env python3
"""Review aid: normalized web LCD vs genuine CASIO/authorized emulator image.

Produces a numerical mismatch ratio and an RGB difference image. It does NOT
automatically certify device parity. Native crop must be calibrated to the
real LCD display rectangle; the default 96x31 is a web-only reference raster.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps


def checksum(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def crop_tuple(spec):
    if not spec:
        return None
    try:
        x, y, w, h = (int(v.strip()) for v in spec.split(","))
    except (ValueError, AttributeError):
        raise argparse.ArgumentTypeError("Crop must be x,y,width,height")
    if min(x, y) < 0 or min(w, h) <= 0:
        raise argparse.ArgumentTypeError("Crop coordinates must be nonnegative and sizes positive")
    return x, y, w, h


def normalized_pixels(image, crop=None, size=(96, 31)):
    gray = ImageOps.grayscale(image)
    if crop:
        x, y, w, h = crop
        if x + w > gray.width or y + h > gray.height:
            raise ValueError("Crop exceeds image bounds")
        gray = gray.crop((x, y, x + w, y + h))
    gray = gray.resize(size, Image.Resampling.BILINEAR)
    values = list(gray.getdata())
    ordered = sorted(values)
    median = ordered[len(ordered)//2]
    darkest, brightest = ordered[0], ordered[-1]
    if brightest - darkest < 8:
        return [0] * len(values), {"contrast": brightest-darkest, "warning": "low-contrast or blank capture"}
    # LCD is expected to have a mostly uniform background. Invert images
    # with dark backgrounds before segmenting dark active pixels.
    inverted = median < (darkest + brightest) / 2
    if inverted:
        values = [255-v for v in values]
        ordered = sorted(values)
        median, darkest = ordered[len(ordered)//2], ordered[0]
    threshold = darkest + 0.55 * (median-darkest)
    binary = [int(v < threshold) for v in values]
    return binary, {"contrast": brightest-min(values) if inverted else brightest-darkest,
                    "background_inverted": inverted, "threshold": threshold}


def compare_arrays(web, native, size=(96, 31), max_shift=2):
    width, height = size
    if len(web) != width*height or len(native) != width*height:
        raise ValueError("Input size does not match expected LCD raster")
    best = None
    for dy in range(-max_shift, max_shift+1):
        for dx in range(-max_shift, max_shift+1):
            different = 0
            for y in range(height):
                for x in range(width):
                    px, py = x+dx, y+dy
                    other = native[py*width+px] if 0 <= px < width and 0 <= py < height else 0
                    different += web[y*width+x] != other
            candidate = different, abs(dx)+abs(dy), dx, dy
            if best is None or candidate < best:
                best = candidate
    mismatch, _, dx, dy = best
    difference = []
    for y in range(height):
        for x in range(width):
            px, py = x+dx, y+dy
            b = native[py*width+px] if 0 <= px < width and 0 <= py < height else 0
            a = web[y*width+x]
            difference.append((220,40,50) if a != b else (40,44,53) if a else (248,248,248))
    return {
        "mismatch_pixels": mismatch,
        "total_pixels": width*height,
        "mismatch_fraction": mismatch/(width*height),
        "alignment_dx": dx,
        "alignment_dy": dy,
        "diff_pixels": difference,
    }


def compare_images(web_path, native_path, web_crop=None, native_crop=None, size=(96, 31)):
    with Image.open(web_path) as im:
        a, wa = normalized_pixels(im, web_crop, size)
    with Image.open(native_path) as im:
        b, nb = normalized_pixels(im, native_crop, size)
    comparison = compare_arrays(a, b, size)
    pixels = comparison.pop("diff_pixels")
    result = {
        "schema": "casio-lcd-visual-review-v1",
        "source_web_sha256": checksum(web_path),
        "source_native_declared_sha256": checksum(native_path),
        "web_image_analysis": wa,
        "reference_image_analysis": nb,
        "normalization": {"width": size[0], "height": size[1], "max_shift": 2},
        "manual_review_required": True,
        "device_parity_certified": False,
        **comparison,
    }
    return result, pixels


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("web_image", type=Path)
    parser.add_argument("reference_image", type=Path)
    parser.add_argument("--web-crop", type=crop_tuple)
    parser.add_argument("--native-crop", type=crop_tuple)
    parser.add_argument("--diff", type=Path, default=Path("casio-lcd-diff.png"))
    parser.add_argument("--json", type=Path, default=Path("casio-lcd-review.json"))
    args = parser.parse_args()
    result, pixels = compare_images(
        args.web_image, args.reference_image, args.web_crop, args.native_crop)
    image = Image.new("RGB", (96, 31))
    image.putdata(pixels)
    image.resize((960, 310), Image.Resampling.NEAREST).save(args.diff)
    args.json.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("Pixel mismatch %.2f%% (after best ±2px alignment)" % (100*result["mismatch_fraction"]))
    print("Image diff:", args.diff, "JSON:", args.json)
    print("Human review required; this is NOT a physical-device parity certificate")


if __name__ == "__main__":
    main()
