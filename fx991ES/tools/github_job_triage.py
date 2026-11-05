#!/usr/bin/env python3
"""Milestone 47: non-approving GitHub Actions job/step triage.

GitHub job metadata is useful even when browser artifact upload never occurred.
This tool NEVER emits browserQualified or release approval; only verified browser
captures reviewed by the existing separate release gate can do so.
"""
import argparse
from datetime import datetime, timezone
import html
import json
import os
from pathlib import Path
import re
import urllib.error
from urllib.parse import quote

from actions_run_collector import github_request, validate_identity, validate_run

SCHEMA = 'fx991-github-job-triage-m47'
MAX_JOBS = 100
MAX_STEPS = 100
STATES = {'queued', 'in_progress', 'completed', 'waiting', 'requested', 'pending'}
CONCLUSIONS = {'success', 'failure', 'cancelled', 'skipped', 'timed_out', 'action_required', 'neutral', 'stale', None}


def safe_text(value, limit=180):
    """Bound untrusted GitHub-provided labels; never include control characters."""
    if not isinstance(value, str):
        return ''
    return re.sub(r'[\x00-\x1f\x7f]', ' ', value)[:limit]


def normalize_jobs(payload, *, run_id):
    if not isinstance(payload, dict) or not isinstance(payload.get('jobs'), list):
        raise ValueError('Malformed GitHub job listing')
    raw = payload['jobs']
    count = payload.get('total_count', len(raw))
    if not isinstance(count, int) or isinstance(count, bool) or count < 0 or count > MAX_JOBS or len(raw) > MAX_JOBS or count != len(raw):
        raise ValueError('Incomplete or excessive workflow job listing; cannot safely triage')
    results = []
    ids = set()
    for j in raw:
        if not isinstance(j, dict) or not isinstance(j.get('id'), int) or isinstance(j.get('id'), bool) or j['id'] <= 0:
            raise ValueError('Invalid job identifier')
        if j['id'] in ids:
            raise ValueError('Duplicate job identifier')
        ids.add(j['id'])
        if j.get('run_id') != run_id:
            raise ValueError('Job belongs to another workflow run')
        if j.get('status') not in STATES or j.get('conclusion') not in CONCLUSIONS:
            raise ValueError('Invalid job execution state')
        steps = j.get('steps')
        if not isinstance(steps, list) or len(steps) > MAX_STEPS:
            raise ValueError('Incomplete or oversized job step listing')
        seen = set()
        normalized_steps = []
        for s in steps:
            if not isinstance(s, dict) or not isinstance(s.get('number'), int) or isinstance(s.get('number'), bool) or s['number'] < 1:
                raise ValueError('Invalid job step number')
            if s['number'] in seen:
                raise ValueError('Duplicate job step number')
            seen.add(s['number'])
            if s.get('status') not in STATES or s.get('conclusion') not in CONCLUSIONS:
                raise ValueError('Invalid job step state')
            normalized_steps.append({'number': s['number'], 'name':safe_text(s.get('name')),
                                     'status':s.get('status'),'conclusion':s.get('conclusion')})
        results.append({'id':j['id'],'name':safe_text(j.get('name')),
                        'status':j['status'],'conclusion':j.get('conclusion'),
                        'steps':sorted(normalized_steps,key=lambda s:s['number'])})
    return sorted(results,key=lambda j:j['id'])


def diagnose(repo, sha, run_id, *, fetch=github_request, token=None):
    validate_identity(repo, sha)
    if not isinstance(run_id, int) or isinstance(run_id, bool) or run_id <= 0:
        raise ValueError('Run ID must be positive')
    base='https://api.github.com/repos/'+repo
    run=validate_run(fetch(f'{base}/actions/runs/{run_id}',token=token),repo,sha,
                     run_id=run_id,diagnose_failed=True)
    payload=fetch(f'{base}/actions/runs/{run_id}/jobs?filter=latest&per_page={MAX_JOBS}',token=token)
    jobs=normalize_jobs(payload,run_id=run_id)
    blockers=[]
    if run.get('conclusion')!='success':
        blockers.append('Workflow conclusion: '+safe_text(run.get('conclusion')))
    if not jobs:
        blockers.append('No jobs returned for the selected run')
    for job in jobs:
        if job['conclusion'] not in ('success','skipped'):
            blockers.append('Job '+str(job['id'])+' ('+job['name']+'): '+str(job['conclusion']))
        for step in job['steps']:
            if step['conclusion'] in ('failure','cancelled','timed_out','action_required'):
                blockers.append('Failed step '+str(step['number'])+' in job '+str(job['id'])+': '+step['name'])
    if not token:
        blockers.append('GitHub API token absent; informational metadata only')
    return {'schema':SCHEMA,'generatedAt':datetime.now(timezone.utc).isoformat(),
            'repository':repo,'headSha':sha.lower(),'runId':run_id,
            'runUrl':f'https://github.com/{quote(repo,safe="/")}/actions/runs/{run_id}',
            'workflowConclusion':run.get('conclusion'),
            'jobCount':len(jobs),'jobs':jobs,'issues':blockers,
            'browserQualified':False,
            'note':'Diagnostic job metadata only; no browser execution or physical Casio certification.'}


def as_markdown(report):
    esc=lambda s:html.escape(safe_text(s,300).replace('|','\\|').replace('`','\\`'))
    lines=['## GitHub Actions job triage — Milestone 47','',
           '**Workflow:** '+esc(report.get('workflowConclusion') or 'unknown'),
           '**Release decision:** NOT EVALUATED (this tool cannot approve)','',
           '| Job | Result | Failed steps |','|---|---|---|']
    for j in report.get('jobs',[]):
        failed=[s['name'] for s in j['steps'] if s['conclusion'] in ('failure','cancelled','timed_out','action_required')]
        lines.append('| '+esc(j['name'])+' | '+esc(j['conclusion'] or 'unknown')+' | '+esc('; '.join(failed) or '—')+' |')
    lines.extend(['','### Diagnostic issues',''])
    lines.extend('- '+esc(i) for i in report.get('issues',[]))
    if not report.get('issues'):
        lines.append('- No failed GitHub job or step identified (browser acceptance still requires separate evidence)')
    lines.extend(['','_Job metadata is not browser acceptance evidence and cannot approve a release._',''])
    return '\n'.join(lines)


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--repo',required=True)
    p.add_argument('--sha',required=True)
    p.add_argument('--run-id',required=True,type=int)
    p.add_argument('--out',type=Path,default=Path('release-evidence/github-actions/job-triage.json'))
    p.add_argument('--markdown',type=Path,default=Path('release-evidence/github-actions/job-triage.md'))
    args=p.parse_args(argv)
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.markdown.parent.mkdir(parents=True,exist_ok=True)
    try:
        result=diagnose(args.repo,args.sha,args.run_id,token=os.getenv('GITHUB_TOKEN'))
    except (ValueError,TypeError,OSError,KeyError,TimeoutError,urllib.error.URLError) as exc:
        result={'schema':SCHEMA,'browserQualified':False,'jobs':[],
                'workflowConclusion':'unknown','issues':['Job metadata unavailable: '+type(exc).__name__+': '+safe_text(str(exc))],
                'note':'No release approval; diagnostic retrieval failed.'}
    args.out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    args.markdown.write_text(as_markdown(result),encoding='utf-8')
    print('GitHub Actions job triage:',len(result.get('jobs',[])),'jobs,',len(result.get('issues',[])),'issues')
    return 0 if result.get('jobs') else 1


if __name__=='__main__':
    raise SystemExit(main())
