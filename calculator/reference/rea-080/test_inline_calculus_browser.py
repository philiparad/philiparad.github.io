"""REA-080 — MathIO/LineIO calculus via physical calculator DOM keys.
Run: python calculator/reference/rea-080/test_inline_calculus_browser.py
Requires playwright and Chromium. HTTP server is used so numeric Worker and
importScripts execute with a valid same-origin URL, not a file:// restriction.
This does not verify physical CASIO LCD/firmware parity.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from contextlib import contextmanager
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

@contextmanager
def serve():
    server=ThreadingHTTPServer(('127.0.0.1',0),
        partial(SilentHandler,directory=str(ROOT)))
    thread=Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:
        yield 'http://127.0.0.1:'+str(server.server_port)+'/index.html'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=4)

def state(page):
    return page.evaluate('FreshCalculator.getState()')

def press(page,*keys):
    for key in keys:
        btn=page.locator('#keys button[data-key="'+key+'"]')
        assert btn.count()==1,key
        btn.click()

def done(page):
    page.wait_for_function("FreshCalculator.getState().screen !== 'calculating'",
        timeout=12000)
    return state(page)

def approx(value,expected,tolerance=1e-5):
    assert abs(value-expected)<=tolerance*max(1,abs(expected)),(value,expected)

def put_x_squared(page):
    press(page,'ALPHA','LP','SQUARE')

def main():
    with serve() as url, sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1120,'height':1040})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                assert page.locator('#keys button[data-key]').count()==50

                # Physical ∫ key inserts a structured MathIO field tree.
                press(page,'INTEGRAL')
                s=state(page)
                assert s['screen']=='edit' and s['editor']['root'][0]['type']=='integral',s
                assert s['editor']['path'][-1]['field']=='expression',s
                put_x_squared(page)
                press(page,'RIGHT','0','RIGHT','2')
                s=state(page)
                assert s['input']=='Integral(X^2,0,2)',s
                assert s['editor']['path'][-1]['field']=='upper',s
                press(page,'EQUAL')
                s=done(page)
                assert s['screen']=='result',s
                approx(s['raw'],8/3)
                press(page,'AC')

                # SHIFT ∫ builds derivative with an editable evaluation point.
                press(page,'SHIFT','INTEGRAL')
                assert state(page)['editor']['root'][0]['type']=='derivative'
                put_x_squared(page)
                press(page,'RIGHT','3','EQUAL')
                s=done(page)
                assert s['screen']=='result',s
                approx(s['raw'],6)
                press(page,'AC')

                # SHIFT log-base is the physical sigma key.
                press(page,'SHIFT','LOGBASE')
                assert state(page)['editor']['root'][0]['type']=='summation'
                put_x_squared(page)
                press(page,'RIGHT','0','RIGHT','2','EQUAL')
                s=done(page)
                assert s['screen']=='result',s
                approx(s['raw'],5)
                press(page,'AC')

                # Incomplete inline bounds are an error, never a zero default.
                previous=dict(state(page)['memory'])
                press(page,'INTEGRAL')
                put_x_squared(page)
                press(page,'EQUAL')
                s=state(page)
                assert s['screen']=='error' and s['memory']==previous,s
                press(page,'AC')

                # LineIO uses a compact horizontal representation, but keeps
                # the same editable slots and worker math.
                press(page,'SHIFT','MODE','2')
                assert state(page)['math'] is False,state(page)
                press(page,'INTEGRAL')
                assert state(page)['editor']['root'][0]['type']=='integral'
                put_x_squared(page)
                press(page,'RIGHT','0','RIGHT','1','EQUAL')
                s=done(page)
                assert s['screen']=='result' and s['math'] is False,s
                approx(s['raw'],1/3)
                press(page,'AC')

                # Optional tolerance can be entered in a linear expression.
                page.evaluate("FreshCalculator.loadExpression('Integral(X^2,0,1,1E-7)')")
                press(page,'EQUAL')
                approx(done(page)['raw'],1/3)
                press(page,'AC')
                page.evaluate("FreshCalculator.loadExpression('Diff(X^2,2,1E-16)')")
                press(page,'EQUAL')
                s=done(page)
                assert s['screen']=='error',s
                press(page,'AC')

                # Domain errors do not commit memory or Ans.
                original=state(page)
                page.evaluate("FreshCalculator.loadExpression('Integral(1/(X-1),0,2)')")
                press(page,'EQUAL')
                s=done(page)
                assert s['screen']=='error',s
                assert s['memory']==original['memory'] and s['ans']==original['ans'],s
                press(page,'AC')

                # Immediately cancel a still-running worker on the same UI
                # turn; a stale worker reply may never mutate the result.
                page.evaluate("FreshCalculator.loadExpression('Integral(X^2,0,1000000)')")
                before=state(page)
                page.evaluate("""() => {
                    document.querySelector('#keys button[data-key="EQUAL"]').click();
                    document.querySelector('#keys button[data-key="AC"]').click();
                }""")
                s=state(page)
                assert s['screen']=='edit',s
                assert s['memory']==before['memory'] and s['ans']==before['ans'],s
                page.wait_for_timeout(120)
                assert state(page)['screen']=='edit',state(page)

                # ALPHA+integral remains its separate product command;
                # SHIFT+log and plain log-base keep their distinct routes.
                press(page,'SHIFT','MODE','1','1')
                assert state(page)['math'] and state(page)['outputMath']
                assert not errors,errors
                print('REA-080 browser calculus',model,'PASS')
        finally:
            browser.close()

if __name__=='__main__':
    main()
