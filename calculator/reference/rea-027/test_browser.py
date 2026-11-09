"""REA-027: optional Playwright test for modular and standalone calculators."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page,source):
    page.evaluate("(source) => window.FreshCalculator.loadExpression(source)",source)
    press(page,'EQUAL')
def verify(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    press(page,'1','DOT','2','EXP','NEG','3')
    current=state(page)
    assert current['input']=='1.2E-3'
    assert current['editor']['path'][0]['field']=='exponent'
    press(page,'EQUAL')
    current=state(page)
    assert current['screen']=='result' and abs(current['raw']-.0012)<1e-12
    press(page,'AC','2','EXP','3','EQUAL')
    assert state(page)['raw']==2000
    press(page,'AC','2','EXP','EQUAL')
    assert state(page)['error']=='Syntax ERROR'
    press(page,'AC')
    run(page,'1234')
    press(page,'ENG')
    assert state(page)['result']=='1.234×10^3'
    press(page,'ENG')
    assert state(page)['result']=='1234×10^0'
    press(page,'SHIFT','ENG')
    assert state(page)['result']=='1.234×10^3'
    run(page,'123')
    press(page,'SHIFT','ENG')
    assert state(page)['result']=='0.123×10^3'
    press(page,'SHIFT','ENG')
    assert state(page)['result']=='0.000123×10^6'
    assert state(page)['raw']==123 and state(page)['ans']==123

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ('index.html','fx991_fresh_standalone.html'):
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            verify(page)
            print(name,'REA-027 PASS')
            page.close()
    finally:
        browser.close()
