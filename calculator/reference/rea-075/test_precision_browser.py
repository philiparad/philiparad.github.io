"""REA-075 Fix/Sci/Norm UI verification through calculator DOM controls.
Run from calculator/: python reference/rea-075/test_precision_browser.py
Playwright+Chromium required. Does not certify CASIO firmware parity.
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
    return page.evaluate('FreshCalculator.getState()')

def evaluate(page,expression):
    page.evaluate('(expr)=>FreshCalculator.loadExpression(expr)',expression)
    press(page,'EQUAL')
    return state(page)

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1000})
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto((ROOT/'index.html').as_uri())
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                # Select LineIO to isolate the decimal result from exact fractions.
                press(page,'SHIFT','MODE','2')
                assert state(page)['math'] is False
                press(page,'SHIFT','MODE','6','2')
                st=evaluate(page,'999.995')
                assert st['format']=='Fix' and st['digits']==2
                assert st['result']=='1000.00',st
                st=evaluate(page,'1e10')
                assert st['result']=='1.000000000×10^10',st
                press(page,'SHIFT','MODE','6','0')
                assert evaluate(page,'-2.5')['result']=='-3'
                press(page,'SHIFT','MODE','7','3')
                st=evaluate(page,'999.995')
                assert st['result']=='1.00×10^3',st
                st=evaluate(page,'9.999999999e99')
                assert st['result']=='9.999999999×10^99',st
                press(page,'SHIFT','MODE','8','1')
                assert evaluate(page,'0.0099')['result']=='9.9×10^-3'
                press(page,'SHIFT','MODE','8','2')
                assert evaluate(page,'0.0099')['result']=='0.0099'
                assert evaluate(page,'1e-99')['result']=='1×10^-99'
                assert evaluate(page,'1e-100')['result']=='0'
                st=evaluate(page,'1e100')
                assert st['screen']=='error',st
                press(page,'AC')
                assert state(page)['screen']=='edit'
                # Restore MathIO and confirm Fix settings do not corrupt Ans.
                press(page,'SHIFT','MODE','1','1')
                assert state(page)['math'] and state(page)['outputMath']
                print(model,'REA-075 Fix/Sci/Norm browser PASS')
            assert not errors,errors
        finally:
            browser.close()

if __name__=='__main__':
    main()
