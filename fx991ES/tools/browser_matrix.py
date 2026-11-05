#!/usr/bin/env python3
"""Run calculator DOM acceptance in actual browsers; fail closed on incomplete evidence.

Development/CI only (Python + Playwright); calculator runtime is static HTML/CSS/JS.
"""
import argparse
import http.server
import json
from pathlib import Path
import socketserver
import threading
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
BROWSERS = ('chromium', 'firefox', 'webkit')
REQUIRED_CHECKS = 18
# Canonical release checklist: reports may not silently replace or reorder assertions.
EXPECTED_NAMES = (
    'Calculator boots without JavaScript exceptions',
    'Keypad controls are accessible and keyboard focusable',
    'LCD canvas is 96 × 31 and has a description',
    'Physical-key clicks calculate 2+3=5',
    'Typing in the input field calculates implicit multiplication',
    'Document keyboard shortcuts evaluate input',
    'Both calculator editions switch without resetting into an invalid mode',
    'Angle and format selectors update the screen',
    'Natural display editor preserves structural templates',
    'Session v2 serializes structured cursor and imports safely',
    'Recovery remains opt-in on a fresh isolated session',
    'Browser viewport has no horizontal page overflow at narrow width',
    'Visible input and selectors have programmatic labels',
    'Keyboard-only focus can reach the first calculator key',
    'Session export/import retains a nontrivial matrix register',
    'Focus indicator CSS is present for keyboard access',
    'Long input remains a bounded accessible control',
    'Calculator regression suite passes in browser context',
)
SCHEMA = 'fx991-browser-acceptance'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def check_capture(raw, browser):
    """Validate evidence emitted by a browser rather than trusting its page status."""
    if not isinstance(raw, dict) or raw.get('schema') != SCHEMA:
        raise ValueError('Invalid browser evidence schema')
    if not isinstance(raw.get('milestone'), int) or raw['milestone'] < 31:
        raise ValueError('Invalid browser evidence version')
    if not isinstance(raw.get('userAgent'), str) or not raw['userAgent']:
        raise ValueError('Missing real browser userAgent')
    ua = raw['userAgent'].lower()
    if browser == 'firefox' and 'firefox/' not in ua:
        raise ValueError('Firefox evidence not captured in Firefox')
    if browser == 'chromium' and not any(s in ua for s in ('chrome/', 'chromium/', 'edg/')):
        raise ValueError('Chromium evidence not captured in Chromium')
    if browser == 'webkit' and not ('applewebkit/' in ua and 'chrome/' not in ua and 'chromium/' not in ua):
        raise ValueError('WebKit evidence not captured in WebKit')
    rows = raw.get('results')
    if not isinstance(rows, list) or len(rows) != REQUIRED_CHECKS:
        raise ValueError(f'Expected {REQUIRED_CHECKS} browser checks; got {len(rows) if isinstance(rows, list) else "invalid"}')
    names = []
    for i, row in enumerate(rows):
        if not isinstance(row, dict) or not isinstance(row.get('name'), str) or not row['name'].strip():
            raise ValueError(f'Invalid check name at position {i}')
        if row.get('status') not in ('PASS', 'FAIL', 'BLOCKED'):
            raise ValueError(f'Invalid check status at position {i}')
        names.append(row['name'])
    if len(names) != len(set(names)):
        raise ValueError('Duplicate browser checks in evidence')
    if tuple(names) != EXPECTED_NAMES:
        raise ValueError('Browser acceptance check names or order do not match the release manifest')
    return names, sum(r['status'] == 'PASS' for r in rows)


def aggregate(results):
    """Return a release-gate result; incomplete/blocked browsers always fail."""
    valid = len(results) == len(BROWSERS) and {r['browser'] for r in results} == set(BROWSERS)
    valid = valid and all(r['status'] == 'PASS' for r in results)
    captures = [r.get('names') for r in results if r.get('names')]
    names_match = len(captures) == len(BROWSERS) and all(tuple(x) == EXPECTED_NAMES for x in captures)
    return bool(valid and names_match)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browsers', nargs='+', choices=BROWSERS, default=list(BROWSERS))
    parser.add_argument('--out', default='browser-evidence')
    parser.add_argument('--timeout', type=int, default=150)
    parser.add_argument('--base-url', default=None, help='Optional test origin; default serves this checkout via localhost')
    parser.add_argument('--chromium-executable', default=None,
                        help='Optional local Chromium path when Playwright browsers are unavailable')
    args = parser.parse_args(argv)
    out = Path(args.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    results = []
    with Server(('127.0.0.1', 0), Handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = (args.base_url.rstrip('/') + '/tests/browser-acceptance.html') if args.base_url else f'http://127.0.0.1:{server.server_address[1]}/tests/browser-acceptance.html'
        try:
            from playwright.sync_api import sync_playwright, Error as PlaywrightError
            with sync_playwright() as p:
                for browser_name in args.browsers:
                    browser = None
                    page = None
                    errors = []
                    evidence = dict(browser=browser_name, status='BLOCKED', detail='Not started',
                                    capture=None, names=[], passed=0, errors=[])
                    try:
                        kw = {}
                        if browser_name == 'chromium' and args.chromium_executable:
                            kw.update(executable_path=args.chromium_executable,
                                      args=['--no-sandbox', '--disable-dev-shm-usage'])
                        browser = getattr(p, browser_name).launch(headless=True, **kw)
                        context = browser.new_context(viewport={'width':1280,'height':900}, accept_downloads=True)
                        page = context.new_page()
                        page.on('pageerror', lambda err: errors.append('pageerror: '+str(err)[:500]))
                        page.on('console', lambda msg: errors.append('console: '+msg.text[:500]) if msg.type == 'error' else None)
                        page.goto(url, wait_until='domcontentloaded', timeout=30000)
                        page.wait_for_function("['passed','failed','blocked'].includes(document.body.dataset.acceptance)",
                                               timeout=args.timeout * 1000)
                        with page.expect_download(timeout=15000) as info:
                            page.locator('#download').click()
                        destination = out / f'{browser_name}-acceptance.json'
                        info.value.save_as(destination)
                        capture = json.loads(destination.read_text(encoding='utf-8'))
                        names, passed = check_capture(capture, browser_name)
                        if args.base_url and not capture.get('location', '').startswith(args.base_url.rstrip('/') + '/'):
                            raise ValueError('Captured origin does not match the configured test origin')
                        evidence.update(capture=str(destination), names=names, passed=passed)
                        evidence['status'] = 'PASS' if passed == REQUIRED_CHECKS and not errors else 'FAIL'
                        evidence['detail'] = f'{passed}/{REQUIRED_CHECKS} passed; {len(errors)} script/console errors'
                    except (PlaywrightError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as e:
                        msg = str(e)[:700]
                        infrastructure = any(s in msg.lower() for s in
                                             ('executable doesn\'t exist','err_blocked_by_administrator',
                                              'browser has been closed', 'net::err_', 'timeout'))
                        evidence.update(status='BLOCKED' if infrastructure else 'FAIL', detail=msg)
                    finally:
                        evidence['errors'] = errors[:20]
                        if page:
                            try:
                                (out / f'{browser_name}-screenshot.png').write_bytes(page.screenshot(full_page=True, timeout=5000))
                            except Exception:
                                pass
                        if browser:
                            browser.close()
                    results.append(evidence)
                    print(f'{browser_name}: {evidence["status"]} — {evidence["detail"]}', flush=True)
        finally:
            server.shutdown()
            thread.join(timeout=2)
    ready = aggregate(results)
    summary = {'schema':'fx991-browser-matrix-run', 'milestone':35,
               'generatedAt':datetime.now(timezone.utc).isoformat(), 'results':results,
               'ready':ready, 'note':'Browser checks do not certify physical Casio compatibility.'}
    (out / 'matrix-run.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    return 0 if ready else 1


if __name__ == '__main__':
    raise SystemExit(main())