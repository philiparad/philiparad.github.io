"""REA-026 optional Playwright browser tests for modular and standalone builds."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
def state(page):
    return page.evaluate("window.FreshCalculator.getState()")
def run(page, expression):
    page.evaluate("(expression) => window.FreshCalculator.loadExpression(expression)", expression)
    page.evaluate("window.FreshCalculator.press('EQUAL')")
def press(page, *keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)", key)

def test(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    run(page, "7/6")
    assert state(page)["result"] == "7/6"
    raw = state(page)["raw"]
    press(page, "SD")
    assert state(page)["result"] == "1.166666667"
    press(page, "SD")
    assert state(page)["result"] == "7/6"
    press(page, "SHIFT", "SD")
    assert state(page)["result"] == "1 1/6"
    assert state(page)["fractionStyle"] == "improper"
    press(page, "SHIFT", "SD")
    assert state(page)["result"] == "7/6"
    assert state(page)["raw"] == raw
    run(page, "12345679/9")
    press(page, "SHIFT", "SD")
    assert state(page)["result"] == "12345679/9"
    run(page, "pi")
    press(page, "SD")
    assert state(page)["result"] == "3.141592654"
    press(page, "SD")
    assert state(page)["result"] == "π"
    run(page, "sqrt(2)")
    press(page, "SD")
    assert state(page)["result"] == "1.414213562"
    press(page, "SD")
    assert state(page)["result"] == "√2"
    run(page, "sin(30)")
    before = state(page)["result"]
    press(page, "SD")
    assert state(page)["result"] == before

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for name in ("index.html","fx991_fresh_standalone.html"):
        page = browser.new_page()
        page.goto((ROOT / name).as_uri())
        test(page)
        print(name, "REA-026 PASS")
        page.close()
    browser.close()
