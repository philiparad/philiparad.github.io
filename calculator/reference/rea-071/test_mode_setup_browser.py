"""REA-071 — CASIO fx-991ES/PLUS/C numbered MODE/SETUP LCD routes.
Run from calculator/: python reference/rea-071/test_mode_setup_browser.py
Requires Playwright and Chromium. Tests the modular web build; the
standalone copy is tracked separately under REA-100.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
MODELS=("fx-991es","fx-991es-plus","fx-991es-plus-c")
FIRST=["MthIO","LineIO","Deg","Rad","Gra","Fix","Sci","Norm"]
COMMON=["COMP","CMPLX","STAT","BASE-N","EQN","MATRIX","TABLE","VECTOR"]
SECOND=["ab/c","d/c","CMPLX","STAT","Disp","CONT"]
SECOND_C=["ab/c","d/c","CMPLX","STAT","TABLE","Rdec","Disp","CONT"]

def press(page,*keys):
    for key in keys:
        button=page.locator('#keys button[data-key="'+key+'"]')
        assert button.count()==1,key
        button.click()

def state(page):
    return page.evaluate("FreshCalculator.getState()")

def menus(page):
    return [(str(entry["number"]),entry["label"]) for entry in state(page)["menu"]]

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={"width":1120,"height":1000})
            errors=[]
            page.on("pageerror",lambda err:errors.append(str(err)))
            page.goto((ROOT/"index.html").as_uri())
            page.wait_for_function("Boolean(window.FreshCalculator)")
            for model in MODELS:
                is_c=model=="fx-991es-plus-c"
                page.select_option("#model-selector",model)
                press(page,"MODE")
                assert state(page)["menuKind"]=="mode"
                assert menus(page)==[(str(i+1),v) for i,v in enumerate(COMMON)]
                press(page,"DOWN")
                if is_c:
                    assert state(page)["menuPage"]==1
                    assert menus(page)==[("1","INEQ"),("2","VERIF"),("3","DIST")]
                    press(page,"UP")
                else:
                    assert state(page)["menuPage"]==0
                press(page,"2")
                assert state(page)["mode"]=="CMPLX"
                press(page,"MODE","1")
                assert state(page)["mode"]=="COMP"
                # AC cancels a menu without altering model or selected mode.
                press(page,"MODE","AC")
                assert state(page)["mode"]=="COMP" and state(page)["screen"]=="edit"
                press(page,"SHIFT","MODE")
                assert state(page)["menuKind"]=="setup"
                assert menus(page)==[(str(i+1),v) for i,v in enumerate(FIRST)]
                press(page,"DOWN")
                second=SECOND_C if is_c else SECOND
                assert menus(page)==[(str(i+1),v) for i,v in enumerate(second)]
                press(page,"UP","AC")
                # Nested MathIO routes, angle settings, format menus.
                press(page,"SHIFT","MODE","1","2")
                assert state(page)["math"] and not state(page)["outputMath"]
                press(page,"SHIFT","MODE","1","1")
                assert state(page)["math"] and state(page)["outputMath"]
                press(page,"SHIFT","MODE","4")
                assert state(page)["angle"]=="RAD"
                press(page,"SHIFT","MODE","6","0")
                assert state(page)["format"]=="Fix" and state(page)["digits"]==0
                press(page,"SHIFT","MODE","7","9")
                assert state(page)["format"]=="Sci" and state(page)["digits"]==9
                press(page,"SHIFT","MODE","8","2")
                assert state(page)["format"]=="Norm2"
                # Each second-page numeric entry belongs to the visible model.
                press(page,"SHIFT","MODE","DOWN",("7" if is_c else "5"),"2")
                assert state(page)["decimalSeparator"]=="comma"
                press(page,"SHIFT","MODE","DOWN",("7" if is_c else "5"),"1")
                assert state(page)["decimalSeparator"]=="dot"
                if is_c:
                    press(page,"SHIFT","MODE","DOWN","5","1")
                    assert state(page)["tableFunctions"]==1
                    press(page,"SHIFT","MODE","DOWN","6","2")
                    assert not state(page)["recurringDecimal"]
                    press(page,"MODE","DOWN","1")
                    assert state(page)["mode"]=="INEQ"
                else:
                    press(page,"MODE","DOWN")
                    assert state(page)["menuPage"]==0
                    press(page,"AC")
                print("REA-071 browser",model,"PASS")
            assert not errors,errors
        finally:
            browser.close()

if __name__=="__main__":
    main()
