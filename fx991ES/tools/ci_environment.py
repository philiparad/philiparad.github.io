#!/usr/bin/env python3
"""Milestone 46: inspect Playwright CI prerequisites without claiming browser execution.

Records Python/Node availability, Playwright version/path, and browser executable
presence. No external HTTP requests. A preflight PASS is never browser qualification.
Always writes JSON and Markdown, even when dependencies are unavailable.
"""
import argparse
from datetime import datetime, timezone
import html
import importlib.util
import json
import os
from pathlib import Path
import platform
import re
import shutil
import sys

BROWSERS = ('chromium', 'firefox', 'webkit')
SCHEMA = 'fx991-ci-environment-m46'


def detect(*, stage='after-install', browser_paths=None, playwright_found=None,
           node_path=None, python_path=None, platform_name=None):
    """Deterministic checks, injectable to support CI failure-fixture tests."""
    if stage not in ('before-install', 'after-install'):
        raise ValueError('Invalid CI environment stage')
    if playwright_found is None:
        playwright_found = importlib.util.find_spec('playwright') is not None
    if node_path is None:
        node_path = shutil.which('node')
    if python_path is None:
        python_path = sys.executable
    if platform_name is None:
        platform_name = platform.system()
    statuses = {}
    notes = []
    if browser_paths is None:
        browser_paths = {}
        if playwright_found:
            try:
                from playwright.sync_api import sync_playwright
                with sync_playwright() as pw:
                    for name in BROWSERS:
                        browser_paths[name] = pw[name].executable_path
            except Exception as e:
                notes.append('Browser executable inspection failed: ' + type(e).__name__)
    for name in BROWSERS:
        path = browser_paths.get(name)
        available = bool(path and Path(path).is_file())
        statuses[name] = {'available': available, 'path': str(path) if path else None}
    checks = {'pythonAvailable': bool(python_path), 'nodeAvailable': bool(node_path),
              'playwrightImportable': bool(playwright_found),
              'browserExecutablesPresent': all(x['available'] for x in statuses.values())}
    if not checks['nodeAvailable']:
        notes.append('Node.js missing: JavaScript regression runner cannot execute')
    if not checks['playwrightImportable']:
        notes.append('Playwright Python module unavailable')
    for name in BROWSERS:
        if not statuses[name]['available']:
            notes.append(name + ' executable missing or inaccessible')
    ready = bool(all(checks.values())) if stage == 'after-install' else None
    return {'schema': SCHEMA, 'generatedAt': datetime.now(timezone.utc).isoformat(),
            'stage': stage, 'platform': str(platform_name),
            'python': str(python_path) if python_path else None,
            'node': str(node_path) if node_path else None,
            'checks': checks, 'browsers': statuses,
            'environmentReady': ready, 'issues': notes,
            'note': 'Environment preflight only; does not run browser assertions or certify physical Casio.'}


def as_markdown(data):
    def clean(x):
        return html.escape(re.sub(r'([|`*\[\]\\])', r'\\\1', str(x).replace('\r', ' ').replace('\n', ' ')))
    rows = ['## Browser CI environment — Milestone 46', '',
            '**Environment:** ' + ('READY' if data['environmentReady'] is True else
                                      'BLOCKED' if data['environmentReady'] is False else 'PRE-INSTALL'), '',
            '| Browser engine | Executable |', '|---|---|']
    for browser in BROWSERS:
        found=data['browsers'][browser]['available']
        rows.append('| '+browser+' | '+('Present' if found else 'Missing')+' |')
    rows.extend(['', '### CI prerequisites', ''])
    for name,ok in data['checks'].items():
        rows.append('- '+clean(name)+': '+('PASS' if ok else 'MISSING'))
    rows.extend(['', '### Diagnostic issues', ''])
    rows.extend('- '+clean(x) for x in data['issues'])
    if not data['issues']:rows.append('- No missing prerequisite detected')
    rows.extend(['', '_This report does not demonstrate browser acceptance or release qualification._', ''])
    return '\n'.join(rows)


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--stage', choices=('before-install','after-install'), default='after-install')
    p.add_argument('--out', type=Path, default=Path('release-evidence/ci-environment.json'))
    p.add_argument('--markdown', type=Path, default=Path('release-evidence/ci-environment.md'))
    args=p.parse_args(argv)
    data=detect(stage=args.stage)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.markdown.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
    args.markdown.write_text(as_markdown(data), encoding='utf-8')
    print('CI environment:', 'READY' if data['environmentReady'] is True else 'PRE-INSTALL' if data['environmentReady'] is None else 'BLOCKED')
    return 1 if data['environmentReady'] is False else 0

if __name__=='__main__':
    raise SystemExit(main())
