"""REA-069 original fx-991ES model-specific register UI/DOM validation.
Usage: python calculator/reference/rea-069/test_registers_browser.py
Requires Playwright + Chromium; runs against the modular calculator/index.html.
Original CASIO fx-115ES / fx-991ES User's Guide pp. E-25–27.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]

def press(page, *keys):
    for key in keys:
        page.evaluate("(key) => window.FreshCalculator.press(key)", key)

def state(page):
    return page.evaluate("window.FreshCalculator.getState()")

def load(page, source):
    page.evaluate("(source) => window.FreshCalculator.loadExpression(source)", source)

def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto((ROOT / "index.html").as_uri())
            page.wait_for_function("Boolean(window.FreshCalculator)")
            for model in ("fx-991es", "fx-991es-plus", "fx-991es-plus-c"):
                page.evaluate("(model) => FreshCalculator.setModel(model)", model)
                original = model == "fx-991es"
                press(page, "AC", "ALPHA", "COS")
                assert (state(page)["input"] == "") == original, (model, state(page))
                if not original:
                    assert state(page)["input"] == "E"
                press(page, "AC")
                load(page, "5")
                press(page, "SHIFT", "RCL", "COS")
                s = state(page)
                if original:
                    assert s["pendingMemory"] == "STO", (model, s)
                    assert s["memory"]["E"] == 0, (model, s)
                    press(page, "AC")
                else:
                    assert s["pendingMemory"] is None and s["memory"]["E"] == 5, (model, s)
                load(page, "E+1")
                press(page, "EQUAL")
                s = state(page)
                if original:
                    assert s["screen"] == "error", (model, s)
                else:
                    assert s["screen"] == "result" and s["ans"] == 6, (model, s)
                press(page, "AC")
                load(page, "A+1")
                press(page, "CALC", "TEXT:E", "EQUAL", "TEXT:8", "EQUAL")
                s = state(page)
                if original:
                    assert s["screen"] == "prompt" and s["memory"]["E"] == 0, (model, s)
                else:
                    assert s["screen"] == "flow-result" and s["memory"]["E"] == 8, (model, s)
                press(page, "AC")
                print(model, "REA-069 PASS")
            assert not errors, errors
            page.close()
        finally:
            browser.close()

if __name__ == "__main__":
    main()
