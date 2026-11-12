#!/usr/bin/env python3
"""PLUS-010: physical SHIFT+4 MATRIX menus, MatAns arithmetic, SHIFT STO copy."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
async def press(page,*keys):
    for k in keys: await page.locator("#keys button[data-key='"+k+"']").click()
async def snap(page): return await page.evaluate("window.FreshCalculator.getState()")
async def write_matrix(page,contents):
    for token in contents:
        if token<0: await press(page,'NEG',str(-token),'EQUAL')
        else: await press(page,str(token),'EQUAL')
async def check(page,file):
    await press(page,'MODE','6')
    assert (await snap(page))['menuTitle']=='Matrix?',file
    await press(page,'1','5') # MatA, 2x2
    assert (await snap(page))['screen']=='matrix-table',file
    await write_matrix(page,(2,1,1,1))
    assert (await snap(page))['matrices']['MatA']['data']==[[2,1],[1,1]],file
    await press(page,'SHIFT','4')
    menu=await snap(page)
    assert menu['screen']=='menu'
    assert [x['number'] for x in menu['menu']]==list('12345678'),menu['menu']
    assert [x['label'].split('. ',1)[1] for x in menu['menu']]==['Dim','Data','MatA','MatB','MatC','MatAns','det(','Trn('],menu['menu']
    await press(page,'AC')
    await press(page,'SHIFT','4','1','2','5') # MatB, 2x2
    await write_matrix(page,(2,-1,-1,2))
    await press(page,'SHIFT','4','3','MUL','SHIFT','4','4','EQUAL')
    a=await snap(page)
    assert a['screen']=='matrix-result',(file,a['screen'],a.get('error'))
    assert a['matrices']['MatAns']['data']==[[3,0],[1,1]],(file,a['matrices']['MatAns'])
    await press(page,'SHIFT','RCL')
    b=await snap(page)
    assert b['matrixCopySource']=='MatAns',(file,b['matrixCopySource'])
    await press(page,'HYP')  # printed STO destination MatC
    c=await snap(page)
    assert c['screen']=='matrix-table' and c['matrices']['MatC']['data']==[[3,0],[1,1]],file
    await press(page,'AC','SHIFT','4','7','SHIFT','4','3','RP','EQUAL')
    d=await snap(page)
    assert d['screen']=='matrix-scalar' and abs(d['raw']-1)<1e-10,(file,d['screen'],d['result'])
    await press(page,'AC','SHIFT','4','8','SHIFT','4','3','RP','EQUAL')
    e=await snap(page)
    assert e['screen']=='matrix-result' and e['matrices']['MatAns']['data']==[[2,1],[1,1]],(file,e['screen'],e['result'])
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
                    await check(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-010 PASS',file,'matrix menu, multiply, copy, determinant, transpose')
            finally: await browser.close()
    finally:
        server.shutdown();server.server_close()
if __name__=='__main__': asyncio.run(main())
