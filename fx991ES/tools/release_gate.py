#!/usr/bin/env python3
"""Milestone 40 release gate. A manifest is a checksum inventory, NOT an attestation.

`prepare` records all shipped source files. `verify` checks that inventory and can
qualify browser evidence using the *existing* fail-closed browser evidence reviewer.
Missing or failed browser captures must never turn into a qualified release.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
from evidence_review import review_directory

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = 'release-manifest.json'
SCHEMA = 'fx991-release-manifest'
OMIT_DIRS = {'.git', '__pycache__', '.pytest_cache', '.mypy_cache', 'browser-evidence', 'release-evidence'}
OMIT_FILES = {MANIFEST, '.DS_Store'}


def inventory(root=ROOT):
    root = Path(root)
    found = {}
    for path in root.rglob('*'):
        if not path.is_file() or any(part in OMIT_DIRS for part in path.relative_to(root).parts) or path.name in OMIT_FILES:
            continue
        name = path.relative_to(root).as_posix()
        if path.is_symlink():
            raise ValueError('Symlink not allowed in release source: ' + name)
        found[name] = sha256(path.read_bytes()).hexdigest()
    return dict(sorted(found.items()))


def build_manifest(root=ROOT, *, revision=40):
    files = inventory(root)
    return {'schema': SCHEMA, 'milestone': revision, 'algorithm': 'sha256',
            'files': files, 'fileCount': len(files),
            'status': 'CANDIDATE',
            'note': 'Checksums describe source integrity; browser and device compatibility are not certified.'}


def audit_manifest(root=ROOT):
    root = Path(root)
    problems = []
    try:
        data = json.loads((root / MANIFEST).read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            raise ValueError('manifest must be an object')
    except (OSError, ValueError, TypeError) as exc:
        return {'ready': False, 'blockers': ['Manifest unavailable/invalid: ' + str(exc)], 'fileCount': 0}
    if data.get('schema') != SCHEMA or data.get('algorithm') != 'sha256' or data.get('milestone') != 40 or data.get('status') != 'CANDIDATE':
        problems.append('Invalid release manifest identity')
    expected = data.get('files')
    if not isinstance(expected, dict) or not expected:
        return {'ready': False, 'blockers': problems + ['Missing release file inventory'], 'fileCount': 0}
    if any(not isinstance(k, str) or not isinstance(v, str) or len(v) != 64 for k, v in expected.items()):
        problems.append('Invalid file hash entries')
    try:
        actual = inventory(root)
    except (OSError, ValueError) as exc:
        return {'ready': False, 'blockers': problems + ['Unable to inventory sources: ' + str(exc)], 'fileCount': 0}
    if data.get('fileCount') != len(expected):
        problems.append('Manifest file count mismatch')
    for name in sorted(expected.keys() - actual.keys()):
        problems.append('Missing file: ' + name)
    for name in sorted(actual.keys() - expected.keys()):
        problems.append('Unexpected file: ' + name)
    for name in sorted(expected.keys() & actual.keys()):
        if expected[name] != actual[name]:
            problems.append('Modified file: ' + name)
    return {'ready': not problems, 'blockers': problems, 'fileCount': len(actual)}


def qualify(root=ROOT, evidence=None, *, max_age_hours=72, now=None):
    root = Path(root)
    audit = audit_manifest(root)
    result = {'schema': 'fx991-release-qualification', 'milestone': 40,
              'generatedAt': (now or datetime.now(timezone.utc)).isoformat(),
              'sourceIntegrity': 'PASS' if audit['ready'] else 'FAIL',
              'fileCount': audit['fileCount'], 'browserEvidence': 'MISSING',
              'deviceCompatibility': 'UNVERIFIED', 'ready': False,
              'blockers': list(audit['blockers'])}
    if evidence is None:
        result['blockers'].append('No browser evidence directory supplied')
    else:
        try:
            review = review_directory(evidence, root=root, now=now, max_age_hours=max_age_hours)
            result['browserEvidence'] = 'PASS' if review['ready'] else 'FAIL'
            result['browserResults'] = review['checks']
            result['blockers'].extend('Browser: ' + x for x in review['blockers'])
        except (OSError, ValueError, TypeError, KeyError) as exc:
            result['browserEvidence'] = 'FAIL'
            result['blockers'].append('Browser evidence review error: ' + str(exc))
    result['ready'] = not result['blockers']
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('prepare', 'verify', 'qualify'))
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--evidence', type=Path)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args(argv)
    if args.command == 'prepare':
        result = build_manifest(args.root)
        (args.root / MANIFEST).write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f'Release CANDIDATE manifest prepared for {result["fileCount"]} files (not browser qualified)')
        return 0
    result = audit_manifest(args.root) if args.command == 'verify' else qualify(args.root, args.evidence)
    encoded = json.dumps(result, indent=2, ensure_ascii=False) + '\n'
    print(encoded, end='')
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(encoded, encoding='utf-8')
    return 0 if result['ready'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
