#!/usr/bin/env python3
"""PLUS-005: ALPHA physical legends and safe editor/prompt routing."""
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
    await page.goto(page.url.split('?')[0]+'?plus005='+tag,wait_until='load')
    await page.locator("#keys button[data-key='ALPHA']").wait_for()
async def test_page(page,file):
    for key,symbol in [('NEG','A'),('DMS','B'),('HYP','C'),('SIN','D'),
                       ('COS','E'),('TAN','F'),('LP','X'),('RP','Y'),
                       ('MPLUS','M'),('EXP','e'),('ENG',':'),('CALC','='),
                       ('DOT','RanInt#(')]:
        await fresh(page,key)
        await press(page,'ALPHA',key)
        snap=await state(page)
        assert snap['mode']=='COMP' and snap['screen']=='edit',(file,key,snap)
        assert snap['input']!= '',(file,key,'ALPHA did not insert')
        assert symbol in snap['input'],(file,key,snap['input'],symbol)
        assert snap['alpha'] is False,(file,key,'ALPHA not consumed')
    for key in ('7','8','9','0','AC','SQUARE','POWER','LOG'):
        await fresh(page,'unlabelled'+key)
        await press(page,'2')
        original=await state(page)
        await press(page,'ALPHA',key)
        current=await state(page)
        assert current['mode']==original['mode'],(file,key,'mode changed')
        assert current['screen']==original['screen'],(file,key,'screen changed')
        assert current['input']==original['input'],(file,key,'input changed')
        assert current['alpha'] is False,(file,key,'ALPHA not consumed')
    for route,name in [(('MODE','5','3'),'eqn-coeff'),
                       (('MODE','3','1'),'stat-table'),
                       (('MODE','6','1','5'),'matrix-table'),
                       (('MODE','8','1','1'),'vector-table')]:
        await fresh(page,name)
        await press(page,*route)
        original=await state(page)
        assert original['screen']==name,(file,route,original['screen'])
        await press(page,'ALPHA','7')
        current=await state(page)
        assert current['screen']==name and current['mode']==original['mode']
        if name=='eqn-coeff':
            assert current['eqnEditor']['buffer']==original['eqnEditor']['buffer']
        if name=='stat-table':
            assert current['statTable']['buffer']==original['statTable']['buffer']
        assert current['alpha'] is False,(file,name,'ALPHA remained active')
    await fresh(page,'prompt')
    await press(page,'MODE','7')
    assert (await state(page))['screen']=='prompt'
    await press(page,'ALPHA','LP')
    a=await state(page)
    assert a['flow']['buffer']=='X',(file,'ALPHA X in TABLE prompt',a['flow']['buffer'])
    await press(page,'ALPHA','7')
    b=await state(page)
    assert b['flow']['buffer']=='X',(file,'ALPHA 7 in TABLE prompt',b['flow']['buffer'])
    await press(page,'ALPHA','EXP')
    c=await state(page)
    assert c['flow']['buffer']=='Xe',(file,'ALPHA e in TABLE prompt',c['flow']['buffer'])
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
                    await test_page(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-005',file,'ALPHA key/editor/prompt tests PASS')
            finally:
                await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__':
    asyncio.run(main())
