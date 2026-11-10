"""REA-072 modular LCD browser verification.
Run from calculator/: python reference/rea-072/test_lcd_browser.py
Requires Playwright and Chromium. All assertions concern this independent
WEB LCD, not physical CASIO display geometry or native ROM font fidelity.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys:
        page.locator('#keys button[data-key="'+key+'"]').click()

def state(page):
    return page.evaluate("FreshCalculator.getState()")

def raster(page):
    return page.evaluate("Array.from(FreshLCD.rasterize(FreshCalculator.getState()))")

def band(p,x0,y0,x1,y1):
    return sum(p[y*96+x] for y in range(y0,y1) for x in range(x0,x1))

def main():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={"width":1080,"height":980})
            errors=[]
            page.on("pageerror",lambda exc:errors.append(str(exc)))
            page.goto((ROOT/"index.html").as_uri())
            page.wait_for_function("Boolean(window.FreshCalculator)")
            for model in ("fx-991es","fx-991es-plus","fx-991es-plus-c"):
                page.select_option("#model-selector",model)
                assert state(page)["model"]==model
                page.evaluate("FreshCalculator.loadExpression('sin(30)')")
                sin=raster(page)
                page.evaluate("FreshCalculator.loadExpression('SIN(30)')")
                caps=raster(page)
                assert sin!=caps, "lowercase should have distinct glyphs"
                press(page,"RCL")
                assert state(page)["pendingMemory"]=="RCL"
                pending=raster(page)
                bottom=band(pending,0,23,96,31)
                if model=="fx-991es":
                    assert bottom<20,(model,bottom)
                else:
                    assert bottom>20,(model,bottom)
                assert page.locator("#lcd-pending").inner_text()=="RCL"
                press(page,"AC")
                assert page.locator("#lcd-pending").inner_text()==""
                press(page,"MODE")
                assert state(page)["screen"]=="menu"
                first=raster(page)
                if model=="fx-991es-plus-c":
                    assert band(first,89,1,96,4)>0
                    press(page,"DOWN")
                    second=raster(page)
                    assert band(second,84,1,89,4)>0
                    assert page.locator("#lcd-replay").inner_text()=="▲"
                    press(page,"UP")
                press(page,"AC")
                press(page,"SHIFT","AC")
                assert state(page)["power"] is False
                assert not any(raster(page))
                assert page.locator("#lcd-shift").inner_text()==""
                press(page,"ON")
                assert state(page)["power"] is True
                print(model,"REA-072 browser PASS")
            assert not errors,errors
        finally:
            browser.close()

if __name__=="__main__":
    main()
