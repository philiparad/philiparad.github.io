"""REA-033 optional Playwright integration checks of modular and standalone calculator."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def calculate(page,source):
    page.evaluate("(src) => window.FreshCalculator.loadExpression(src)",source)
    press(page,"EQUAL")
    return state(page)
def close(actual,expect):
    assert abs(actual-expect)<1e-10,(actual,expect)
def run(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    s=calculate(page,"Pol(sqrt(2),sqrt(2))")
    assert s["screen"]=="result"
    assert "r=2" in s["result"] and "θ=45" in s["result"]
    close(s["memory"]["X"],2)
    close(s["memory"]["Y"],45)
    close(s["ans"],2)
    s=calculate(page,"Rec(sqrt(2),45)")
    assert "X=1" in s["result"] and "Y=1" in s["result"]
    close(s["memory"]["X"],1)
    close(s["memory"]["Y"],1)
    s=calculate(page,"Pol(-1,0)")
    close(s["memory"]["Y"],180)
    before=(s["memory"]["X"],s["memory"]["Y"])
    s=calculate(page,"Pol(1)")
    assert s["screen"]=="error" and s["error"]=="Syntax ERROR"
    assert (s["memory"]["X"],s["memory"]["Y"])==before
    press(page,"AC","SHIFT","ADD")
    assert state(page)["input"]=="Pol("
    press(page,"AC","SHIFT","SUB")
    assert state(page)["input"]=="Rec("
    s=calculate(page,"X+Y")
    close(s["raw"],sum(before))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ("index.html","fx991_fresh_standalone.html"):
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            run(page)
            print(name,"REA-033 PASS")
            page.close()
    finally:
        browser.close()
