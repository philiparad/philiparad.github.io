#!/usr/bin/env python3
"""PLUS-009: numbered menu selection, paging, nested AC and setup.
Verifies calculator actual physical button actions in both publications.
"""
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
    await page.goto(page.url.split('?')[0]+'?plus009='+tag,wait_until='load')
    await page.locator("#keys button[data-key='MODE']").wait_for()
async def check(page,file):
    await fresh(page,'stat-nested')
    await press(page,'MODE','3','1','5','EQUAL')
    assert (await state(page))['statTable']['rows'][0]['X']==5
    await press(page,'SHIFT','1')
    one=await state(page)
    assert one['screen']=='menu' and one['menuKind']=='stat-menu',(file,one['screen'],one['menuKind'])
    await press(page,'3')
    two=await state(page)
    assert two['screen']=='menu' and two['menuKind']=='stat-edit',(file,two['screen'],two['menuKind'])
    await press(page,'AC')
    back=await state(page)
    assert back['screen']=='stat-table' and back['mode']=='STAT',(file,'STAT submenu AC',back['screen'])
    assert back['statTable']['rows'][0]['X']==5,(file,'STAT data lost during menu cancel')
    await press(page,'SHIFT','MODE','DOWN')
    setup=await state(page)
    assert setup['screen']=='menu' and setup['menuKind']=='setup' and setup['menuPage']==1,(file,'SETUP page2')
    assert [x['number'] for x in setup['menu']]==['1','2','3','4','5','6'],(file,'SETUP printed numbers',setup['menu'])
    await press(page,'4')
    submenu=await state(page)
    assert submenu['screen']=='menu' and 'STAT' in submenu['menuTitle'],(file,'SETUP submenu',submenu['menuTitle'])
    await press(page,'AC')
    recovered=await state(page)
    assert recovered['screen']=='stat-table' and recovered['statTable']['rows'][0]['X']==5,(file,'nested SETUP AC')
    await fresh(page,'matrix-eight-keys')
    await press(page,'MODE','6','AC','SHIFT','4')
    matrix=await state(page)
    assert matrix['screen']=='menu' and matrix['menuKind']=='matrix',(file,matrix['screen'],matrix['menuKind'])
    assert [x['number'] for x in matrix['menu']]==list('12345678'),(file,'MATRIX page1 numbering',matrix['menu'])
    await press(page,'DOWN')
    second=await state(page)
    assert second['menuPage']==0 and [x['number'] for x in second['menu']]==list('12345678'),(file,'MATRIX fixed eight entries',second['menu'])
    await press(page,'7')
    expr=await state(page)
    assert expr['mode']=='MATRIX' and expr['screen']=='matrix-expression' and expr['input']=='det(',(file,'MATRIX printed det function',expr['screen'],expr['input'])
    await fresh(page,'fix-keys')
    await press(page,'SHIFT','MODE','6')
    fix=await state(page)
    assert fix['screen']=='menu' and fix['menuTitle'].startswith('Fix'),(file,'Fix screen')
    assert [x['number'] for x in fix['menu']]==list('0123456789'),(file,'Fix printed digits',fix['menu'])
    await press(page,'0')
    fixed=await state(page)
    assert fixed['screen']=='edit' and fixed['format']=='Fix' and fixed['digits']==0,(file,'Fix0')
    await fresh(page,'new-mode-menu')
    await press(page,'MODE','5')
    mode=await state(page)
    assert mode['mode']=='EQN' and mode['screen']=='menu' and mode['menuTitle']=='EQN type',(file,'EQN entry')
    await press(page,'AC')
    cancel=await state(page)
    assert cancel['mode']=='EQN' and cancel['screen']=='edit',(file,'MODE transition AC')
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
                    print('PLUS-009',file,'paging, numbering and nested menus PASS')
            finally: await browser.close()
    finally:
        server.shutdown()
        server.server_close()
if __name__=='__main__': asyncio.run(main())
