"""REA-074 MathIO exact radicals and pi: actual calculator DOM-key regression.
Run: python calculator/reference/rea-074/test_exact_browser.py
Requires Playwright and Chromium; hardware parity is NOT asserted.
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

def expression(page,text):
    page.evaluate('(text)=>FreshCalculator.loadExpression(text)',text)

def verify(page,source,expected,kind):
    expression(page,source)
    press(page,'EQUAL')
    s=state(page)
    assert s['screen']=='result', (source,s)
    assert s['result']==expected, (source,s['result'],expected)
    assert s['resultPresentation']['chosen']['kind']==kind, (source,s)
    return s

def main():
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1120,'height':1000})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto((ROOT/'index.html').as_uri())
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                s=state(page)
                assert s['math'] is True and s['outputMath'] is True and s['mode']=='COMP'
                verify(page,'sqrt(8)/2','√2','surd')
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SD')
                assert state(page)['result']=='√2'
                verify(page,'sqrt(2)+sqrt(2)','2√2','surd')
                verify(page,'pi/2+pi/3','5π/6','pi')
                verify(page,'(1+sqrt(2))^2','3+2√2','surd')
                expression(page,'sqrt(2)+sqrt(3)')
                press(page,'EQUAL')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                verify(page,'sqrt(2)^2','2','decimal')
                assert state(page)['ansRational']=={'numerator':'2','denominator':'1'}
                # Full keypad path, not just direct expression injection.
                press(page,'AC','SQRT','8','RIGHT','DIV','2','EQUAL')
                assert state(page)['result']=='√2',state(page)
                press(page,'SHIFT','MODE','2') # SETUP LineIO
                expression(page,'sqrt(8)/2')
                press(page,'EQUAL')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SHIFT','MODE','1','1') # MathIO-MathO
                assert state(page)['math'] and state(page)['outputMath']
                print(model,'REA-074 browser symbolic/decimal PASS')
            assert not errors,errors
        finally:
            browser.close()

if __name__=='__main__':
    main()
