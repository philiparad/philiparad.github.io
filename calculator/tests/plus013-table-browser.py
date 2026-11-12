#!/usr/bin/env python3
"""PLUS-013: hardware-key TABLE prompts and X memory boundary cases."""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
FILES=('index.html','fx991_fresh_standalone.html')
async def press(page,*keys):
    for key in keys:await page.locator("#keys button[data-key='"+str(key)+"']").click()
async def snap(page):return await page.evaluate('window.FreshCalculator.getState()')
async def fresh(page,tag):
    await page.goto(page.url.split('?')[0]+'?plus013='+tag,wait_until='load')
async def check(page,file):
    await press(page,'MODE','7','ALPHA','LP','SQUARE','EQUAL','NEG','1','EQUAL','1','EQUAL','DOT','5','EQUAL')
    result=await snap(page)
    assert result['screen']=='table-grid',(file,result['screen'],result['info'])
    rows=result['tableData']['rows']
    assert len(rows)==5,(file,rows)
    assert all(abs(r['f']-want)<1e-10 for r,want in zip(rows,[1,.25,0,.25,1])),(file,rows)
    assert result['memory']['X']==1,(file,result['memory']['X'])
    await press(page,'RIGHT','DOWN')
    moved=await snap(page)
    assert moved['tableData']['row']==1 and moved['tableData']['col']==1,(file,moved['tableData'])
    await press(page,'AC')
    back=await snap(page)
    assert back['screen']=='prompt' and back['flow']['fieldId']=='expression',(file,back['screen'])
    await press(page,'1','DIV','LP','ALPHA','LP','SUB','1','RP','EQUAL',
                '0','EQUAL','2','EQUAL','1','EQUAL')
    singular=await snap(page)
    assert singular['screen']=='table-grid',(file,singular['screen'],singular['info'])
    assert singular['tableData']['rows'][1]['f'] is None,(file,singular['tableData']['rows'])
    assert singular['memory']['X']==2,(file,singular['memory']['X'])
    await fresh(page,'limit')
    await press(page,'MODE','7','ALPHA','LP','EQUAL','0','EQUAL','3','EQUAL','DOT','1','EQUAL')
    limit=await snap(page)
    assert limit['screen']=='prompt' and 'Insufficient MEM' in limit['info'],(file,limit['screen'],limit['info'])
    assert limit['tableData'] is None and limit['memory']['X']==0,(file,'failed range mutated X')
    await fresh(page,'thirty')
    await press(page,'MODE','7','ALPHA','LP','EQUAL','0','EQUAL','2','DOT','9','EQUAL','DOT','1','EQUAL')
    valid=await snap(page)
    assert valid['screen']=='table-grid' and len(valid['tableData']['rows'])==30,(file,valid['screen'],valid['info'])
    assert abs(valid['memory']['X']-2.9)<1e-12,(file,valid['memory']['X'])
async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    root='http://127.0.0.1:'+str(server.server_address[1])+'/calculator/'
    try:
        async with async_playwright() as pw:
            browser=await pw.chromium.launch()
            try:
                for file in FILES:
                    page=await browser.new_page();errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    await page.goto(root+file,wait_until='load')
                    await check(page,file)
                    assert not errors,(file,errors)
                    await page.close()
                    print('PLUS-013 PASS',file,'TABLE fractional, error, 30 rows, X memory')
            finally:await browser.close()
    finally:server.shutdown();server.server_close()
if __name__=='__main__':asyncio.run(main())
