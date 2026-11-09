"""REA-036 optional Playwright test for both calculator builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def state(page):
    return page.evaluate('window.FreshCalculator.getState()')
def press(page,*keys):
    for key in keys:
        page.evaluate('(key) => window.FreshCalculator.press(key)',key)
def run(page,source):
    page.evaluate('(source) => window.FreshCalculator.loadExpression(source)',source)
    press(page,'EQUAL')
    return state(page)
def verify(page):
    page.wait_for_function('Boolean(window.FreshCalculator)')
    press(page,'AC','SHIFT','DOT')
    assert state(page)['input']=='Ran#'
    press(page,'EQUAL')
    result=state(page)
    assert result['screen']=='result'
    assert 0<=result['raw']<=.999
    assert abs(result['raw']*1000-round(result['raw']*1000))<1e-8
    press(page,'AC','ALPHA','DOT')
    assert state(page)['input']=='RanInt#('
    s=run(page,'RanInt#(1,6)')
    assert s['screen']=='result' and 1<=s['raw']<=6 and int(s['raw'])==s['raw']
    s=run(page,'RanInt#(2,2)')
    assert s['screen']=='error' and s['error']=='Argument ERROR'
    press(page,'AC','SHIFT','0')
    assert state(page)['input']=='Rnd('
    s=run(page,'Rnd(1/3)')
    assert s['screen']=='result' and abs(s['raw']-0.3333333333)<1e-12
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for name in ('index.html','fx991_fresh_standalone.html'):
        page=browser.new_page()
        page.goto((ROOT/name).as_uri())
        verify(page)
        print(name,'REA-036 PASS')
        page.close()
    browser.close()
