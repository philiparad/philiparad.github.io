#!/usr/bin/env python3
"""Milestone 41: evidence-grounded CI triage. No synthetic browser passes.

Examples:
 python tools/ci_diagnostics.py --matrix browser-evidence/matrix-run.json --decision release-evidence/release-decision.json --out release-evidence/ci-diagnostics.json
 python tools/ci_diagnostics.py --matrix missing.json --out diagnostics.json
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from html import escape

BROWSERS = ('chromium', 'firefox', 'webkit')
STAGES = ('launch', 'navigate', 'execute', 'capture')


def load_json(path):
    if path is None:
        return None, 'Not supplied'
    try:
        p = Path(path)
        if p.stat().st_size > 2_000_000:
            raise ValueError('Evidence exceeds 2 MB')
        return json.loads(p.read_text(encoding='utf-8')), None
    except (OSError, ValueError, UnicodeError) as exc:
        return None, f'Cannot read evidence: {exc}'


def triage(matrix=None, decision=None, *, matrix_error=None, decision_error=None):
    """Summarize actual input evidence; never convert missing evidence into PASS."""
    issues = []
    browsers = {}
    suggestions = []
    if not isinstance(matrix, dict) or matrix.get('schema') != 'fx991-browser-matrix-run':
        issues.append('Missing or invalid browser matrix' + (': ' + matrix_error if matrix_error else ''))
        rows = []
    else:
        rows = matrix.get('results')
        if not isinstance(rows, list):
            issues.append('Matrix results is not an array')
            rows = []
        if matrix.get('ready') is not True:
            issues.append('Matrix has not qualified all browsers')
    for browser in BROWSERS:
        matching = [row for row in rows if isinstance(row, dict) and row.get('browser') == browser]
        if len(matching) != 1:
            browsers[browser] = {'status': 'MISSING', 'stage': None, 'detail': 'No unique evidence row'}
            issues.append(f'{browser}: missing or duplicate evidence')
            continue
        row = matching[0]
        state = row.get('status')
        stage = row.get('stage')
        details = row.get('detail', '')
        if state not in ('PASS', 'FAIL', 'BLOCKED'):
            state = 'INVALID'
        if not isinstance(details, str):
            details = 'Invalid diagnostic value'
            state = 'INVALID'
        details = details[:500]
        if stage not in STAGES:
            stage = None
        browsers[browser] = {'status': state, 'stage': stage, 'detail': details,
                             'passed': row.get('passed') if isinstance(row.get('passed'), int) else None}
        if state != 'PASS':
            issues.append(f'{browser}: {state} at {stage or "unknown stage"}: {details}')
            if state == 'BLOCKED' and stage == 'launch':
                suggestions.append('Install Playwright and its browser binaries on the CI runner; inspect browser startup logs.')
            elif state == 'BLOCKED' and stage == 'navigate':
                suggestions.append('Verify the local HTTP server is reachable in CI; inspect network/security policy and captured screenshot.')
            elif stage == 'execute':
                suggestions.append('Review failing DOM assertions and page errors in browser-evidence; add a regression for confirmed UI defects.')
            elif stage == 'capture':
                suggestions.append('Check evidence download, JSON validation and browser/capture identity; retain screenshots.')
    if not isinstance(decision, dict) or decision.get('schema') != 'fx991-release-decision-m40':
        issues.append('Missing or invalid release decision' + (': ' + decision_error if decision_error else ''))
        release = 'UNKNOWN'
        blockers = []
    else:
        release = decision.get('status') if decision.get('status') in ('BLOCKED', 'APPROVED') else 'INVALID'
        blockers = decision.get('blockers') if isinstance(decision.get('blockers'), list) else []
        if release != 'APPROVED':
            issues.append('Release gate is not approved')
        elif any(b['status'] != 'PASS' for b in browsers.values()):
            issues.append('Release decision disagrees with incomplete browser evidence')
    ready = bool(not issues and len(rows) == 3 and all(v['status'] == 'PASS' for v in browsers.values()) and release == 'APPROVED')
    return {
        'schema': 'fx991-ci-diagnostics-m41',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'ready': ready,
        'releaseDecision': release,
        'browsers': browsers,
        'issues': issues,
        'releaseBlockers': [str(b)[:300] for b in blockers[:30]],
        'recommendedActions': list(dict.fromkeys(suggestions)) or (['Obtain fresh browser evidence from Chromium, Firefox and WebKit on the same source revision.'] if not ready else []),
        'scope': 'CI diagnostic only; does not execute browsers or certify Casio hardware equivalence.'
    }


def render_html(report):
    def e(x): return escape(str(x), quote=True)
    rows = ''.join('<tr><th scope="row">'+e(b)+'</th><td>'+e(report['browsers'][b]['status'])+'</td><td>'+e(report['browsers'][b]['stage'])+'</td><td>'+e(report['browsers'][b]['detail'])+'</td></tr>' for b in BROWSERS)
    issues = ''.join('<li>'+e(x)+'</li>' for x in report['issues']) or '<li>None</li>'
    actions = ''.join('<li>'+e(x)+'</li>' for x in report['recommendedActions']) or '<li>None</li>'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>fx-991ES CI Diagnostics</title><style>body{{font:16px/1.5 system-ui;max-width:1000px;margin:2rem auto;padding:0 1rem;color:#182d43}}table{{width:100%;border-collapse:collapse}}th,td{{border-bottom:1px solid #ccd5e0;padding:.65rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}}header{{background:#f3f6fa;padding:1rem;border-radius:.6rem}}h1{{font-size:1.8rem}}</style></head><body><header><h1>Milestone 41 CI Diagnostics</h1><p><strong>Release: {e(report['releaseDecision'])}</strong></p><p>Browser evidence qualified: <strong>{e(report['ready'])}</strong></p></header><h2>Browser results</h2><table><thead><tr><th>Browser</th><th>Status</th><th>Stage</th><th>Diagnostic</th></tr></thead><tbody>{rows}</tbody></table><h2>Issues</h2><ul>{issues}</ul><h2>Suggested next actions</h2><ul>{actions}</ul><p>Does not certify physical Casio compatibility.</p></body></html>\n'''


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--matrix', type=Path)
    p.add_argument('--decision', type=Path)
    p.add_argument('--out', type=Path, default=Path('release-evidence/ci-diagnostics.json'))
    args = p.parse_args(argv)
    matrix, m_err = load_json(args.matrix)
    decision, d_err = load_json(args.decision)
    report = triage(matrix, decision, matrix_error=m_err, decision_error=d_err)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    args.out.with_suffix('.html').write_text(render_html(report), encoding='utf-8')
    print(f"CI diagnostics: {'QUALIFIED' if report['ready'] else 'NOT QUALIFIED'}; {len(report['issues'])} issues")
    return 0 if report['ready'] else 1


if __name__ == '__main__':
    raise SystemExit(main())