#!/usr/bin/env python3
"""REA-002: verify provenance and geometry consistency, not hardware fidelity."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence', type=Path)
parser.add_argument('source_png', type=Path)
args = parser.parse_args()
errors = []
try:
    obj = json.loads(args.evidence.read_text(encoding='utf-8'))
    c = obj['capture']
    g = obj['geometry']
    raster = obj['raster']
    raw = args.source_png.read_bytes()
    if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
        errors.append('source file is not a PNG')
    elif len(raw) < 24:
        errors.append('truncated PNG')
    else:
        png_width, png_height = struct.unpack('>II', raw[16:24])
        if (png_width, png_height) != (c['width'], c['height']):
            errors.append('PNG dimensions disagree with evidence metadata')
    if hashlib.sha256(raw).hexdigest() != c['sha256']:
        errors.append('PNG checksum differs from original screenshot')
    if not all(str(c.get(k, '')).strip() for k in ('source_device', 'version', 'date', 'setup', 'provenance')):
        errors.append('missing source device/version/date/setup/provenance')
    if obj.get('status') != 'UNREVIEWED_MEASUREMENT':
        errors.append('record must be labeled unreviewed until external hardware validation')
    for name in ('bezel', 'active', 'annunciators', 'glyph'):
        region = g.get(name)
        if not isinstance(region, dict):
            errors.append(name + ' missing rectangle')
            continue
        if not all(type(region.get(k)) is int for k in ('x', 'y', 'width', 'height')):
            errors.append(name + ' must use integer coordinates')
            continue
        x, y, w, h = (region[k] for k in ('x', 'y', 'width', 'height'))
        if x < 0 or y < 0 or w < 1 or h < 1 or x+w > c['width'] or y+h > c['height']:
            errors.append(name + ' outside source image')
    if not all(type(raster.get(k)) is int and 1 <= raster[k] <= 2048 for k in ('width', 'height')):
        errors.append('native logical raster width/height unmeasured')
    pitch = raster.get('image_pixels_per_dot')
    if type(pitch) not in (int,float) or not .1 <= pitch <= 50:
        errors.append('missing or implausible screenshot-dot scale')
    if len(str(raster.get('measurement_method', '')).strip()) < 40:
        errors.append('methodology must explain independently measured LCD pixel grid')
    if g.get('active') and all(type(raster.get(k)) is int and raster[k] > 0 for k in ('width', 'height')) and type(pitch) in (int,float) and pitch > 0:
        active = g['active']
        for dimension, count in (('width', raster['width']), ('height', raster['height'])):
            if abs(active[dimension] - count * pitch) > max(8, .25*active[dimension]):
                errors.append('LCD active '+dimension+' is inconsistent with declared dot pitch')
except (OSError, ValueError, KeyError, TypeError, struct.error) as exc:
    errors.append(str(exc))
for error in errors:
    print('ERROR:', error, file=sys.stderr)
if errors:
    sys.exit(1)
print('STRUCTURALLY_VALID_UNREVIEWED — this is not proof of CASIO native LCD dimensions')
