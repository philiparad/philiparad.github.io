"""REA-083: physical °′″ key, signed arithmetic, decimal/DMS toggle and
modifier separation across fx-991ES, PLUS and PLUS C web profiles.
Run: python calculator/reference/rea-083/test_dms_browser.py
Requires Playwright Chromium; not physical-device parity certification.
"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from contextlib import contextmanager
from functools import partial
from threading import Thread
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
@contextmanager
def serve():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield 'http://127.0.0.1:'+str(server.server_port)+'/index.html'
    finally:server.shutdown();server.server_close();thread.join(timeout=4)

def press(page,*keys):
    for key in keys:
        button=page.locator('#keys button[data-key="'+key+'"]')
        assert button.count()==1,key
        button.click()
def state(page):return page.evaluate('FreshCalculator.getState()')
def load(page,source):page.evaluate('(s)=>FreshCalculator.loadExpression(s)',source)
def result(page,number,shown=None):
    press(page,'EQUAL')
    s=state(page)
    assert s['screen']=='result',s
    assert abs(s['raw']-number)<1e-8*max(1,abs(number)),s
    if shown is not None:assert s['result']==shown,s
    return s
def type_dms(page,deg,minute,second):
    for i,part in enumerate((deg,minute,second)):
        for char in str(part):
            if char=='-':press(page,'NEG')
            elif char=='.':press(page,'DOT')
            else:press(page,char)
        press(page,'DMS')

def main():
    with serve() as url,sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1050})
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                assert page.locator('#keys button[data-key]').count()==50
                press(page,'AC')
                type_dms(page,2,20,30)
                assert state(page)['input']=='2°20′30″',state(page)
                press(page,'ADD')
                type_dms(page,0,39,30)
                s=result(page,3,'3°0′0″')
                assert s['resultDMS'],s
                press(page,'DMS')
                assert state(page)['result']=='3',state(page)
                assert state(page)['resultDMS'] is False
                press(page,'DMS')
                assert state(page)['result']=='3°0′0″',state(page)
                assert state(page)['raw']==3

                press(page,'AC')
                type_dms(page,2,15,18)
                result(page,2.255,'2°15′18″')
                press(page,'DMS')
                assert state(page)['result']=='2.255',state(page)
                press(page,'DMS')
                assert state(page)['result']=='2°15′18″',state(page)

                press(page,'AC','NEG')
                type_dms(page,2,30,0)
                result(page,-2.5,'-2°30′0″')
                press(page,'DMS')
                assert state(page)['result']=='-2.5',state(page)

                press(page,'AC')
                type_dms(page,2,30,0)
                press(page,'MUL','2')
                result(page,5,'5°0′0″')
                press(page,'AC')
                type_dms(page,2,30,0)
                press(page,'DIV','2')
                result(page,1.25,'1°15′0″')

                # Invalid input should remain invalid; no auto-inserted zeros.
                press(page,'AC','2','DMS')
                before=state(page)['input']
                press(page,'DMS')
                assert state(page)['input']==before,state(page)
                press(page,'2','0','DMS')
                assert state(page)['input']=='2°20′',state(page)
                press(page,'EQUAL')
                assert state(page)['screen']=='error',state(page)
                press(page,'AC')

                previous=state(page)['memory']
                for source in ('1°60′0″','2°0′60″','10000000°0′0″'):
                    load(page,source)
                    press(page,'EQUAL')
                    assert state(page)['screen']=='error',state(page)
                    assert state(page)['memory']==previous
                    press(page,'AC')

                # Decimal result: use the same physical key to convert to DMS.
                load(page,'2.5')
                result(page,2.5)
                press(page,'DMS')
                assert state(page)['result']=='2°30′0″',state(page)
                press(page,'DMS')
                assert state(page)['result']=='2.5',state(page)

                # Carry when 59.9999999 seconds round to next minute.
                load(page,'0°0′59.9999999″')
                result(page,59.9999999/3600,'0°1′0″')
                press(page,'AC')
                # Large degree value is not rejected due to 2^53 microsecond overflow.
                load(page,'9999999°59′59″')
                result(page,9999999+59/60+59/3600,'9999999°59′59″')
                press(page,'AC')

                # ALPHA+DMS is register B, not a literal DMS delimiter.
                press(page,'ALPHA','DMS')
                assert state(page)['input']=='B',state(page)
                press(page,'AC')
                # In COMP a SHIFT+DMS modifier is a separate result-only action.
                press(page,'SHIFT')
                assert page.locator('#keys button[data-key="DMS"]').evaluate(
                    '(b)=>b.parentElement.dataset.legendStatus')=='blocked'
                press(page,'DMS')
                assert state(page)['input']==''
                # DMS is not entered in CMPLX; the mode is preserved.
                press(page,'MODE','2')
                assert state(page)['mode']=='CMPLX'
                press(page,'2','DMS')
                assert state(page)['input']=='2'
                assert state(page)['mode']=='CMPLX'
                press(page,'MODE','1')
                assert state(page)['mode']=='COMP'
                assert not errors,errors
                print('REA-083 DMS browser',model,'PASS')
        finally:browser.close()
if __name__=='__main__':main()
