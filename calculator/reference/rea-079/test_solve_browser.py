"""REA-079: SOLVE SHIFT+CALC workflow on the actual calculator DOM.
Run: python calculator/reference/rea-079/test_solve_browser.py
Requires Playwright+Chromium. Tests the independent web implementation, not
real-CASIO screenshots or firmware iteration state.
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

def field(page,name,index,total):
    s=state(page)
    assert s['screen']=='prompt',s
    assert s['flow']['title'].startswith('SOLVE '),s
    assert (s['flow']['fieldId'],s['flow']['index'],s['flow']['fieldCount'])==(name,index,total),s
    return s

def calculate(page):
    page.wait_for_function("FreshCalculator.getState().screen !== 'calculating'",timeout=12000)
    return state(page)

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        try:
            page=browser.new_page(viewport={'width':1100,'height':1000})
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            page.goto((ROOT/'index.html').as_uri())
            page.wait_for_function('Boolean(window.FreshCalculator)')
            for model in ('fx-991es','fx-991es-plus','fx-991es-plus-c'):
                page.select_option('#model-selector',model)
                expression(page,'Y=A*X^2+B')
                initial=dict(state(page)['memory'])
                previous_ans=state(page)['ans']
                press(page,'SHIFT','CALC')
                assert field(page,'Y',0,4)['flow']['buffer']==str(initial['Y'])
                press(page,'0','EQUAL')
                field(page,'A',1,4)
                press(page,'1','EQUAL')
                field(page,'B',2,4)
                press(page,'NEG','2','EQUAL')
                s=field(page,'guess',3,4)
                assert s['flow']['fieldId']=='guess',s
                # Before convergence neither memory nor Ans may change.
                assert s['memory']==initial and s['ans']==previous_ans,s
                press(page,'1','EQUAL')
                s=calculate(page)
                assert s['screen']=='flow-result',s
                assert abs(s['memory']['X']-2**0.5)<1e-6,s
                assert s['memory']['A']==1 and s['memory']['B']==-2
                assert s['memory']['Y']==0
                assert s['ans']==previous_ans
                assert s['solveSession']['source']=='Y=A*X^2+B'
                assert s['outputLines'][0]=='Y=A*X^2+B',s
                assert s['outputLines'][1].startswith('X= '),s
                assert s['outputLines'][2].startswith('L-R= '),s
                assert abs(s['solveSession']['residual'])<1e-7,s
                # Equal on solution screen starts a new initial-value session.
                press(page,'EQUAL')
                field(page,'Y',0,4)
                press(page,'EQUAL')
                field(page,'A',1,4)
                press(page,'EQUAL')
                field(page,'B',2,4)
                press(page,'EQUAL')
                prompt=field(page,'guess',3,4)
                assert abs(float(prompt['flow']['buffer'])-2**0.5)<1e-6,prompt
                press(page,'EQUAL')
                s=calculate(page)
                assert s['screen']=='flow-result' and abs(s['memory']['X']-2**0.5)<1e-6,s
                # The AC key exits SOLVE but preserves already committed X.
                value=s['memory']['X']
                press(page,'AC')
                assert state(page)['screen']=='edit' and state(page)['memory']['X']==value
                # Cancel while entering a fresh initial X: no writes.
                expression(page,'X^2-2')
                old=dict(state(page)['memory'])
                press(page,'SHIFT','CALC')
                field(page,'guess',0,1)
                press(page,'AC')
                assert state(page)['memory']==old
                # Constant-positive function has no real root.
                expression(page,'X^2+1')
                press(page,'SHIFT','CALC','1','EQUAL')
                s=calculate(page)
                assert s['screen']=='prompt',s
                assert s['memory']==old,s
                assert 'Solve' in s['info'] or 'Time Out' in s['info'],s
                press(page,'AC')
                # Function pole cannot be reported as a zero residual.
                expression(page,'1/X')
                press(page,'SHIFT','CALC','0','EQUAL')
                s=calculate(page)
                assert s['screen']=='prompt' and s['memory']==old,s
                press(page,'AC')
                # Slow Newton sequence offers genuine continuation state.
                expression(page,'(X-1)^7')
                press(page,'SHIFT','CALC','2','EQUAL')
                s=calculate(page)
                if s['solveSession'] and s['solveSession'].get('pending'):
                    assert s['outputLines'][0]=='Continue: [=]',s
                    iteration=s['solveSession']['iterations']
                    preserved=dict(s['memory'])
                    press(page,'EQUAL')
                    s=calculate(page)
                    assert s['memory']==preserved or s['screen']=='flow-result'
                    if s['solveSession'].get('pending'):
                        assert s['solveSession']['iterations']>iteration
                press(page,'AC')
                assert not errors,errors
                print('REA-079 SOLVE',model,'PASS')
        finally:
            browser.close()

if __name__=='__main__':
    main()
