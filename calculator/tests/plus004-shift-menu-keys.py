#!/usr/bin/env python3
"""PLUS-004: actual keypad SHIFT+1..5 never changes MODE."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
CONTEXTS=(
    (('MODE','3','1'),'1','STAT','STAT'),
    (('MODE','2'),'2','CMPLX','CMPLX'),
    (('MODE','4'),'3','BASE-N','BASE logic'),
    (('MODE','6','1','5'),'4','MATRIX','MATRIX'),
    (('MODE','8','1','1'),'5','VECTOR','VECTOR'),
)
async def press(page,*keys):
    for key in keys:
        await page.locator('#keys button[data-key="'+key+'"]').click()
async def state(page):
    return await page.evaluate('window.FreshCalculator.getState()')
async def checks(page,file):
    base=page.url.split('?')[0]
    for number in '12345':
        await page.goto(base+'?plus004='+number,wait_until='load')
        await press(page,'7')
        before=await state(page)
        await press(page,'SHIFT',number)
        after=await state(page)
        assert after['mode']=='COMP' and after['screen']=='edit',(file,number,after)
        assert after['input']==before['input'],(file,number,'unavailable SHIFT changed input')
        assert after['shift'] is False
    for route,key,mode,title in CONTEXTS:
        await page.goto(base+'?plus004=context'+key,wait_until='load')
        await press(page,*route)
        before=await state(page)
        assert before['mode']==mode,(file,key,'mode entry')
        await press(page,'SHIFT',key)
        after=await state(page)
        assert after['mode']==mode,(file,key,'SHIFT switched MODE')
        assert after['screen']=='menu' and after['menuTitle']==title,(file,key,after['screen'],after['menuTitle'])
        await press(page,'AC')
        assert (await state(page))['mode']==mode,(file,key,'menu cancel changed MODE')
async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page()
                    errors=[]
                    page.on('pageerror',lambda exc:errors.append(str(exc)))
                    await page.goto(base+file,wait_until='load')
                    await checks(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-004 '+file+' SHIFT+1..5 context behavior PASS')
            finally: await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__': asyncio.run(main())
