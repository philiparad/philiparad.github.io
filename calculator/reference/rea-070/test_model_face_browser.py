"""REA-070: independent model-face/key-legend browser DOM regression.
Run: python reference/rea-070/test_model_face_browser.py
Requires Playwright + Chromium and serves calculator/index.html via file://.
This checks DOM behavior, not hardware pixel accuracy.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
MODELS=("fx-991es","fx-991es-plus","fx-991es-plus-c")

def legends(page,key):
    return page.evaluate("""key => {
      const button=[...document.querySelectorAll('#keys button[data-key]')]
        .find(node=>node.dataset.key===key);
      if (!button) return null;
      const unit=button.closest('.key-unit');
      return {shift:unit.querySelector('.shift-label')?.textContent||'',
        alpha:unit.querySelector('.alpha-label')?.textContent||'',
        aria:button.getAttribute('aria-label'),
        title:button.title};
    }""",key)

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={"width":1120,"height":920})
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto((ROOT/"index.html").as_uri())
            page.wait_for_function("Boolean(window.FreshCalculator)")
            before=page.locator("#keys button").count()
            assert before==50,before
            for model in MODELS:
                page.select_option("#model-selector",model)
                s=page.evaluate("FreshCalculator.getState()")
                assert s["model"]==model
                assert page.locator("#face").get_attribute("data-model")==model
                assert page.locator("#keys").get_attribute("data-model")==model
                assert page.locator("#keys button").count()==50
                original=model=="fx-991es"
                assert page.locator(".case-model-series").inner_text()==(
                    "NATURAL DISPLAY" if original else "NATURAL-V.P.A.M."
                )
                assert page.locator(".edition-mark").inner_text()==(
                    "TWO WAY POWER" if original else "2nd edition"
                )
                assert legends(page,"COS")["alpha"]==("" if original else "E")
                assert legends(page,"TAN")["alpha"]==("" if original else "F")
                assert legends(page,"6")["shift"]==(
                    "VERIFY" if model=="fx-991es-plus-c" else ""
                )
                assert ("Alpha: E" in legends(page,"COS")["aria"])!=original
                assert page.locator("#face").evaluate(
                    "el=>getComputedStyle(el).backgroundImage"
                ).startswith("linear-gradient")
                print("REA-070 face",model,"PASS")
            page.select_option("#model-selector","fx-991es")
            page.locator('#keys button[data-key="7"]').click()
            assert page.evaluate("FreshCalculator.getState().input")=="7"
            assert not errors,errors
            print("REA-070: browser DOM transition and 50 clickable keys PASS")
        finally:
            browser.close()

if __name__=="__main__":
    main()
