"""Browser-only smoke test. No HTTP server or npm dependencies needed."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
HTML=Path('/mnt/data/fx991_fresh/fx991_fresh_standalone.html').read_text()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':960,'height':1200})
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  await page.set_content(HTML)
  async def press(*keys):
   for k in keys: await page.evaluate('(k)=>FreshCalculator.press(k)',k)
  async def get():return await page.evaluate('FreshCalculator.getState()')
  await page.evaluate('FreshCalculator.runChecks()')
  print('Self tests:', await page.locator('#test-result').inner_text())
  assert await page.locator('dialog').count()==0
  # In-LCD menus, split pages and selection
  await press('MODE');s=await get();assert s['screen']=='menu' and len(s['menu'])==6
  await press('RIGHT');s=await get();assert s['menuPage']==1 and len(s['menu'])==5
  await press('1');s=await get();assert s['mode']=='TABLE' and s['screen']=='prompt'
  # TABLE flow: accept four defaults
  await press('EQUAL','EQUAL','EQUAL','EQUAL');s=await get();assert s['screen']=='flow-result',s
  assert len(s['outputLines'])>=3
  await press('DOWN');s=await get();assert s['outputPage']>=1
  await press('AC');s=await get();assert s['screen']=='edit'
  # STAT default: mean 3
  await press('MODE','3','EQUAL');s=await get();assert s['mode']=='STAT' and s['screen']=='flow-result' and abs(s['ans']-3)<1e-10,s
  await press('AC')
  # EQN quadratic defaults: 1,-3,2
  await press('MODE','5','1','EQUAL','EQUAL','EQUAL');s=await get();assert s['mode']=='EQN' and s['screen']=='flow-result',s
  await press('AC')
  # matrices - 3 fields
  await press('MODE','6','EQUAL','EQUAL','EQUAL');s=await get();assert s['mode']=='MATRIX' and s['screen']=='flow-result',s
  await press('AC')
  # setup > page 2 options
  await press('SHIFT','MODE');s=await get();assert s['screen']=='menu'
  await press('1');s=await get();assert s['angle']=='DEG' and s['screen']=='edit'
  # COMP normal evaluation
  await press('MODE','1','2','ADD','3','EQUAL');s=await get();assert s['mode']=='COMP' and s['screen']=='result' and s['ans']==5,s
  # numerical integration (default X^2-2), bounds 0,1 => -5/3
  await page.evaluate("FreshCalculator.loadExpression('X^2-2')");await press('INTEGRAL');s=await get();assert s['screen']=='prompt'
  await press('EQUAL','EQUAL','EQUAL');s=await get();assert s['screen']=='flow-result' and abs(s['ans']+5/3)<1e-6,s
  print('All LCD workflows PASS: MODE paging, TABLE, STAT, EQN, MATRIX, SETUP, COMP, INTEGRAL.')
  print('Unhandled browser errors:',errs)
  assert not errs,errs
  await page.locator('#face').screenshot(path='/mnt/data/fx991_fresh/lcd_only_face.png')
  await browser.close()
asyncio.run(main())
