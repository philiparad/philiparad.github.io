"""REA-040 optional Playwright checks for both calculator builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys: page.evaluate('(k)=>window.FreshCalculator.press(k)',key)
def state(page):
    return page.evaluate('window.FreshCalculator.getState()')
def load(page,source):
    page.evaluate('(s)=>window.FreshCalculator.loadExpression(s)',source)
def calculate(page,source):
    load(page,source);press(page,'EQUAL');return state(page)
def check(page):
    page.wait_for_function('Boolean(window.FreshCalculator)')
    calculate(page,'1');calculate(page,'1')
    press(page,'AC','ANS','ADD','ALPHA','ANS','EQUAL')
    assert (state(page)['ans'],state(page)['preAns'])==(2,1)
    press(page,'EQUAL')
    assert (state(page)['ans'],state(page)['preAns'])==(3,2)
    press(page,'EQUAL')
    assert (state(page)['ans'],state(page)['preAns'])==(5,3)
    calculate(page,'3*4')
    press(page,'DIV')
    assert state(page)['input']=='Ans/'
    press(page,'3','0','EQUAL')
    assert abs(state(page)['ans']-.4)<1e-12
    assert state(page)['preAns']==12
    calculate(page,'5')
    calculate(page,'1/0')
    assert state(page)['screen']=='error'
    assert state(page)['ans']==5
    press(page,'AC')
    press(page,'SHIFT','LOGBASE')
    for v in ('X+1','1','5'): press(page,'TEXT:'+v,'EQUAL')
    assert state(page)['ans']==20
    assert state(page)['preAns']==5
    load(page,'X^2+1')
    press(page,'CALC','TEXT:X','EQUAL','TEXT:3','EQUAL')
    assert state(page)['ans']==10 and state(page)['preAns']==20
    assert state(page)['memory']['X']==3
    press(page,'AC')
    load(page,'1/(X-2)')
    press(page,'CALC','TEXT:X','EQUAL','TEXT:2','EQUAL')
    assert state(page)['screen']=='prompt'
    assert state(page)['ans']==10 and state(page)['memory']['X']==3

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ('index.html','fx991_fresh_standalone.html'):
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            check(page)
            print(name,'REA-040 PASS')
            page.close()
    finally:
        browser.close()
