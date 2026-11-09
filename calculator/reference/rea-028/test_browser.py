"""REA-028: optional browser-level Playwright DMS tests for both builds."""
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
def test(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    press(page,"2","DMS","1","5","DMS","1","8","DMS")
    assert state(page)["input"]=="2°15′18″"
    press(page,"EQUAL")
    assert state(page)["result"]=="2°15′18″"
    assert state(page)["raw"]==2.255
    press(page,"DMS")
    assert state(page)["result"]=="2.255"
    assert state(page)["ans"]==2.255
    press(page,"DMS")
    assert state(page)["result"]=="2°15′18″"
    run(page,"2°20′30″+0°39′30″")
    assert state(page)["result"]=="3°0′0″"
    run(page,"-2°15′18″")
    assert state(page)["result"]=="-2°15′18″"
    run(page,"2°60′0″")
    assert state(page)["screen"]=="error"
    assert state(page)["error"]=="Argument ERROR"

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    try:
        for name in ["index.html","fx991_fresh_standalone.html"]:
            page=browser.new_page()
            page.goto((ROOT/name).as_uri())
            test(page)
            print(name,"REA-028 PASS")
            page.close()
    finally:
        browser.close()
