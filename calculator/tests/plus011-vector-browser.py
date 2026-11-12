#!/usr/bin/env python3
"""PLUS-011: printed VECTOR seven-entry menu, vector expressions, STO keylog."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
async def press(page,*keys):
    for k in keys: await page.locator("#keys button[data-key='"+str(k)+"']").click()
async def snap(page):return await page.evaluate("window.FreshCalculator.getState()")
async def write(page,values):
    for val in values:
        if val<0:await press(page,'NEG',str(-val),'EQUAL')
        else:await press(page,str(val),'EQUAL')
async def check(page,file):
    await press(page,'MODE','8')
    assert (await snap(page))['menuTitle']=='Vector?',file
    await press(page,'1','1') # VctA 2D
    assert (await snap(page))['screen']=='vector-table'
    await write(page,(1,2))
    await press(page,'SHIFT','5')
    menu=await snap(page)
    assert menu['screen']=='menu'
    assert [x['number'] for x in menu['menu']]==list('1234567'),(file,menu['menu'])
    assert [x['label'].split('. ',1)[1] for x in menu['menu']]==['Dim','Data','VctA','VctB','VctC','VctAns','Dot'],(file,menu['menu'])
    await press(page,'AC','SHIFT','5','1','2','1')
    await write(page,(3,4))
    await press(page,'SHIFT','5','3','ADD','SHIFT','5','4','EQUAL')
    a=await snap(page)
    assert a['screen']=='vector-result' and a['vectors']['VctAns']['data']==[4,6],(file,a['screen'],a['vectors']['VctAns'])
    await press(page,'SHIFT','RCL')
    b=await snap(page)
    assert b['vectorCopySource']=='VctAns',(file,b['vectorCopySource'])
    await press(page,'HYP') # printed VctC destination
    c=await snap(page)
    assert c['screen']=='vector-table' and c['vectors']['VctC']['data']==[4,6],(file,c['screen'],c['vectors']['VctC'])
    await press(page,'AC','SHIFT','5','3','SHIFT','5','7','SHIFT','5','4','EQUAL')
    d=await snap(page)
    assert d['screen']=='vector-scalar' and abs(d['raw']-11)<1e-10,(file,d['screen'],d['result'])
    await press(page,'AC','SHIFT','5','1','1','2')
    await write(page,(1,0,0))
    await press(page,'SHIFT','5','1','2','2')
    await write(page,(0,1,0))
    await press(page,'SHIFT','5','3','MUL','SHIFT','5','4','EQUAL')
    e=await snap(page)
    assert e['screen']=='vector-result' and e['vectors']['VctAns']['data']==[0,0,1],(file,e['screen'],e['vectors']['VctAns'])
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
                    print('PLUS-011 PASS',file,'menu, addition, dot, 3D cross, STO copy')
            finally: await browser.close()
    finally:server.shutdown();server.server_close()
if __name__=='__main__': asyncio.run(main())
