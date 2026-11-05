#!/usr/bin/env python3
"""Milestone 40: trustworthy, human-readable release decision from the existing gate.

No browser tests are simulated. Approval requires real evidence checked by release_gate.
The HTML output uses only escaped text, never inline imported markup or scripts.
"""
import argparse
from datetime import datetime, timezone
from html import escape
import json
from pathlib import Path
from release_gate import qualify, audit_manifest

SCHEMA = 'fx991-release-decision-m40'


def decision(root, evidence=None, *, now=None, max_age_hours=72):
    gate = qualify(root, evidence, now=now, max_age_hours=max_age_hours)
    return {
        'schema': SCHEMA,
        'milestone': 40,
        'generatedAt': gate['generatedAt'],
        'status': 'APPROVED' if gate['ready'] else 'BLOCKED',
        'qualified': bool(gate['ready']),
        'requirements': {
            'sourceManifest': gate['sourceIntegrity'],
            'browserMatrix': gate['browserEvidence'],
            'nativeInteractions': gate.get('nativeInteractions', 'MISSING'),
            'chromium': gate.get('browserResults', {}).get('chromium', 'MISSING'),
            'firefox': gate.get('browserResults', {}).get('firefox', 'MISSING'),
            'webkit': gate.get('browserResults', {}).get('webkit', 'MISSING'),
            'physicalCasio': 'UNVERIFIED'
        },
        'blockers': list(gate['blockers']),
        'scope': 'Browser release only. Never certifies physical Casio equivalence.',
    }


def render_html(result):
    """Produce a static report that is safe even if diagnostics contain hostile HTML."""
    if not isinstance(result, dict) or result.get('schema') != SCHEMA:
        raise ValueError('Invalid release decision')
    requirements = result.get('requirements', {})
    fields = [('Source manifest', 'sourceManifest'), ('Browser matrix', 'browserMatrix'),
              ('Six native interaction checks per browser', 'nativeInteractions'),
              ('Chromium', 'chromium'), ('Firefox', 'firefox'), ('WebKit', 'webkit'),
              ('Physical Casio compatibility', 'physicalCasio')]
    def safe(x):
        return escape(str(x), quote=True)
    rows = ''.join(f'<tr><th scope="row">{safe(label)}</th><td>{safe(requirements.get(key,"MISSING"))}</td></tr>'
                   for label,key in fields)
    blockers = ''.join(f'<li>{safe(text)}</li>' for text in result.get('blockers', [])) or '<li>None</li>'
    status = safe(result.get('status', 'BLOCKED'))
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>fx-991ES Release Decision — Milestone 40</title>
<style>body{{font:16px/1.5 system-ui,sans-serif;max-width:850px;margin:32px auto;padding:0 20px;color:#172432}}
header{{padding:20px;border:2px solid #56687c;border-radius:12px;background:#f2f5fa}}
table{{border-collapse:collapse;width:100%}}td,th{{border-bottom:1px solid #bfcbd8;padding:10px;text-align:left}}
li{{margin:8px 0}}.note{{color:#42546a}}h1{{font-size:1.7rem}}h2{{font-size:1.3rem}}</style></head>
<body><header><h1>fx-991ES Release Decision</h1><p><strong>Result: {status}</strong></p>
<p>Generated: {safe(result.get('generatedAt','unknown'))}</p></header>
<h2>Qualification requirements</h2><table>{rows}</table>
<h2>Blockers</h2><ul>{blockers}</ul>
<p class="note">{safe(result.get('scope',''))}</p>
<p class="note">A locally generated report is diagnostic only. Independent browser evidence and a trusted CI execution are required for release approval.</p></body></html>\n'''


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    p.add_argument('--evidence',type=Path,default=None)
    p.add_argument('--out',type=Path,default=Path('release-evidence'))
    p.add_argument('--max-age-hours',type=float,default=72)
    args=p.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    result=decision(args.root,args.evidence,max_age_hours=args.max_age_hours)
    (args.out/'release-decision.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (args.out/'release-decision.html').write_text(render_html(result),encoding='utf-8')
    print(f"Milestone 40 release decision: {result['status']}")
    for item in result['blockers']:
        print('BLOCKER:',item)
    return 0 if result['qualified'] else 1

if __name__=='__main__':
    raise SystemExit(main())
