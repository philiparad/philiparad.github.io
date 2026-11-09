"""REA-034: optional Playwright end-to-end regression in modular and standalone calculator."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
def press(page,*keys):
    for key in keys:
        page.evaluate("(k) => window.FreshCalculator.press(k)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page,text):
    page.evaluate("(s) => window.FreshCalculator.loadExpression(s)",text)
    press(page,'EQUAL')
    return state(page)
def verify(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    for source,want in [('log(2,8)',3),('nthroot(3,-27)',-3),('cbrt(-8)',-2)]:
        s=run(page,source)
        assert s['screen']=='result' and abs(s['raw']-want)<1e-12
    for source in ['log(1,8)','nthroot(2,-16)','nthroot(0,5)']:
        s=run(page,source)
        assert s['screen']=='error' and s['error']=='Math ERROR'
    press(page,'AC','LOGBASE','2','RIGHT','8','EQUAL')
    assert state(page)['raw']==3
    press(page,'AC','SHIFT','POWER','3','RIGHT','NEG','2','7','EQUAL')
    assert state(page)['raw']==-3
    press(page,'AC','SHIFT','SQRT','NEG','8','EQUAL')
    assert state(page)['raw']==-2
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for name in ('index.html','fx991_fresh_standalone.html'):
        page=browser.new_page()
        page.goto((ROOT/name).as_uri())
        verify(page)
        print(name,'REA-034 PASS')
        page.close()
    browser.close()
