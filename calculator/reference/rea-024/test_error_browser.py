"""REA-024: browser controller error recovery, both builds; Python Playwright optional."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]

def exercise(page):
    page.wait_for_function("Boolean(window.FreshCalculator)")
    page.evaluate("window.FreshCalculator.loadExpression('14/0*2')")
    page.evaluate("window.FreshCalculator.press('EQUAL')")
    state = page.evaluate("window.FreshCalculator.getState()")
    assert state["screen"] == "error" and state["error"] == "Math ERROR"
    assert state["errorOffset"] == 3
    page.evaluate("window.FreshCalculator.press('LEFT')")
    state = page.evaluate("window.FreshCalculator.getState()")
    assert state["screen"] == "edit" and state["editor"]["offset"] == 3
    page.evaluate("window.FreshCalculator.press('1')")
    page.evaluate("window.FreshCalculator.press('EQUAL')")
    state = page.evaluate("window.FreshCalculator.getState()")
    assert state["screen"] == "result" and abs(state["raw"] - 2.8) < 1e-12
    page.evaluate("window.FreshCalculator.loadExpression('2+')")
    page.evaluate("window.FreshCalculator.press('EQUAL')")
    assert page.evaluate("window.FreshCalculator.getState().error") == "Syntax ERROR"
    page.evaluate("window.FreshCalculator.press('AC')")
    state = page.evaluate("window.FreshCalculator.getState()")
    assert state["screen"] == "edit" and not state["input"] and not state["error"]
    # A bounded parser guard must display Stack ERROR, rather than hang/crash.
    page.evaluate("""() => window.FreshCalculator.loadExpression(
        '('.repeat(41) + '1' + ')'.repeat(41))""")
    page.evaluate("window.FreshCalculator.press('EQUAL')")
    assert page.evaluate("window.FreshCalculator.getState().error") == "Stack ERROR"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for filename in ("index.html", "fx991_fresh_standalone.html"):
                page = browser.new_page()
                page.goto((ROOT / filename).as_uri())
                exercise(page)
                print(filename, "REA-024 recovery PASS")
                page.close()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
