#!/usr/bin/env python3
"""Milestone 51: native Playwright browser interaction and fail-closed qualification.

Supplementary to the 18 canonical in-browser acceptance checks. This program
never substitutes simulated reports for actual browser interactions.
"""
import argparse
import json
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit
import re
from pathlib import Path
import threading
from browser_matrix import BROWSERS, Handler, Server, classify_failure, source_digest

CHECK_NAMES = (
    'Native keyboard enters and evaluates 7+8',
    'Focused text input is not hijacked by calculator shortcuts',
    'Real keypad builds and completes a fraction template',
    'File chooser restores a matrix-backed session',
    '375px viewport has no document-level horizontal overflow',
    'Native Tab navigation reaches a calculator key',
)


def validate_probe_report(report, requested=BROWSERS):
    """Check one diagnostic scope; *not* permission to approve a partial matrix.

    An approved release also requires three distinct browsers, matching checked-in
    source, fresh timestamps, and an identical origin to canonical acceptance.
    """
    if not isinstance(report, dict) or report.get('schema') != 'fx991-interaction-probe':
        return False
    if not isinstance(report.get('milestone'), int) or report['milestone'] < 50:
        return False
    if not isinstance(report.get('sourceDigest'), str) or not re.fullmatch(r'[a-f0-9]{64}', report['sourceDigest']):
        return False
    timestamp = report.get('generatedAt')
    if not isinstance(timestamp, str):
        return False
    try:
        instant = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        if instant.tzinfo is None:
            return False
    except ValueError:
        return False
    url = report.get('targetUrl')
    if not isinstance(url, str):
        return False
    try:
        parsed = urlsplit(url)
        parsed_host = parsed.hostname
    except ValueError:
        return False
    if parsed.scheme not in ('http', 'https') or not parsed_host or not parsed.path.endswith('/index.html') or parsed.username or parsed.password or parsed.fragment:
        return False
    if not isinstance(requested, (list, tuple)) or not requested or len(requested) != len(set(requested)) or any(x not in BROWSERS for x in requested):
        return False
    rows = report.get('results')
    if not isinstance(rows, list) or len(rows) != len(requested) or not all(isinstance(row, dict) for row in rows):
        return False
    if [r.get('browser') for r in rows] != list(requested):
        return False
    for row in rows:
        checks = row.get('checks')
        if row.get('status') != 'PASS' or row.get('stage') != 'complete' or not isinstance(checks, list):
            return False
        if len(checks) != len(CHECK_NAMES) or not all(isinstance(c, dict) for c in checks):
            return False
        if tuple(c.get('name') for c in checks) != CHECK_NAMES:
            return False
        if not all(c.get('status') == 'PASS' for c in checks):
            return False
    return True


def audit_probe_evidence(report, *, expected_digest, matrix_target, matrix_time, now=None, max_age_hours=72):
    """Require all native probes from the same fresh build and matrix run."""
    problems = []
    if not validate_probe_report(report, BROWSERS):
        problems.append('Native interaction evidence is missing, incomplete or failed')
        return problems
    if report['sourceDigest'] != expected_digest:
        problems.append('Native interaction fingerprint differs from this checkout')
    now = now or datetime.now(timezone.utc)
    timestamp = datetime.fromisoformat(report['generatedAt'].replace('Z', '+00:00'))
    if timestamp > now + timedelta(minutes=5):
        problems.append('Native interaction capture timestamp is in the future')
    if timestamp < now - timedelta(hours=max_age_hours):
        problems.append('Native interaction capture timestamp is stale')
    if matrix_time is None or abs((timestamp - matrix_time).total_seconds()) > 1800:
        problems.append('Native interaction capture is not within 30 minutes of canonical matrix run')
    try:
        source = urlsplit(report['targetUrl'])
        target = urlsplit(matrix_target or '')
        target_origin = target.hostname
    except ValueError:
        problems.append('Invalid canonical browser matrix target URL')
        return problems
    if not target_origin or source.scheme != target.scheme or source.netloc != target.netloc or target.path != source.path.removesuffix('/index.html') + '/tests/browser-acceptance.html':
        problems.append('Native interaction test URL does not match canonical browser matrix origin')
    return problems


def fresh_page(browser, url):
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    try:
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append('pageerror: ' + str(error)[:250]))
        page.goto(url, wait_until='load', timeout=30000)
        page.locator('#keypad button').first.wait_for(timeout=10000)
        return context, page, errors
    except Exception:
        context.close()  # A failed navigation must never leak a browser context.
        raise


def perform_check(name, page):
    if name == CHECK_NAMES[0]:
        page.locator('h1').first.click()
        page.keyboard.type('7+8')
        assert page.locator('#expression').input_value() == '7+8', 'native keyboard did not enter 7+8'
        page.keyboard.press('Enter')
        assert 'Result: 15' in page.locator('#semantic').inner_text(), 'native keyboard result mismatch'
    elif name == CHECK_NAMES[1]:
        field = page.locator('#expression')
        field.fill('9')
        field.focus()
        page.keyboard.type('+4')
        assert field.input_value() == '9+4', 'typing in an input was hijacked'
        assert 'Result: 13' not in page.locator('#semantic').inner_text(), 'input typing triggered calculation'
    elif name == CHECK_NAMES[2]:
        def key(value):
            page.get_by_role('button', name=value+' calculator key', exact=True).first.click()
        key('FRAC')
        assert 'invalid' in page.locator('#natural-preview').get_attribute('class'), 'blank fraction not invalid'
        key('1'); key('RIGHT'); key('2')
        assert 'invalid' not in page.locator('#natural-preview').get_attribute('class'), 'complete fraction invalid'
    elif name == CHECK_NAMES[3]:
        payload = page.evaluate('''() => {
          const K=window.FX991,S=window.FX991_SESSION;
          let s=K.createState();s.ui.modeMemory.matrix.A=[[1,2],[3,4]];
          for(const k of ['2','ADD','3'])s=K.dispatchKey(s,k);
          return S.exportJSON(s);
        }''')
        page.locator('#session-import').set_input_files({
            'name': 'probe-session.json',
            'mimeType': 'application/json',
            'buffer': payload.encode('utf-8')
        })
        page.wait_for_function("document.querySelector('#session-status').textContent.startsWith('Session restored')", timeout=5000)
        assert page.locator('#expression').input_value() == '2+3', 'import did not restore input'
        page.locator('#session-recovery').check()
        stored = page.evaluate('''() => {
          const S=window.FX991_SESSION;
          const json=localStorage.getItem(S.KEY);
          return json ? S.importJSON(json).ui.modeMemory.matrix.A : null;
        }''')
        assert stored == [[1,2],[3,4]], 'matrix was not stored by recovery'
        page.locator('#session-recovery').uncheck()
        assert page.evaluate('''() => !localStorage.getItem(FX991_SESSION.KEY)'''), 'recovery was not cleared'
    elif name == CHECK_NAMES[4]:
        page.set_viewport_size({'width':375,'height':812})
        page.wait_for_timeout(60)
        layout = page.evaluate('''() => ({client:document.documentElement.clientWidth,
                       scroll:document.documentElement.scrollWidth})''')
        assert layout['client'] <= 380, 'mobile viewport was not applied'
        assert layout['scroll'] <= layout['client'] + 2, f'horizontal overflow: {layout}'
    elif name == CHECK_NAMES[5]:
        page.locator('body').click(position={'x': 2, 'y': 2})
        page.evaluate('document.activeElement.blur()')
        reached = False
        for _ in range(100):
            page.keyboard.press('Tab')
            reached = page.evaluate("document.activeElement && document.activeElement.matches('#keypad button')")
            if reached: break
        assert reached, 'native Tab never reached keypad'
    else:
        raise AssertionError('unregistered check')


def run_browser(pw, name, url, out, executable=None):
    from playwright.sync_api import Error as PlaywrightError
    browser = None
    stage = 'launch'
    record = {'browser':name, 'status':'BLOCKED', 'stage':stage, 'checks':[], 'detail':''}
    try:
        options = {}
        if name == 'chromium' and executable:
            options={'executable_path':executable,'args':['--no-sandbox','--disable-dev-shm-usage']}
        browser = getattr(pw,name).launch(headless=True, **options)
        for index, check in enumerate(CHECK_NAMES, start=1):
            context = page = None
            errors = []
            stage = 'navigate'
            try:
                context,page,errors = fresh_page(browser,url)
                stage = 'interaction'
                perform_check(check,page)
                page.wait_for_timeout(20)
                assert not errors, '; '.join(errors[:3])
                record['checks'].append({'name':check,'status':'PASS','detail':''})
            except (PlaywrightError, AssertionError, TimeoutError, ValueError, OSError) as exc:
                msg = str(exc)[:600]
                status = classify_failure('navigate' if stage=='navigate' else 'execute', exc)
                record['checks'].append({'name':check,'status':status,'detail':msg})
                record['status']=status
                record['detail']=msg
                if page:
                    try:
                        page.screenshot(path=str(out/f'{name}-probe-{index}.png'), full_page=True,timeout=3000)
                    except Exception:pass
                break
            finally:
                if context:context.close()
        if len(record['checks']) == len(CHECK_NAMES) and all(r['status']=='PASS' for r in record['checks']):
            record.update(status='PASS',detail='All six native browser interactions passed',stage='complete')
    except (PlaywrightError, TimeoutError, OSError) as exc:
        record.update(status=classify_failure(stage,exc),detail=str(exc)[:600])
    finally:
        if browser:browser.close()
    record['stage'] = record.get('stage') if record['status']=='PASS' else stage
    return record


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--browsers',nargs='+',choices=BROWSERS,default=list(BROWSERS))
    ap.add_argument('--out',default='browser-evidence')
    ap.add_argument('--chromium-executable',default=None)
    ap.add_argument('--base-url',default=None,
                    help='Shared test origin for canonical and native probes')
    args=ap.parse_args(argv)
    out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
    results=[]
    with Server(('127.0.0.1',0),Handler) as server:
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        url=(args.base_url.rstrip('/') + '/index.html') if args.base_url else f'http://127.0.0.1:{server.server_address[1]}/index.html'
        try:
            try:
                from playwright.sync_api import sync_playwright
            except ImportError as exc:
                for name in args.browsers:
                    record = {'browser':name, 'status':'BLOCKED', 'stage':'launch',
                              'checks':[], 'detail':'Playwright dependency unavailable: '+str(exc)[:400]}
                    results.append(record)
                    print(name+': BLOCKED — '+record['detail'], flush=True)
            else:
                with sync_playwright() as pw:
                    for name in args.browsers:
                        result=run_browser(pw,name,url,out,args.chromium_executable)
                        results.append(result)
                        print(name+': '+result['status']+' — '+result['detail'],flush=True)
        finally:
            server.shutdown();thread.join(timeout=2)
    report={'schema':'fx991-interaction-probe','milestone':51,
            'sourceDigest':source_digest(),'generatedAt':datetime.now(timezone.utc).isoformat(),
            'targetUrl':url,'results':results}
    report['diagnosticPassed']=validate_probe_report(report,args.browsers)
    report['ready']=validate_probe_report(report,BROWSERS)
    (out/'interaction-probe.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return 0 if report['ready'] else 1

if __name__=='__main__':raise SystemExit(main())
