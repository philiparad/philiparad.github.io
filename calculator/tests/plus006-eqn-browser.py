#!/usr/bin/env python3
"""PLUS-006: actual keypad entry of expressions in each EQN type."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
CASES=(
 ('1',(('SQRT','9','RP'),('1',),('3',),('1',),('NEG','1'),('1',)),'LINEAR2',2),
 ('2',(('1',),('0',),('0',),('2',),('0',),('1',),('0',),('3',),
       ('0',),('0',),('1',),('4',)),'LINEAR3',2),
 ('3',(('SQRT','9','RP'),('0',),('NEG','1','2')),'QUAD',-2),
 ('4',(('1',),('NEG','2'),('NEG','1'),('2',)),'CUBIC',-1),
)
async def press(page,*keys):
    for key in keys:
        await page.locator("#keys button[data-key='"+str(key)+"']").click()
async def state(page):
    return await page.evaluate('window.FreshCalculator.getState()')
async def run(page,file):
    base=page.url.split('?')[0]
    for option,coeffs,kind,want in CASES:
        await page.goto(base+'?plus006='+option,wait_until='load')
        await press(page,'MODE','5',option)
        status=await state(page)
        assert status['screen']=='eqn-coeff' and status['eqnEditor']['type']==kind
        for keys in coeffs:
            await press(page,*keys,'EQUAL')
        result=await state(page)
        assert result['screen']=='eqn-result',(file,option,result['screen'],result['error'])
        assert abs(result['eqnSession']['solutions'][0]['value']-want)<1e-7,(file,option,result['result'])
        await press(page,'AC')
        assert (await state(page))['screen']=='eqn-coeff'
    await page.goto(base+'?plus006=cursor',wait_until='load')
    await press(page,'MODE','5','3','1','ADD','2','MUL','3','LEFT','DEL','MUL','EQUAL')
    result=await state(page)
    assert result['screen']=='eqn-coeff',(file,result['screen'],result['error'])
    assert result['eqnEditor']['values']['a']==7,(file,result['eqnEditor']['values'])
async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    root='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page()
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    await page.goto(root+file,wait_until='load')
                    await run(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-006',file,'four EQN types and cursor editing PASS')
            finally: await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__': asyncio.run(main())
