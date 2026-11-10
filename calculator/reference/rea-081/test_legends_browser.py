"""REA-081 physical DOM button/legend context regression for three models.
Run: python calculator/reference/rea-081/test_legends_browser.py
Requires playwright Chromium. This verifies the web app, not native firmware.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
from contextlib import contextmanager
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Silent(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
@contextmanager
def serve():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Silent,directory=str(ROOT)))
    t=Thread(target=server.serve_forever,daemon=True);t.start()
    try: yield 'http://127.0.0.1:'+str(server.server_port)+'/index.html'
    finally: server.shutdown();server.server_close();t.join(timeout=4)
def key(page,name):
    q=page.locator('#keys button[data-key="'+name+'"]')
    assert q.count()==1,name
    q.click()
def press(page,*keys):
    for k in keys:key(page,k)
def state(page):return page.evaluate('FreshCalculator.getState()')
def legend(page,keyid):
    return page.locator('#keys button[data-key="'+keyid+'"]').evaluate(
        '(el)=>({status:el.parentElement.dataset.legendStatus,description:el.getAttribute("aria-description")})')
def main():
    with serve() as url,sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1120,'height':1000})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                assert page.locator('#keys button[data-key]').count()==50
                page.evaluate("FreshCalculator.loadExpression('7')")
                base=state(page)
                # On the original model the E/F register legend is absent.
                press(page,'ALPHA')
                expected='unlabelled' if model=='fx-991es' else 'available'
                assert legend(page,'COS')['status']==expected,legend(page,'COS')
                if model=='fx-991es':
                    press(page,'COS')
                    s=state(page)
                    assert s['input']==base['input'],s
                    assert s['alpha'] is False,s
                else:
                    press(page,'COS')
                    assert state(page)['input'].endswith('E')
                press(page,'AC')
                # Modifier availability follows screen changes, not just model.
                press(page,'SHIFT')
                assert legend(page,'INTEGRAL')['status']=='available'
                press(page,'INTEGRAL')
                s=state(page)
                assert s['editor']['root'][0]['type']=='derivative',s
                press(page,'AC')
                # Blank shift 6 on the original/PLUS must not change mode.
                press(page,'SHIFT')
                expected='available' if model=='fx-991es-plus-c' else 'unlabelled'
                assert legend(page,'6')['status']==expected,legend(page,'6')
                if model!='fx-991es-plus-c':
                    old=state(page)
                    press(page,'6')
                    s=state(page)
                    assert s['mode']==old['mode'] and s['input']==old['input'],s
                else:
                    press(page,'AC')
                # Normal ENG is i in CMPLX. ALPHA+ENG must be colon.
                press(page,'MODE','2')
                assert state(page)['mode']=='CMPLX',state(page)
                page.evaluate("FreshCalculator.loadExpression('1')")
                press(page,'ENG')
                assert state(page)['input']=='1i',state(page)
                press(page,'ALPHA')
                assert legend(page,'ENG')['status']=='available'
                press(page,'ENG')
                assert state(page)['input']=='1i:',state(page)
                press(page,'AC')
                # SOLVE is COMP only, and SHIFT+CALC is marked unavailable.
                press(page,'SHIFT')
                assert legend(page,'CALC')['status']=='blocked',legend(page,'CALC')
                old=state(page)
                press(page,'CALC')
                s=state(page)
                assert s['mode']=='CMPLX' and s['screen']=='edit',s
                assert s['input']==old['input']
                # Edit/result contexts differ for result-only SHIFT+SD.
                press(page,'MODE','1')
                page.evaluate("FreshCalculator.loadExpression('1/2')")
                press(page,'SHIFT')
                assert legend(page,'SD')['status']=='blocked'
                press(page,'SD')
                assert state(page)['screen']=='edit',state(page)
                press(page,'EQUAL')
                assert state(page)['screen']=='result',state(page)
                press(page,'SHIFT')
                assert legend(page,'SD')['status']=='available'
                press(page,'AC')
                # The export inventory includes every mode, screen and legend.
                dims=page.evaluate("""() => {
                    const data=FreshLegendAudit.inventory(FreshKeypad,FreshModels);
                    return {length:data.length,unique:new Set(data.map(x=>
                        [x.model,x.key,x.modifier,x.mode,x.screen].join('|'))).size};
                }""")
                assert dims['length']==34650 and dims['unique']==34650,dims
                assert not errors,errors
                print('REA-081 modifier+legend browser',model,'PASS')
        finally:browser.close()
if __name__=='__main__':main()
