"""REA-035 optional Playwright integration check for both calculator builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]

def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def press(page,*keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)",key)
def evaluate(page,expression):
    page.evaluate("(s) => window.FreshCalculator.loadExpression(s)",expression)
    press(page,"EQUAL")
    return state(page)

def verify(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    for expr,value in [("GCD(28,35)",7),("LCM(9,15)",45),("Int(-3.5)",-3),("Intg(-3.5)",-4)]:
        s=evaluate(page,expr)
        assert s["screen"]=="result" and s["raw"]==value,(expr,s)
    for expr in ["GCD(1.5,2)","LCM(-1,2)","LCM(10000000000,1)"]:
        s=evaluate(page,expr)
        assert s["screen"]=="error" and s["error"]=="Math ERROR",(expr,s)
    for key,expected in [("MUL","GCD("),("DIV","LCM("),("ADD","Int("),("SUB","Intg(")]:
        press(page,"AC","ALPHA",key)
        assert state(page)["input"]==expected,(key,state(page)["input"])
    press(page,"AC","ALPHA","MUL","2","8","SHIFT","RP","3","5","RP","EQUAL")
    assert state(page)["raw"]==7

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for file in ("index.html","fx991_fresh_standalone.html"):
            page=browser.new_page()
            page.goto((ROOT/file).as_uri())
            verify(page)
            print(file,"REA-035 PASS")
            page.close()
    finally:
        browser.close()
