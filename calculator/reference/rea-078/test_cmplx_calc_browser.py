"""REA-078 CALC in CMPLX and named equalities: real DOM-key browser checks.
Run from calculator/: python reference/rea-078/test_cmplx_calc_browser.py
Requires Playwright Chromium. Not manufacturer-device parity evidence.
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

def expression(page,text):
    page.evaluate('(s)=>FreshCalculator.loadExpression(s)',text)

def expect_prompt(page,name,index,total):
    s=state(page)
    assert s['screen']=='prompt' and s['flow']['title'].startswith('CALC '),s
    assert (s['flow']['fieldId'],s['flow']['index'],s['flow']['fieldCount'])==(name,index,total),s
    return s

def main():
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1000})
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            page.goto((ROOT/'index.html').as_uri())
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                press(page,'MODE','2')
                assert state(page)['mode']=='CMPLX',state(page)
                expression(page,'A+Bi►r∠θ')
                press(page,'CALC')
                expect_prompt(page,'A',0,2)
                press(page,'SQRT','3','RP','EQUAL')
                expect_prompt(page,'B',1,2)
                assert state(page)['memory']['A']==0,'No early memory writes'
                press(page,'1','EQUAL')
                s=state(page)
                assert s['screen']=='result' and s['result']=='2∠30',s
                assert s['complexDisplayFormat']=='polar',s
                assert s['calcSession']['statementResults'][0]['text']=='2∠30'
                # Replay with the second documented official vector.
                press(page,'EQUAL')
                expect_prompt(page,'A',0,2)
                press(page,'1','EQUAL')
                expect_prompt(page,'B',1,2)
                press(page,'SQRT','3','RP','EQUAL')
                s=state(page)
                assert s['result']=='2∠60',s
                assert s['complexDisplayFormat']=='polar'
                # A complex-valued CALC prompt: A=1+2i, B=3-i.
                expression(page,'A+Bi')
                press(page,'CALC')
                expect_prompt(page,'A',0,2)
                press(page,'1','ADD','2','ENG','EQUAL')
                expect_prompt(page,'B',1,2)
                press(page,'3','SUB','ENG','EQUAL')
                s=state(page)
                assert s['screen']=='result' and s['result']=='2+5i',s
                assert s['complexMemory']['A']=={'re':1,'im':2},s
                assert s['complexMemory']['B']=={'re':3,'im':-1},s
                # Named output: Y is label, not input or an assigned register.
                before=s['memory']['Y']
                expression(page,'Y=A+Bi')
                press(page,'CALC')
                expect_prompt(page,'A',0,2)
                press(page,'2','EQUAL')
                expect_prompt(page,'B',1,2)
                press(page,'1','EQUAL')
                s=state(page)
                assert s['result']=='2+i',s
                assert s['calcSession']['statementResults'][0]['target']=='Y',s
                assert s['memory']['Y']==before,s
                # Multi-statements preserve each result but show final Ans.
                expression(page,'Y=A+Bi:Ans+2')
                press(page,'CALC','1','EQUAL','2','EQUAL')
                s=state(page)
                assert s['result']=='3+2i',s
                assert len(s['calcSession']['statementResults'])==2,s
                assert [v['target'] for v in s['calcSession']['statementResults']]==['Y',None],s
                # Error on the last statement must preserve all registers.
                before=state(page)['memory']
                before_complex=state(page)['complexMemory']
                expression(page,'A+Bi:1/(B-B)')
                press(page,'CALC','1','EQUAL','1','EQUAL')
                s=state(page)
                assert s['screen']=='prompt' and s['flow']['fieldId']=='B',s
                assert s['memory']==before and s['complexMemory']==before_complex,s
                press(page,'AC')
                assert state(page)['screen']=='edit'
                # Verify the ALPHA+CALC equality insertion route.
                expression(page,'Y')
                press(page,'ALPHA','CALC')
                assert state(page)['input']=='Y=',state(page)
                # Original E/F registers are not offered; PLUS models support.
                expression(page,'E=A+B')
                press(page,'CALC')
                if model=='fx-991es':
                    assert state(page)['screen']=='edit',state(page)
                else:
                    expect_prompt(page,'A',0,2)
                    press(page,'AC')
                press(page,'MODE','1')
                assert state(page)['mode']=='COMP'
                print('REA-078 CMPLX and equation browser',model,'PASS')
            assert not errors,errors
        finally:
            browser.close()

if __name__=='__main__':
    main()
