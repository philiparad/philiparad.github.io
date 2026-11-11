"""REA-085 original STAT menu and symbolic parameter insertion browser test.
Requires Playwright Chromium. Not manufacturer hardware parity.
Run: python calculator/reference/rea-085/test_stat_parameters_browser.py
"""
from contextlib import contextmanager
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
@contextmanager
def serve():
    http=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    thread=Thread(target=http.serve_forever,daemon=True);thread.start()
    try:yield 'http://127.0.0.1:'+str(http.server_port)+'/index.html'
    finally:http.shutdown();http.server_close();thread.join(timeout=4)
def state(page):return page.evaluate('FreshCalculator.getState()')
def press(page,*keys):
    for key in keys:
        button=page.locator(f'#keys button[data-key="{key}"]')
        assert button.count()==1,key
        button.click()
def check_number(page,want):
    press(page,'EQUAL')
    s=state(page)
    assert s['screen']=='result',s
    assert abs(s['raw']-want)<1e-8*max(1,abs(want)),s
    return s
def menu(page,title=None):
    press(page,'SHIFT','1')
    s=state(page)
    assert s['screen']=='menu' and s['menuTitle']=='STAT',s
    if title:
        labels=[x['label'] for x in s['menu']]
        assert any(title in x for x in labels),labels
    return s
def parameter(page,submenu,choice):
    press(page,submenu)
    s=state(page)
    assert s['screen']=='menu',s
    press(page,choice)
    assert state(page)['screen']=='edit',state(page)
def main():
    with serve() as url,sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':980})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            page.select_option('#model-selector','fx-991es')
            press(page,'MODE','3','1')
            assert state(page)['screen']=='stat-table'
            for x in [1,2,3]:press(page,str(x),'EQUAL')
            # Menus from the data table must insert parameter expressions.
            menu(page,'7. Distr')
            parameter(page,'4','1')
            assert state(page)['input']=='StatSumX2'
            press(page,'ADD')
            menu(page)
            parameter(page,'4','2')
            assert state(page)['input']=='StatSumX2+StatSumX',state(page)
            s=check_number(page,20)
            assert s['ans']==20
            # The result screen menu should start a fresh source expression.
            menu(page)
            parameter(page,'5','2')
            assert state(page)['input']=='StatMeanX'
            s=check_number(page,2)
            assert s['ans']==2
            # Enter an expression with an inserted parameter and stored Ans.
            press(page,'AC','ANS','ADD')
            menu(page)
            parameter(page,'5','1')
            assert state(page)['input']=='Ans+StatN'
            check_number(page,5)
            # Cancel submenu without changing the sample or input.
            press(page,'AC')
            old=state(page)['input']
            menu(page)
            press(page,'6')
            assert state(page)['menuTitle']=='STAT MinMax'
            press(page,'AC')
            assert state(page)['input']==old
            # Stat table preserved even when moving between edit and menu.
            menu(page)
            press(page,'2')
            assert state(page)['screen']=='stat-table'
            assert [x['X'] for x in state(page)['statTable']['rows'] if x['X'] is not None]==[1,2,3]
            press(page,'AC')
            # Original paired menu: 7 Reg; all eight paired sums in order.
            press(page,'MODE','3','2')
            assert state(page)['statTable']['paired']
            press(page,'1','EQUAL','3','EQUAL')
            press(page,'2','EQUAL','5','EQUAL')
            press(page,'3','EQUAL','7','EQUAL')
            press(page,'AC')
            s=menu(page,'7. Reg')
            assert not any('Distr' in x['label'] for x in s['menu'])
            press(page,'4')
            assert len(state(page)['menu'])==8,state(page)
            press(page,'3')
            assert state(page)['input']=='StatSumY2'
            s=check_number(page,83)
            # Linear coefficient menu A, B, r, xhat, yhat.
            menu(page)
            press(page,'7')
            assert [x['label'].split('. ',1)[1] for x in state(page)['menu']]==['A','B','r','x̂','ŷ']
            press(page,'2')
            assert state(page)['input']=='StatRegB'
            check_number(page,2)
            # Empty table error leaves Ans unchanged.
            press(page,'MODE','3','1')
            press(page,'AC')
            menu(page)
            parameter(page,'5','2')
            before=state(page)['ans']
            press(page,'EQUAL')
            s=state(page)
            assert s['screen']=='error' and s['ans']==before,s
            press(page,'AC')
            # Original-only scope: PLUS/PLUS C retain existing selector flow.
            for model in ['fx-991es-plus','fx-991es-plus-c']:
                page.select_option('#model-selector',model)
                press(page,'MODE','3','1')
                press(page,'2','EQUAL','AC')
                menu(page)
                press(page,'4','1')
                s=state(page)
                assert s['screen']=='flow-result',s
            assert not errors,errors
            print('REA-085 original STAT menu browser PASS')
        finally:browser.close()
if __name__=='__main__':main()
