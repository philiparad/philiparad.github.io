"""REA-032 optional Playwright regression, modular and standalone calculators."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page,expr):
    page.evaluate("(expr) => window.FreshCalculator.loadExpression(expr)",expr)
    press(page,"EQUAL")
    return state(page)
def verify(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    for expr,result in [("sin(30)",.5),("cos(90)",0),("sin(180)",0),("asin(1)",90),("acosh(1)",0)]:
        s=run(page,expr)
        assert s["screen"]=="result",expr
        assert abs(s["raw"]-result)<1e-10,expr
    for expr in ["tan(90)","asin(1.01)","acosh(.5)","atanh(1)","sinh(231)"]:
        s=run(page,expr)
        assert s["screen"]=="error" and s["error"]=="Math ERROR",expr
    press(page,"AC","HYP","SHIFT","SIN")
    assert state(page)["input"]=="asinh("
    press(page,"AC","HYP","SHIFT","COS")
    assert state(page)["input"]=="acosh("
    press(page,"AC","HYP","SHIFT","TAN")
    assert state(page)["input"]=="atanh("
    press(page,"AC","HYP","SIN")
    assert state(page)["input"]=="sinh("

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ("index.html","fx991_fresh_standalone.html"):
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            verify(page)
            print(name,"REA-032 PASS")
            page.close()
    finally:
        browser.close()
