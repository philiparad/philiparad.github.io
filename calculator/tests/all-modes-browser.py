import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
html=Path('/mnt/data/fx991_fresh/fx991_fresh_standalone.html').read_text()
modes=[('CMPLX',0,2,3),('STAT',0,3,1),('BASE-N',0,4,3),('EQN',0,5,3),('MATRIX',0,6,3),('TABLE',1,1,4),('VECTOR',1,2,3),('INEQ',1,3,4),('VERIF',1,4,3),('DIST',1,5,4)]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=await b.new_page(viewport={'width':900,'height':1300});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html)
  async def press(k):await page.evaluate('(k)=>FreshCalculator.press(k)',k)
  for mode,pages,idx,fields in modes:
   await press('MODE')
   if pages:await press('RIGHT')
   await press(str(idx))
   if mode=='EQN':await press('1')
   for _ in range(fields):await press('EQUAL')
   st=await page.evaluate('FreshCalculator.getState()')
   ok=st['screen']=='flow-result'
   print(mode, 'PASS' if ok else 'FAIL',st['screen'],st['outputLines'][:3] if st['outputLines'] else st['info'])
   assert ok,(mode,st)
   await press('AC')
  assert not errors,errors
  await b.close()
asyncio.run(main())
