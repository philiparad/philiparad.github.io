"""REA-031: optional Playwright smoke checks for modular and standalone builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page,expression):
    page.evaluate("(s) => window.FreshCalculator.loadExpression(s)",expression)
    press(page,"EQUAL")
    return state(page)
def verify(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    for source,value in [
        ("5!",120),("10nPr4",5040),("10nCr4",210),
        ("9999999999nCr1",9999999999)
    ]:
        s=run(page,source)
        assert s["screen"]=="result",(source,s)
        assert abs(s["raw"]-value)<1e-10*max(1,abs(value)),source
    for source in ["70!","(-1)!","10nCr11","1000nCr500"]:
        s=run(page,source)
        assert s["screen"]=="error" and s["error"]=="Math ERROR",(source,s)
    press(page,"AC","5","SHIFT","RECIP","EQUAL")
    assert state(page)["raw"]==120
    press(page,"AC","1","0","SHIFT","MUL","4","EQUAL")
    assert state(page)["raw"]==5040
    press(page,"AC","1","0","SHIFT","DIV","4","EQUAL")
    assert state(page)["raw"]==210

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ("index.html","fx991_fresh_standalone.html"):
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            verify(page)
            print(name,"REA-031 PASS")
            page.close()
    finally:
        browser.close()
