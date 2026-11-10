"""REA-076 browser key-sequence verification for S⇔D and SHIFT S⇔D.
Run: python calculator/reference/rea-076/test_sd_browser.py
Requires Playwright Chromium. Not evidence of manufacturer hardware parity.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]

def press(page,*keys):
    for key in keys:
        b=page.locator('#keys button[data-key="'+key+'"]')
        assert b.count()==1,key
        b.click()

def state(page):
    return page.evaluate('FreshCalculator.getState()')

def calc(page,expression):
    page.evaluate('(expression)=>FreshCalculator.loadExpression(expression)',expression)
    press(page,'EQUAL')
    assert state(page)['screen']=='result',state(page)
    return state(page)

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1000})
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto((ROOT/'index.html').as_uri())
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                # Make C recurring OFF to check the ordinary S⇔D table.
                if model=='fx-991es-plus-c':
                    press(page,'SHIFT','MODE','DOWN','6','2')
                press(page,'SHIFT','MODE','1','1') # MathIO MathO
                s=calc(page,'7/3')
                assert s['result']=='7/3',s
                press(page,'SHIFT','SD')
                assert state(page)['result']=='2 1/3',state(page)
                press(page,'SHIFT','SD')
                assert state(page)['result']=='7/3',state(page)
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SD')
                assert state(page)['result']=='7/3'
                s=calc(page,'sqrt(8)/2')
                assert s['result']=='√2',s
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SD')
                assert state(page)['result']=='√2',state(page)
                s=calc(page,'pi/6')
                assert s['result']=='π/6',s
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SD')
                assert state(page)['result']=='π/6'
                calc(page,'sqrt(2)+sqrt(3)')
                initial=state(page)['result']
                press(page,'SD')
                assert state(page)['result']==initial
                calc(page,'-7/3')
                press(page,'SHIFT','SD')
                assert state(page)['result']=='-2 1/3',state(page)
                # LineIO permits rational fraction but not surd restoration.
                press(page,'SHIFT','MODE','2')
                assert state(page)['math'] is False
                s=calc(page,'1/5')
                assert s['resultPresentation']['chosen']['kind']=='decimal'
                press(page,'SD')
                assert state(page)['result']=='1/5',state(page)
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                calc(page,'sqrt(8)/2')
                press(page,'SD')
                assert state(page)['resultPresentation']['chosen']['kind']=='decimal'
                # No conversion in edit mode.
                press(page,'AC','SD')
                assert state(page)['screen']=='edit'
                assert not errors,errors
                print(model,'REA-076 browser transitions PASS')
            assert not errors,errors
        finally:
            browser.close()

if __name__=='__main__':
    main()
