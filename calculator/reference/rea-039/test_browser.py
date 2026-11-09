"""REA-039 optional Chromium integration test for both modular and standalone builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def press(page,*keys):
    for key in keys: page.evaluate('(k)=>window.FreshCalculator.press(k)',key)
def st(page):
    return page.evaluate('window.FreshCalculator.getState()')
def load(page,x):
    page.evaluate('(s)=>window.FreshCalculator.loadExpression(s)',x)
def test(page):
    page.wait_for_function('Boolean(window.FreshCalculator)')
    load(page,'3+5');press(page,'SHIFT','RCL')
    assert st(page)['pendingMemory']=='STO'
    press(page,'NEG')
    assert st(page)['memory']['A']==8
    press(page,'AC','RCL','NEG')
    assert st(page)['raw']==8
    load(page,'10*5');press(page,'MPLUS')
    assert st(page)['memory']['M']==50
    load(page,'10+5');press(page,'SHIFT','MPLUS')
    assert st(page)['memory']['M']==35
    press(page,'AC','RCL','MPLUS')
    assert st(page)['raw']==35
    press(page,'AC','SHIFT','RCL','AC')
    assert st(page)['pendingMemory'] is None
    load(page,'1/0');press(page,'SHIFT','RCL','NEG')
    assert st(page)['screen']=='error' and st(page)['memory']['A']==8
    press(page,'AC','SHIFT','9','2')
    assert 'Memory' in st(page)['menuTitle']
    press(page,'EQUAL')
    assert st(page)['memory']['A']==0 and st(page)['memory']['M']==0
    assert st(page)['ans']==0
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for name in ('index.html','fx991_fresh_standalone.html'):
        page=browser.new_page()
        page.goto((ROOT/name).as_uri())
        test(page)
        print('REA-039',name,'PASS')
        page.close()
    browser.close()
