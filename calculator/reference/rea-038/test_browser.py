"""REA-038 optional browser tests: numerical calculation prompts and result screens."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]

def state(page):
    return page.evaluate('window.FreshCalculator.getState()')
def press(page,*keys):
    for key in keys: page.evaluate('(key)=>window.FreshCalculator.press(key)',key)
def prompt(page,mode,fields):
    press(page,'AC',*mode)
    s=state(page)
    assert s['screen']=='prompt',s
    assert len(s['flow']['fields'])==len(fields)
    for expression in fields: press(page,'TEXT:'+expression,'EQUAL')
    return state(page)
def near(actual,expected,tol=1e-7):
    assert abs(actual-expected)<tol*max(1,abs(expected)),(actual,expected)
def run(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    deriv=prompt(page,['SHIFT','INTEGRAL'],['3*X^2-5*X+2','2','1E-12'])
    assert deriv['screen']=='flow-result'
    near(deriv['raw'],7)
    integ=prompt(page,['INTEGRAL'],['ln(X)','1','e','1E-7'])
    assert integ['screen']=='flow-result'
    near(integ['raw'],1)
    summ=prompt(page,['SHIFT','LOGBASE'],['X+1','1','5'])
    assert summ['screen']=='flow-result' and summ['raw']==20
    solve=prompt(page,['SHIFT','CALC'],['X^2=2','1'])
    assert solve['screen']=='flow-result'
    near(solve['raw'],2**.5)
    assert len(solve['outputLines'])==2 and solve['outputLines'][1].startswith('L-R')
    assert solve['preAns']==20
    invalid=prompt(page,['SHIFT','LOGBASE'],['X+1','5','1'])
    assert invalid['screen']=='prompt' and invalid['info']=='Argument ERROR'
    assert invalid['ans']==solve['ans']
    page.evaluate("(e)=>window.FreshCalculator.loadExpression(e)",'Prod(X+1,1,5)')
    press(page,'EQUAL')
    assert state(page)['raw']==720

with sync_playwright() as playwright:
    browser=playwright.chromium.launch(headless=True)
    for name in ('index.html','fx991_fresh_standalone.html'):
        page=browser.new_page()
        page.goto((ROOT/name).as_uri())
        run(page)
        print(name,'REA-038 PASS')
        page.close()
    browser.close()
