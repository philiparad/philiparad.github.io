#!/usr/bin/env python3
"""Offline inspection of an actual GitHub Actions artifact ZIP (Milestone 42).

The ZIP itself is untrusted. This tool checks entry paths, size limits, checksums,
source revision consistency, and browser evidence against the current checkout.
It never turns an uploaded ZIP into a trusted GitHub CI attestation.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
from html import escape
import json
from pathlib import Path, PurePosixPath
import stat
import tempfile
import zipfile

from evidence_review import review_directory
from browser_matrix import source_digest
from ci_diagnostics import triage

SCHEMA = 'fx991-actions-artifact-inspection-m42'
MAX_ARCHIVE = 20 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED = 32 * 1024 * 1024
MAX_ENTRY = 8 * 1024 * 1024
MAX_FILES = 100
ALLOWED_SUFFIXES = {'.json', '.html', '.png', '.txt', '.log'}
REQUIRED_SOURCE = ('browser-evidence/matrix-run.json',)


def safe_member_path(name):
    if not isinstance(name, str) or not name or '\\' in name or '\x00' in name:
        raise ValueError('Unsafe archive filename')
    path = PurePosixPath(name)
    if path.is_absolute() or any(p in ('', '..', '.') for p in name.split('/')):
        raise ValueError('Archive path traversal or absolute path')
    if len(name) > 240 or ':' in name:
        raise ValueError('Unsafe archive path length or separator')
    # Some GitHub artifacts flatten their single top-level evidence directory.
    if len(path.parts) == 1:
        if name == 'matrix-run.json' or name.endswith('-acceptance.json') or name.endswith('-screenshot.png') or name == 'evidence-review.json':
            return PurePosixPath('browser-evidence') / name
        if name in ('release-decision.json', 'release-decision.html', 'ci-diagnostics.json', 'ci-diagnostics.html'):
            return PurePosixPath('release-evidence') / name
    if path.parts[0] not in ('browser-evidence', 'release-evidence'):
        raise ValueError('Unexpected artifact directory: ' + name)
    if path.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError('Disallowed artifact type: ' + name)
    return path


def inspect_archive(archive, *, root, max_age_hours=72):
    """Returns a fail-closed report; never executes files inside the archive."""
    archive, root = Path(archive), Path(root)
    problems, items, hashes = [], [], {}
    matrix = decision = None
    review = None
    if not archive.is_file() or archive.stat().st_size > MAX_ARCHIVE:
        raise ValueError('Archive missing or larger than 20 MiB')
    with tempfile.TemporaryDirectory(prefix='fx991-artifact-') as temp:
        destination = Path(temp)
        with zipfile.ZipFile(archive) as z:
            entries = z.infolist()
            if len(entries) > MAX_FILES:
                raise ValueError('Too many ZIP entries')
            total = 0
            seen = set()
            for item in entries:
                if item.is_dir():
                    continue
                if (item.external_attr >> 16) & 0o170000 == stat.S_IFLNK:
                    raise ValueError('ZIP symlink not allowed')
                rel = safe_member_path(item.filename)
                if str(rel) in seen:
                    raise ValueError('Duplicate archive entry: ' + str(rel))
                seen.add(str(rel))
                if item.file_size > MAX_ENTRY:
                    raise ValueError('ZIP entry too large: ' + item.filename)
                total += item.file_size
                if total > MAX_TOTAL_UNCOMPRESSED:
                    raise ValueError('ZIP decompressed data too large')
                if item.compress_size and item.file_size > item.compress_size * 200 and item.file_size > 100_000:
                    raise ValueError('Suspicious ZIP compression ratio')
                data = z.read(item)
                if len(data) != item.file_size:
                    raise ValueError('ZIP content size mismatch')
                dest = destination.joinpath(*rel.parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
                hashes[str(rel)] = sha256(data).hexdigest()
                items.append({'path': str(rel), 'bytes': len(data), 'sha256': hashes[str(rel)]})
        for required in REQUIRED_SOURCE:
            if required not in hashes:
                problems.append('Missing browser matrix: ' + required)
        browser_dir = destination / 'browser-evidence'
        try:
            review = review_directory(browser_dir, root=root, max_age_hours=max_age_hours)
        except (OSError, ValueError, TypeError, KeyError) as exc:
            problems.append('Evidence review could not complete: ' + str(exc)[:200])
        if review and not review['ready']:
            problems.extend(str(s) for s in review.get('blockers', []))
        try:
            matrix = json.loads((browser_dir / 'matrix-run.json').read_text(encoding='utf-8'))
        except (OSError, ValueError, UnicodeError):
            problems.append('Missing or invalid matrix-run.json')
        try:
            decision = json.loads((destination / 'release-evidence/release-decision.json').read_text(encoding='utf-8'))
        except (OSError, ValueError, UnicodeError):
            problems.append('Missing or invalid release-decision.json')
        diagnostics = triage(matrix, decision)
        if not diagnostics['ready']:
            problems.extend('Diagnostic: ' + str(s) for s in diagnostics['issues'])
        # A ZIP cannot attest which GitHub run created it. That requires a run ID,
        # successful conclusion, and the artifact id from an authenticated GitHub API.
        return {
            'schema': SCHEMA,
            'generatedAt': datetime.now(timezone.utc).isoformat(),
            'archiveSha256': sha256(archive.read_bytes()).hexdigest(),
            'fileCount': len(items), 'files': items,
            'browsers': diagnostics['browsers'],
            'sourceDigestMatches': bool(isinstance(matrix, dict) and matrix.get('sourceDigest') == source_digest(root)),
            'evidenceComplete': bool(not problems),
            'ciRunAuthenticated': False,
            'releaseQualified': False,
            'blockers': list(dict.fromkeys(problems)) or ['Evidence is complete but ZIP origin is not authenticated against GitHub Actions.'],
            'note': 'Offline ZIP review is not a GitHub run attestation and never certifies hardware compatibility.'
        }


def render_html(report):
    e = lambda s: escape(str(s), quote=True)
    rows = ''.join(f'<tr><td>{e(b)}</td><td>{e(v.get("status"))}</td><td>{e(v.get("stage"))}</td><td>{e(v.get("detail"))}</td></tr>' for b,v in report.get('browsers', {}).items())
    blockers = ''.join('<li>' + e(s) + '</li>' for s in report.get('blockers', []))
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>fx-991ES Actions Artifact Inspection</title><style>body{{font:16px/1.5 system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}}table{{border-collapse:collapse;width:100%}}td,th{{text-align:left;border-bottom:1px solid #ccc;padding:.6rem;vertical-align:top;overflow-wrap:anywhere}}header{{padding:1rem;background:#f0f3f8;border-radius:10px}}</style></head><body><header><h1>GitHub Actions Artifact Inspection — M42</h1><p>Evidence complete: <strong>{e(report['evidenceComplete'])}</strong> · CI authenticated: <strong>False</strong> · Release qualified: <strong>False</strong></p></header><h2>Browser stages</h2><table><thead><tr><th>Browser</th><th>Status</th><th>Stage</th><th>Details</th></tr></thead><tbody>{rows}</tbody></table><h2>Blockers</h2><ul>{blockers}</ul><p>An independently supplied artifact cannot establish successful GitHub Actions execution or Casio hardware equivalence.</p></body></html>'''


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('archive', type=Path, help='Downloaded GitHub Actions artifact ZIP')
    p.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    p.add_argument('--out', type=Path, default=Path('release-evidence/artifact-inspection.json'))
    p.add_argument('--max-age-hours', type=float, default=72)
    args = p.parse_args(argv)
    try:
        report = inspect_archive(args.archive, root=args.root, max_age_hours=args.max_age_hours)
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as exc:
        report = {'schema': SCHEMA, 'generatedAt': datetime.now(timezone.utc).isoformat(),
                  'evidenceComplete': False, 'releaseQualified': False, 'ciRunAuthenticated': False,
                  'browsers': {}, 'blockers': ['Invalid artifact: ' + str(exc)[:300]]}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    args.out.with_suffix('.html').write_text(render_html(report), encoding='utf-8')
    print('Artifact evidence:', 'COMPLETE' if report['evidenceComplete'] else 'BLOCKED')
    for s in report['blockers'][:10]: print('BLOCKER:', s)
    return 0 if report['evidenceComplete'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
