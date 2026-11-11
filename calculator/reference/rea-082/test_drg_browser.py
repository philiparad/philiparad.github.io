"""REA-082: physical SHIFT+ANS DRG▶, inline °/r/g suffix and setup tests.
Run: python calculator/reference/rea-082/test_drg_browser.py
Requires Playwright Chromium. This tests the independent web model, not CASIO firmware.
"""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
@contextmanager
def server():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
    thread=Thread(target=http.serve_forever,daemon=True);thread.start()
    try: yield 'http://127.0.0.1:'+str(http.server_port)+'/index.html'
    finally: http.shutdown();http.server_close();thread.join(timeout=4)

def press(page,*keys):
    for key in keys:
        button=page.locator('#keys button[data-key="'+key+'"]')
        assert button.count()==1,key
        button.click()

def state(page): return page.evaluate('FreshCalculator.getState()')
def near(value,want):
    assert abs(value-want)<2e-8*max(1,abs(want)),(value,want)

def drg(page,choice):
    press(page,'SHIFT','ANS')
    s=state(page)
    assert s['screen']=='menu' and 'DRG' in s['menuTitle'],s
    assert len(s['menu'])==3,s
    press(page,choice)
    assert state(page)['screen']=='edit',state(page)

def load(page,text):
    page.evaluate('(t)=>FreshCalculator.loadExpression(t)',text)

def check_result(page,want,angle):
    press(page,'EQUAL')
    s=state(page)
    assert s['screen']=='result',s
    near(s['raw'],want)
    assert s['angle']==angle,s
    return s

def set_angle(page,key,unit):
    press(page,'SHIFT','MODE',key)
    assert state(page)['angle']==unit,state(page)

def main():
    import math
    with server() as url,sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1020})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                assert state(page)['mode']=='COMP'
                assert page.locator('#keys button[data-key]').count()==50
                for key,unit,scale in [('3','DEG',180/math.pi),
                                       ('4','RAD',1),('5','GRAD',200/math.pi)]:
                    set_angle(page,key,unit)
                    press(page,'AC','LP','SHIFT','EXP','DIV','2','RP')
                    drg(page,'2')
                    s=state(page)
                    assert s['input']=='(pi/2)r',s
                    check_result(page,math.pi/2*scale,unit)
                    press(page,'AC','5','0')
                    drg(page,'3')
                    assert state(page)['input']=='50g'
                    check_result(page,math.pi/4*scale,unit)
                    press(page,'AC','9','0')
                    drg(page,'1')
                    assert state(page)['input']=='90°'
                    check_result(page,math.pi/2*scale,unit)
                    press(page,'AC')
                    # Nested trigonometry with explicit operands.
                    press(page,'SIN','LP','SHIFT','EXP','DIV','2','RP')
                    drg(page,'2')
                    press(page,'RP')
                    check_result(page,1,unit)
                    press(page,'AC')
                    press(page,'COS','1','0','0')
                    drg(page,'3')
                    press(page,'RP')
                    check_result(page,0,unit)
                    press(page,'AC')
                    # Menu cancellation must not insert a unit or switch setup.
                    load(page,'50')
                    press(page,'SHIFT','ANS')
                    assert state(page)['screen']=='menu'
                    press(page,'AC')
                    s=state(page)
                    assert s['screen']=='edit' and s['input']=='50',s
                    assert s['angle']==unit,s
                    # A result can start a new DRG conversion using (Ans).
                    load(page,'50')
                    check_result(page,50,unit)
                    drg(page,'3')
                    assert state(page)['input']=='(Ans)g'
                    check_result(page,math.pi/4*scale,unit)
                    # Invalid postfix input remains an error with unchanged setup.
                    press(page,'AC')
                    load(page,'sin(r)')
                    press(page,'EQUAL')
                    s=state(page)
                    assert s['screen']=='error' and s['angle']==unit,s
                    press(page,'AC')
                # COMP-only DRG UI must be clearly blocked in CMPLX.
                press(page,'MODE','2')
                assert state(page)['mode']=='CMPLX'
                press(page,'SHIFT')
                status=page.locator('#keys button[data-key="ANS"]').evaluate(
                    '(b)=>b.parentElement.dataset.legendStatus')
                assert status=='blocked',status
                press(page,'ANS')
                assert state(page)['mode']=='CMPLX' and state(page)['screen']=='edit'
                press(page,'MODE','1')
                assert state(page)['mode']=='COMP'
                # Adjacent ALPHA+Ans is NOT DRG▶. Only PLUS C exposes PreAns.
                press(page,'AC','ALPHA')
                status=page.locator('#keys button[data-key="ANS"]').evaluate(
                    '(b)=>b.parentElement.dataset.legendStatus')
                assert status==('available' if model=='fx-991es-plus-c' else 'unlabelled'),status
                press(page,'ANS')
                assert state(page)['screen']=='edit',state(page)
                if model=='fx-991es-plus-c':
                    assert state(page)['input']=='PreAns',state(page)
                else:
                    assert state(page)['input']=='',state(page)
                assert not errors,errors
                print('REA-082 DRG conversion',model,'PASS')
        finally: browser.close()
if __name__=='__main__':main()
