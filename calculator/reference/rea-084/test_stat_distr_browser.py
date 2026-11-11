"""REA-084 original fx-991ES STAT→Distr browser keypad integration.
Run: python calculator/reference/rea-084/test_stat_distr_browser.py
Requires Playwright/Chromium. This is WEB-model behavior, not native CASIO proof.
"""
from pathlib import Path
from contextlib import contextmanager
from functools import partial
from threading import Thread
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
@contextmanager
def serving():
    srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    th=Thread(target=srv.serve_forever,daemon=True);th.start()
    try:yield f'http://127.0.0.1:{srv.server_port}/index.html'
    finally:srv.shutdown();srv.server_close();th.join(timeout=4)
def press(page,*keys):
    for key in keys:
        b=page.locator(f'#keys button[data-key="{key}"]')
        assert b.count()==1,key
        b.click()
def state(page):return page.evaluate('FreshCalculator.getState()')
def check_near(v,x,tol=1e-8):
    assert abs(v-x)<tol*max(1,abs(x)),(v,x)
def open_distr(page):
    press(page,'SHIFT','1')
    s=state(page)
    assert s['screen']=='menu' and s['menuTitle']=='STAT',s
    assert any('7. Distr' in line for line in s['menuEntries']),s
    press(page,'7')
    s=state(page)
    assert s['screen']=='menu' and s['menuTitle']=='STAT Distr',s
    assert len(s['menu'])==4,s
    assert [part['label'].split('. ',1)[1] for part in s['menu']]==['P(','Q(','R(','▶t'],s
def choose(page,key,value=None):
    press(page,key)
    s=state(page)
    assert s['screen']=='prompt' and s['flow']['title'].startswith('STAT '),s
    if value is not None:
        press(page,'DEL')
        for ch in str(value):
            if ch=='-':press(page,'NEG')
            elif ch=='.':press(page,'DOT')
            else:press(page,ch)
    press(page,'EQUAL')
    return state(page)
def main():
    import math
    with serving() as url,sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1020})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url)
            page.wait_for_function('Boolean(window.FreshCalculator)')
            page.select_option('#model-selector','fx-991es')
            press(page,'MODE','3','1')
            s=state(page)
            assert s['mode']=='STAT' and s['screen']=='stat-table',s
            # Enter 1,2,3; EQUAL saves/advances to the next row.
            for x in (1,2,3):
                press(page,str(x),'EQUAL')
            s=state(page)
            assert len([x for x in s['statTable']['rows'] if x['X'] is not None])==3,s
            press(page,'AC')
            assert state(page)['screen']=='edit'
            # SHIFT+1 must not restart the STAT editor (previous regression).
            open_distr(page)
            s=choose(page,'4','1')
            check_near(s['raw'],-math.sqrt(1.5))
            assert s['screen']=='flow-result' and s['outputLines'][0].endswith('▶t'),s
            assert s['ans']==s['raw']
            # P(Ans) per CASIO manual, via physical ANS button.
            open_distr(page)
            press(page,'1')
            assert state(page)['screen']=='prompt'
            press(page,'ANS','EQUAL')
            s=state(page)
            assert s['screen']=='flow-result' and s['outputLines'][0]=='P(Ans)',s
            check_near(s['raw'],0.11033568095992341)
            # Q(0)=0 and R(0)=0.5, all through the same original menu.
            for key,want in [('2',0),('3',.5)]:
                open_distr(page)
                s=choose(page,key,'0')
                check_near(s['raw'],want)
            # Unsupported missing/invalid arguments do not mutate Ans.
            old=state(page)['ans']
            open_distr(page)
            press(page,'1')
            press(page,'DEL')
            press(page,'EQUAL')
            s=state(page)
            assert s['screen']=='prompt' and s['ans']==old,s
            press(page,'AC')
            assert state(page)['screen']=='edit'
            # Distribution menu does not exist for original paired regression.
            press(page,'MODE','3','2')
            assert state(page)['statTable']['paired']
            press(page,'SHIFT','1')
            s=state(page)
            assert any('7. Reg' in line for line in s['menuEntries']),s
            assert not any('7. Distr' in line for line in s['menuEntries']),s
            press(page,'AC')
            # PLUS profiles are untouched by this original-model-specific task.
            for model in ('fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                press(page,'MODE','3','1')
                press(page,'1','EQUAL','2','EQUAL','AC','SHIFT','1')
                s=state(page)
                assert not any('7. Distr' in label for label in s['menuEntries']),s
                press(page,'AC')
            assert not errors,errors
            print('REA-084 original STAT Distr browser PASS')
        finally:browser.close()
if __name__=='__main__':main()
