#!/usr/bin/env python3
"""PLUS-007: live Math, Syntax, Variable and SOLVE prompt errors."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+key+"']").click()
async def state(page):
    return await page.evaluate('window.FreshCalculator.getState()')
async def fresh(page,tag):
    await page.goto(page.url.split('?')[0]+'?plus007='+tag,wait_until='load')
    await page.locator("#keys button[data-key='MODE']").wait_for()
async def checks(page,name):
    await fresh(page,'division')
    await press(page,'1','4','DIV','0','MUL','2','EQUAL')
    bad=await state(page)
    assert bad['screen']=='error' and bad['error']=='Math ERROR',(name,bad['screen'],bad['error'])
    await press(page,'RIGHT')
    edit=await state(page)
    assert edit['screen']=='edit' and edit['cursor']==3 and edit['input']=='14/0*2',(name,edit['cursor'],edit['input'])
    await press(page,'1','EQUAL')
    result=await state(page)
    assert result['screen']=='result' and abs(result['raw']-2.8)<1e-10,(name,result['screen'],result['result'])
    await fresh(page,'cancel')
    await press(page,'1','DIV','0','EQUAL','AC')
    erased=await state(page)
    assert erased['screen']=='edit' and erased['input']=='' and erased['error']=='',(name,erased)
    await fresh(page,'syntax')
    await press(page,'1','ADD','EQUAL')
    wrong=await state(page)
    assert wrong['screen']=='error' and wrong['error']=='Syntax ERROR',(name,wrong['screen'],wrong['error'])
    await press(page,'LEFT')
    corrected=await state(page)
    assert corrected['screen']=='edit' and corrected['input']=='1+'
    await fresh(page,'solve-missing-x')
    await press(page,'2','ADD','3','SHIFT','CALC')
    miss=await state(page)
    assert miss['screen']=='error' and miss['error']=='Variable ERROR',(name,miss['screen'],miss['error'])
    await press(page,'RIGHT')
    restored=await state(page)
    assert restored['screen']=='edit' and restored['input']=='2+3',(name,restored)
    await fresh(page,'solve-guess')
    await press(page,'ALPHA','LP','SUB','2','SHIFT','CALC')
    s=await state(page)
    assert s['screen']=='prompt' and s['flow']['title'].startswith('SOLVE'),(name,s['screen'],s.get('flow'))
    memory=s['memory']['X']
    await press(page,'1','DIV','0','EQUAL')
    badguess=await state(page)
    assert badguess['screen']=='error' and badguess['error']=='Math ERROR',(name,badguess['screen'],badguess['error'])
    assert badguess['memory']['X']==memory,(name,'premature memory update')
    await press(page,'RIGHT')
    resumed=await state(page)
    assert resumed['screen']=='prompt' and resumed['flow']['buffer']=='1/0',(name,resumed['screen'],resumed['flow']['buffer'])
    await press(page,'1')
    fixed=await state(page)
    assert fixed['flow']['buffer']=='1/10',(name,fixed['flow']['buffer'])
    await press(page,'EQUAL')
    running=await state(page)
    assert running['screen'] in ('calculating','flow-result'),(name,running['screen'])
async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page()
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    await page.goto(url+file,wait_until='load')
                    await checks(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-007',file,'error classification and caret recovery PASS')
            finally: await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__': asyncio.run(main())
