"""REA-077 CALC prompts and replay with actual calculator DOM key clicks.
Run from calculator/: python reference/rea-077/test_calc_browser.py
Playwright+Chromium required. Does not establish physical CASIO parity.
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
def expression(page,source):
    page.evaluate('(s)=>FreshCalculator.loadExpression(s)',source)
def prompt(page,name,index,total):
    s=state(page)
    assert s['screen']=='prompt' and s['flow']['title'].startswith('CALC '),s
    assert (s['flow']['fieldId'],s['flow']['index'],s['flow']['fieldCount'])==(name,index,total),s
    return s
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
                expression(page,'3A+B')
                press(page,'CALC')
                prompt(page,'A',0,2)
                press(page,'5','EQUAL')
                prompt(page,'B',1,2)
                assert state(page)['memory']['A']==0
                press(page,'1','0','EQUAL')
                s=state(page)
                assert s['screen']=='result' and s['ans']==25,s
                assert s['input']=='3A+B' and s['memory']['A']==5 and s['memory']['B']==10,s
                press(page,'EQUAL')
                assert prompt(page,'A',0,2)['flow']['buffer']=='5'
                press(page,'7','EQUAL')
                assert prompt(page,'B',1,2)['flow']['buffer']=='10'
                press(page,'2','0','EQUAL')
                assert state(page)['ans']==41,state(page)
                assert state(page)['memory']['A']==7 and state(page)['memory']['B']==20
                press(page,'CALC')
                prompt(page,'A',0,2)
                press(page,'AC')
                assert state(page)['screen']=='edit' and state(page)['calcSession'] is None
                before=dict(state(page)['memory'])
                expression(page,'X+Y')
                press(page,'CALC')
                prompt(page,'X',0,2)
                press(page,'4','EQUAL')
                prompt(page,'Y',1,2)
                press(page,'UP')
                prompt(page,'X',0,2)
                press(page,'DOWN')
                prompt(page,'Y',1,2)
                press(page,'AC')
                assert state(page)['memory']==before
                expression(page,'X/(Y-Y)')
                press(page,'CALC','2','EQUAL','1','EQUAL')
                assert prompt(page,'Y',1,2)['flow']['fieldId']=='Y'
                assert state(page)['memory']==before
                press(page,'AC')
                expression(page,'X+Y:X(X+Y)')
                press(page,'CALC')
                prompt(page,'X',0,2)
                press(page,'2','EQUAL')
                prompt(page,'Y',1,2)
                press(page,'3','EQUAL')
                assert state(page)['ans']==10,state(page)
                expression(page,'Y=X^2+X+3')
                press(page,'CALC')
                prompt(page,'X',0,1)
                press(page,'2','EQUAL')
                assert state(page)['ans']==9,state(page)
                expression(page,'E+F')
                press(page,'CALC')
                if model=='fx-991es':
                    assert state(page)['screen']=='edit'
                else:
                    prompt(page,'E',0,2)
                    press(page,'2','EQUAL')
                    prompt(page,'F',1,2)
                    press(page,'3','EQUAL')
                    assert state(page)['ans']==5
                press(page,'MODE','2')
                assert state(page)['mode']=='CMPLX'
                expression(page,'A+Bi')
                press(page,'CALC')
                prompt(page,'A',0,2)
                press(page,'1','EQUAL')
                prompt(page,'B',1,2)
                press(page,'2','EQUAL')
                z=state(page)['complexAns']
                assert z['re']==1 and z['im']==2,state(page)
                press(page,'CALC')
                prompt(page,'A',0,2)
                press(page,'AC')
                press(page,'MODE','1')
                print('REA-077 browser',model,'PASS')
            assert not errors,errors
        finally:
            browser.close()
if __name__=='__main__':
    main()
