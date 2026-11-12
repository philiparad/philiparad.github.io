#!/usr/bin/env python3
"""PLUS-008: real FREQ SETUP key sequences and STAT-type data retention."""
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
    await page.goto(page.url.split('?')[0]+'?plus008='+tag,wait_until='load')
    await page.locator("#keys button[data-key='MODE']").wait_for()
async def set_freq(page,enabled):
    await press(page,'SHIFT','MODE','DOWN','4','1' if enabled else '2')
async def check(page,file):
    await fresh(page,'freq-reset')
    await press(page,'MODE','3','1','5','EQUAL')
    a=await state(page)
    assert a['statTable']['rows'][0]['X']==5,(file,'data entry',a['statTable'])
    await set_freq(page,True)
    b=await state(page)
    assert b['mode']=='STAT' and b['screen']=='stat-table',(file,b['mode'],b['screen'])
    assert b['statFrequency'] is True and b['statTable']['frequency'] is True,(file,'ON',b['statFrequency'])
    assert len(b['statTable']['rows'])==1 and b['statTable']['rows'][0]['X'] is None,(file,'ON did not clear data')
    await press(page,'7','EQUAL')
    c=await state(page)
    assert c['statTable']['rows'][0]['X']==7
    await set_freq(page,True)
    same=await state(page)
    assert same['statTable']['rows'][0]['X']==7,(file,'unchanged FREQ erased observations')
    await set_freq(page,False)
    off=await state(page)
    assert off['statFrequency'] is False and off['statTable']['frequency'] is False
    assert len(off['statTable']['rows'])==1 and off['statTable']['rows'][0]['X'] is None,(file,'OFF did not clear data')
    await fresh(page,'type-preserve')
    await press(page,'MODE','3','2','3','EQUAL','4','EQUAL')
    paired=await state(page)
    assert paired['statTable']['rows'][0]['X']==3 and paired['statTable']['rows'][0]['Y']==4,(file,'paired input')
    await press(page,'SHIFT','1','1','3')
    similar=await state(page)
    assert similar['mode']=='STAT' and similar['statTable']['regressionType']=='QUAD',(file,'regression subtype')
    assert similar['statTable']['rows'][0]['X']==3 and similar['statTable']['rows'][0]['Y']==4,(file,'same-arity data lost')
    await press(page,'SHIFT','1','1','1')
    changed=await state(page)
    assert changed['statTable']['regressionType']=='1VAR'
    assert changed['statTable']['paired'] is False and changed['statTable']['rows'][0]['X'] is None,(file,'1VAR did not reset')
    await press(page,'8','EQUAL','MODE','1','MODE','3','1')
    entered=await state(page)
    assert entered['mode']=='STAT' and entered['statTable']['rows'][0]['X'] is None,(file,'leaving STAT did not clear')
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
                    await check(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-008',file,'STAT FREQ and type-switch keylogs PASS')
            finally: await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__': asyncio.run(main())
