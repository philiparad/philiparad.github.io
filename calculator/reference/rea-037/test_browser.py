"""REA-037 optional Playwright smoke test for modular and standalone calculators."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page,source):
    page.evaluate("(expr) => window.FreshCalculator.loadExpression(expr)",source)
    press(page,'EQUAL')
    return state(page)
def validate(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    for expr,want in [
        ('Prod(X+1,1,5)',720),('Prod(X,2,8,2)',384),
        ('Prod(X,-3,-1)',-6),('Prod(X,0,4)',0)
    ]:
        actual=run(page,expr)
        assert actual['screen']=='result' and abs(actual['raw']-want)<1e-12,expr
    for expr in ['Prod(X,5,1)','Prod(X,1,5,0)','Prod(Pol(1,2),1,3)']:
        actual=run(page,expr)
        assert actual['screen']=='error',expr
    press(page,'AC','ALPHA','INTEGRAL')
    assert state(page)['input']=='Prod('
    press(page,'AC','ALPHA','LOGBASE')
    s=state(page)
    assert s['screen']=='prompt' and s['flow']['title'].startswith('Π')
    # Physical-key prompt entry: ALPHA+LP inserts X.
    press(page,'ALPHA','LP','ADD','1','EQUAL')
    s=state(page)
    assert s['screen']=='prompt' and s['flow']['index']==1
    press(page,'1','EQUAL','5','EQUAL','EQUAL')
    s=state(page)
    assert s['screen']=='flow-result' and s['raw']==720
    assert s['outputLines']==['720']
    press(page,'AC','ALPHA','LOGBASE')
    s=state(page)
    assert s['screen']=='prompt' and len(s['flow']['fields'])==4
    press(page,'TEXT:X','EQUAL','2','EQUAL','8','EQUAL','2','EQUAL')
    s=state(page)
    assert s['screen']=='flow-result' and s['raw']==384

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for file in ['index.html','fx991_fresh_standalone.html']:
            page=browser.new_page()
            page.goto((ROOT/file).as_uri())
            validate(page)
            print(file,'REA-037 PASS')
            page.close()
    finally:
        browser.close()
