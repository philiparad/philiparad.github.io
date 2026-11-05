#!/usr/bin/env python3
"""Render a strict, non-approving GitHub Actions browser matrix summary.

This is a presentation layer only; it never changes any release qualification.
Missing/corrupt input is reported as BLOCKED, never PASS.
"""
import argparse
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
from browser_matrix import BROWSERS, REQUIRED_CHECKS, EXPECTED_NAMES

SCHEMA='fx991-ci-matrix-summary-m45'
GOOD={'PASS','FAIL','BLOCKED'}

def summarize(matrix):
    blockers=[]
    if not isinstance(matrix,dict) or matrix.get('schema')!='fx991-browser-matrix-run':
        matrix={}
        blockers.append('Missing or invalid browser matrix')
    rows=matrix.get('results')
    if not isinstance(rows,list):
        rows=[]
        blockers.append('Matrix has no browser results')
    found={}
    for row in rows:
        if not isinstance(row,dict) or row.get('browser') not in BROWSERS:
            blockers.append('Invalid browser result entry')
            continue
        browser=row['browser']
        if browser in found:
            blockers.append('Duplicate result for '+browser)
        else:
            found[browser]=row
    browsers=[]
    for browser in BROWSERS:
        entry=found.get(browser)
        if not entry:
            browsers.append(dict(browser=browser,status='BLOCKED',stage='not-run',passed=0,detail='No browser result produced',failures=[]))
            blockers.append('No '+browser+' evidence')
            continue
        status=entry.get('status')
        if status not in GOOD:status='BLOCKED';blockers.append('Malformed status for '+browser)
        stage=entry.get('stage')
        stage=stage if isinstance(stage,str) and stage in ('launch','navigate','execute','capture') else 'unknown'
        passed=entry.get('passed')
        if type(passed)!=int or not 0<=passed<=REQUIRED_CHECKS:
            passed=0;blockers.append('Invalid check count for '+browser)
        failures=[]
        capture=entry.get('capture')
        names=entry.get('names')
        if status=='PASS' and (passed!=REQUIRED_CHECKS or names!=list(EXPECTED_NAMES) or not isinstance(capture,str)):
            status='BLOCKED'
            blockers.append('Unsupported PASS claim for '+browser)
        detail=entry.get('detail')
        if not isinstance(detail,str):detail='Invalid or absent diagnostic'
        detail=detail[:500]
        errs=entry.get('errors')
        if isinstance(errs,list):
            failures=[str(x)[:300] for x in errs if isinstance(x,str)][:5]
        if status=='PASS' and failures:
            status='BLOCKED'
            blockers.append('Reported JavaScript or console errors for '+browser)
        browsers.append(dict(browser=browser,status=status,stage=stage,passed=passed,detail=detail,failures=failures))
        if status!='PASS':blockers.append(browser+' '+status+': '+detail)
    # Matrix's own ready value is not sufficient: status must agree with each engine.
    ready=(not blockers and matrix.get('ready') is True and
           len(rows)==len(BROWSERS) and all(x['status']=='PASS' for x in browsers))
    if not ready and not blockers:blockers.append('Matrix did not explicitly certify all three engines')
    return {'schema':SCHEMA,'generatedAt':datetime.now(timezone.utc).isoformat(),
            'browserQualified':bool(ready),'browsers':browsers,'blockers':blockers,
            'note':'Diagnostic summary only. Physical CASIO compatibility is not certified.'}


def markdown(report):
    def clean(value):
        # Escape Markdown special chars, HTML, line breaks and bidirectional controls.
        s=str(value).replace('\r',' ').replace('\n',' ')
        s=''.join(ch for ch in s if ch.isprintable() and ch not in '\u202a\u202b\u202c\u202d\u202e')
        return html.escape(re.sub(r'([\\|`*_\[\]])',r'\\\1',s))
    lines=['## Calculator browser matrix — Milestone 45','',
           '**Browser qualification: '+('PASS' if report.get('browserQualified') else 'BLOCKED')+'**','',
           '| Engine | Status | Stage | Checks | Diagnostic |','|---|---|---|---:|---|']
    for r in report.get('browsers',[]):
        lines.append('| '+' | '.join([clean(r.get('browser')),clean(r.get('status')),
                      clean(r.get('stage')),clean(str(r.get('passed'))+'/'+str(REQUIRED_CHECKS)),
                      clean(r.get('detail'))])+' |')
    lines.extend(['','### Blocking issues',''])
    for item in report.get('blockers',[])[:25]:lines.append('- '+clean(item))
    if not report.get('blockers'):lines.append('No blockers in the provided matrix; authenticate source provenance separately.')
    lines.extend(['','_This summary does not attest physical Casio compatibility or substitute for the authenticated GitHub artifact collector._',''])
    return '\n'.join(lines)


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--matrix',type=Path,default=Path('browser-evidence/matrix-run.json'))
    p.add_argument('--out',type=Path,default=Path('release-evidence/ci-matrix-summary.json'))
    p.add_argument('--markdown',type=Path,default=Path('release-evidence/ci-matrix-summary.md'))
    args=p.parse_args(argv)
    try:
        matrix=json.loads(args.matrix.read_text(encoding='utf-8'))
    except (OSError,UnicodeError,json.JSONDecodeError):matrix=None
    report=summarize(matrix)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    args.markdown.parent.mkdir(parents=True,exist_ok=True)
    args.markdown.write_text(markdown(report),encoding='utf-8')
    print('CI MATRIX:', 'PASS' if report['browserQualified'] else 'BLOCKED')
    return 0 if report['browserQualified'] else 1

if __name__=='__main__':raise SystemExit(main())
