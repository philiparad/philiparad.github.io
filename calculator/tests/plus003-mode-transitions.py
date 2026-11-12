#!/usr/bin/env python3
"""PLUS-003: real keyclick verification of eight modes and MODE/SETUP cancellation."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
MODES=('COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR')
SCREENS=('edit','edit','menu','edit','menu','menu','prompt','menu')
LINEAR={'STAT','BASE-N','MATRIX','VECTOR'}
FILES=('index.html','fx991_fresh_standalone.html')

async def press(page,*keys):
    for key in keys:
        await page.locator('#keys button[data-key="'+key+'"]').click()

async def state(page):
    return await page.evaluate('window.FreshCalculator.getState()')

async def check(page,file):
    for n,(mode,screen) in enumerate(zip(MODES,SCREENS),1):
        await page.goto(page.url.split('?')[0]+'?task=plus003-'+str(n),wait_until='load')
        await page.locator("#keys button[data-key='MODE']").wait_for()
        initial=await state(page)
        assert initial['model']=='fx-991es-plus',(file,initial['model'])
        assert initial['mode']=='COMP'
        await press(page,'MODE')
        menu=await state(page)
        assert menu['screen']=='menu' and menu['menuKind']=='mode',(file,n,menu['screen'])
        assert len(menu['menuEntries'])==8 and menu['menuPage']==0,(file,n,menu['menuEntries'])
        await press(page,'9')
        assert (await state(page))['screen']=='menu',(file,n,'invalid MODE number accepted')
        await press(page,'AC')
        assert (await state(page))['screen']=='edit',(file,n,'MODE cancel')
        await press(page,'MODE',str(n))
        entered=await state(page)
        assert entered['mode']==mode and entered['screen']==screen,(file,n,mode,entered['mode'],entered['screen'])
        assert entered['error']=='',(file,n,entered['error'])
        if mode in LINEAR:
            assert entered['math'] is False,(file,n,'Auto LineIO missing')
        await press(page,'MODE')
        assert (await state(page))['menuKind']=='mode',(file,n,'nested MODE')
        await press(page,'AC')
        assert (await state(page))['mode']==mode,(file,n,'MODE cancel changed mode')
        await press(page,'MODE','1')
        back=await state(page)
        assert back['mode']=='COMP' and back['screen']=='edit',(file,n,'COMP return')
        assert back['flow'] is None and back['outputLines']==[],(file,n,'stale flow after mode change')
    await page.goto(page.url.split('?')[0]+'?task=plus003-prompt',wait_until='load')
    await press(page,'MODE','7')
    assert (await state(page))['screen']=='prompt'
    await press(page,'MODE')
    assert (await state(page))['screen']=='menu'
    await press(page,'AC')
    assert (await state(page))['screen']=='prompt'
    await press(page,'MODE','2')
    assert (await state(page))['mode']=='CMPLX' and (await state(page))['flow'] is None
    await page.goto(page.url.split('?')[0]+'?task=plus003-eqn',wait_until='load')
    await press(page,'MODE','5','3')
    assert (await state(page))['screen']=='eqn-coeff'
    await press(page,'MODE','AC')
    assert (await state(page))['screen']=='eqn-coeff'
    await press(page,'SHIFT','MODE')
    assert (await state(page))['menuKind']=='setup'
    await press(page,'AC')
    assert (await state(page))['screen']=='eqn-coeff'
    await page.goto(page.url.split('?')[0]+'?task=plus003-stat',wait_until='load')
    await press(page,'MODE','3','1')
    assert (await state(page))['screen']=='stat-table'
    await press(page,'MODE','AC')
    assert (await state(page))['screen']=='stat-table'
    await press(page,'MODE','1')
    assert (await state(page))['mode']=='COMP'
    assert (await state(page))['statTable'] is None

async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    root='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for name in FILES:
                    page=await browser.new_page()
                    errors=[]
                    page.on('pageerror',lambda exc:errors.append(str(exc)))
                    await page.goto(root+name,wait_until='load')
                    await check(page,name)
                    assert not errors,(name,errors)
                    await page.close()
                    print('PLUS-003: '+name+' eight MODE paths + editor cancel/return PASS')
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__':
    asyncio.run(main())
