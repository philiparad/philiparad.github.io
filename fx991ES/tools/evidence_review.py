#!/usr/bin/env python3
"""Offline, fail-closed review of *actual* Playwright/browser-matrix evidence.

Run: python tools/evidence_review.py browser-evidence --max-age-hours 72
This command does not execute a browser or certify physical CASIO compatibility.
"""
import argparse
from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
from urllib.parse import urlsplit
from browser_matrix import BROWSERS, REQUIRED_CHECKS, EXPECTED_NAMES, check_capture, source_digest


def review_directory(directory, *, root=None, now=None, max_age_hours=72):
    directory = Path(directory)
    now = now or datetime.now(timezone.utc)
    root_digest = source_digest(root) if root is not None else source_digest()
    problems, report = [], {}
    matrix_file = directory / 'matrix-run.json'
    try:
        matrix = json.loads(matrix_file.read_text(encoding='utf-8'))
        if matrix.get('schema') != 'fx991-browser-matrix-run':
            problems.append('Invalid matrix-run schema')
        if not isinstance(matrix.get('milestone'), int) or matrix['milestone'] < 37:
            problems.append('Invalid matrix milestone version')
        if matrix.get('sourceDigest') != root_digest:
            problems.append('Source fingerprint differs from this checkout')
        matrix_time = None
        try:
            matrix_time = datetime.fromisoformat(matrix['generatedAt'].replace('Z', '+00:00'))
            if matrix_time.tzinfo is None: raise ValueError('timezone missing')
            if matrix_time > now + timedelta(minutes=5): problems.append('Matrix timestamp is in the future')
            if matrix_time < now - timedelta(hours=max_age_hours): problems.append('Matrix timestamp is stale')
        except (KeyError, AttributeError, ValueError, TypeError):
            problems.append('Missing or invalid matrix timestamp')
        rows = matrix.get('results')
        if not isinstance(rows, list) or len(rows) != 3 or {x.get('browser') for x in rows if isinstance(x, dict)} != set(BROWSERS):
            problems.append('Matrix must list exactly Chromium, Firefox, and WebKit')
            rows = []
        by_name = {x['browser']: x for x in rows if isinstance(x, dict) and x.get('browser') in BROWSERS}
        target = matrix.get('targetUrl')
        if not isinstance(target, str) or not target.endswith('/tests/browser-acceptance.html'):
            problems.append('Invalid target URL')
            target = ''
    except (OSError, ValueError, TypeError) as exc:
        matrix, by_name, target, matrix_time = {}, {}, '', None
        problems.append('Missing/invalid matrix-run.json: ' + str(exc))
    for browser in BROWSERS:
        item = by_name.get(browser)
        if not item:
            problems.append(browser + ': missing matrix row')
            report[browser] = 'MISSING'
            continue
        if item.get('status') != 'PASS':
            problems.append(browser + ': matrix status ' + str(item.get('status')))
        path = directory / (browser + '-acceptance.json')
        try:
            raw = json.loads(path.read_text(encoding='utf-8'))
            names, passed = check_capture(raw, browser)
            timestamp = datetime.fromisoformat(raw['generatedAt'].replace('Z', '+00:00'))
            if timestamp > now + timedelta(minutes=5):
                problems.append(browser + ': timestamp is in the future')
            if timestamp < now - timedelta(hours=max_age_hours):
                problems.append(browser + ': capture is stale')
            if matrix_time and abs((matrix_time-timestamp).total_seconds()) > 1800:
                problems.append(browser + ': matrix/capture times differ by more than 30 minutes')
            if raw.get('location') != target:
                problems.append(browser + ': capture URL does not match matrix target')
            if passed != REQUIRED_CHECKS:
                problems.append(browser + ': failed acceptance checks')
            if item.get('passed') != passed or item.get('names') != list(EXPECTED_NAMES):
                problems.append(browser + ': matrix summary disagrees with capture')
            if item.get('stage') and item['stage'] != 'capture':
                problems.append(browser + ': incomplete browser capture phase')
            if item.get('errors'):
                problems.append(browser + ': browser recorded JS/console errors')
            report[browser] = f'{passed}/{REQUIRED_CHECKS}'
        except (OSError, ValueError, TypeError, KeyError) as exc:
            problems.append(browser + ': missing/invalid capture: ' + str(exc))
            report[browser] = 'INVALID'
    if matrix.get('ready') is not True:
        problems.append('Matrix did not declare complete browser qualification')
    return {'schema': 'fx991-evidence-review', 'ready': not problems,
            'sourceDigest': root_digest, 'checks': report, 'blockers': problems,
            'note': 'Only browser evidence reviewed; physical calculator equivalence not certified.'}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', help='Directory containing matrix-run.json and three browser captures')
    parser.add_argument('--max-age-hours', type=float, default=72)
    parser.add_argument('--out', default=None)
    args = parser.parse_args(argv)
    result = review_directory(args.directory, max_age_hours=args.max_age_hours)
    rendered = json.dumps(result, indent=2)
    print(rendered)
    if args.out:
        Path(args.out).write_text(rendered + '\n', encoding='utf-8')
    return 0 if result['ready'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
