"""REA-073 Playwright real DOM-key textbook-template test.
Run from calculator/: python reference/rea-073/test_editor_browser.py
Requires playwright and chromium; uses calculator/index.html, not standalone.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys:
        button=page.locator('#keys button[data-key="'+key+'"]')
        assert button.count()==1,key
        button.click()

def state(page):
    return page.evaluate("FreshCalculator.getState()")

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={"width":1100,"height":1050})
            errors=[]
            page.on("pageerror",lambda exc:errors.append(str(exc)))
            page.goto((ROOT/"index.html").as_uri())
            page.wait_for_function("Boolean(window.FreshCalculator)")
            page.select_option("#model-selector","fx-991es")
            # Natural stacked fraction: 12 / 3.
            press(page,"1","2","FRAC","3")
            s=state(page)
            assert s["input"]=="((12)/(3))",s
            press(page,"EQUAL")
            assert state(page)["screen"]=="result" and state(page)["ans"]==4,state(page)
            press(page,"AC")
            # Radicand and editable fraction embedded in an expression.
            press(page,"SQRT","1","6","RIGHT","FRAC","2")
            s=state(page)
            assert s["input"]=="((sqrt(16))/(2))",s
            press(page,"EQUAL")
            assert state(page)["screen"]=="result" and state(page)["ans"]==2,state(page)
            press(page,"AC")
            # Incomplete field cannot silently produce a numeric result.
            press(page,"FRAC","2","EQUAL")
            s=state(page)
            assert s["screen"]=="error",s
            press(page,"AC")
            # SHIFT+FRAC supplies three editable slots for mixed numbers.
            press(page,"SHIFT","FRAC","2","RIGHT","1","RIGHT","4","EQUAL")
            assert abs(state(page)["ans"]-2.25)<1e-10,state(page)
            press(page,"AC")
            # Undo is a web-only keyboard shortcut scoped to calculator focus.
            page.locator("#face").focus()
            press(page,"2","SQRT","9")
            assert state(page)["input"]=="2sqrt(9)"
            page.keyboard.press("Control+z")
            assert state(page)["input"]=="2sqrt(?)",state(page)
            page.keyboard.press("Control+z")
            assert state(page)["input"]=="2",state(page)
            # A model switch still preserves 50 real buttons.
            for model in ("fx-991es-plus","fx-991es-plus-c"):
                page.select_option("#model-selector",model)
                assert page.locator("#keys button[data-key]").count()==50
                press(page,"FRAC","1","RIGHT","2")
                assert state(page)["input"]=="((1)/(2))",state(page)
                press(page,"AC")
            assert not errors,errors
            print("REA-073 DOM flow PASS (3 models, natural fractions, roots, mixed, undo)")
        finally:
            browser.close()

if __name__=="__main__":
    main()
