#!/usr/bin/env python3
"""PLUS-012: native STAT Edit 1 Ins / 2 Del-A and physical DEL behavior."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
async def press(page,*keys):
    for key in keys: await page.locator("#keys button[data-key='"+str(key)+"']").click()
async def snap(page):return await page.evaluate("window.FreshCalculator.getState()")
async def check(page,file):
    await press(page,'MODE','3','1','1','0','EQUAL','2','0','EQUAL','3','0','EQUAL','UP','UP')
    s=await snap(page)
    assert [r['X'] for r in s['statTable']['rows']]==[10,20,30,None],(file,s['statTable']['rows'])
    assert s['statTable']['row']==1,(file,s['statTable']['row'])
    await press(page,'SHIFT','1','3')
    menu=await snap(page)
    assert menu['menuKind']=='stat-edit' and [x['number'] for x in menu['menu']]==['1','2'],(file,menu['menu'])
    assert [x['label'].split('. ',1)[1] for x in menu['menu']]==['Ins','Del-A'],(file,menu['menu'])
    await press(page,'1')
    a=await snap(page)
    assert a['screen']=='stat-table' and [r['X'] for r in a['statTable']['rows']]==[10,None,20,30,None],(file,a['statTable'])
    assert a['statTable']['row']==1
    await press(page,'1','5','EQUAL','DEL')
    b=await snap(page)
    assert [r['X'] for r in b['statTable']['rows']]==[10,15,30,None],(file,b['statTable'])
    assert b['statTable']['row']==2
    await press(page,'SHIFT','1','3','2')
    c=await snap(page)
    assert c['screen']=='stat-table' and len(c['statTable']['rows'])==1,(file,c['statTable'])
    assert c['statTable']['rows'][0]['X'] is None,(file,c['statTable']['rows'])
    assert c['statTable']['row']==0 and c['statTable']['col']==0
    await page.goto(page.url.split('?')[0]+'?plus012=paired',wait_until='load')
    await press(page,'MODE','3','2','1','EQUAL','9','EQUAL','2','EQUAL','8','EQUAL','UP')
    d=await snap(page)
    assert d['statTable']['paired'] is True and len(d['statTable']['rows'])==3,(file,d['statTable'])
    assert d['statTable']['row']==1
    await press(page,'SHIFT','1','3','1')
    e=await snap(page)
    assert len(e['statTable']['rows'])==4 and e['statTable']['rows'][1]['X'] is None,(file,e['statTable'])
    assert e['statTable']['rows'][2]['X']==2 and e['statTable']['rows'][2]['Y']==8
async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page();errors=[]
                    page.on('pageerror',lambda err:errors.append(str(err)))
                    await page.goto(base+file,wait_until='load')
                    await check(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-012 PASS',file,'STAT insert, DEL, Del-A, paired rows')
            finally:await browser.close()
    finally:server.shutdown();server.server_close()
if __name__=='__main__': asyncio.run(main())
