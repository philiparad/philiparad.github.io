import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 html=Path('/mnt/data/fx991_fresh/fx991_fresh_standalone.html').read_text()
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':900,'height':940}, device_scale_factor=1)
  await page.set_content(html)
  await page.locator('[data-key="MODE"]').click()
  await page.locator('#face').screenshot(path='/mnt/data/fx991ES_LCD_Menu_Preview.png')
  await page.locator('[data-key="3"]').click()
  await page.locator('#face').screenshot(path='/mnt/data/fx991ES_LCD_Prompt_Preview.png')
  await page.locator('[data-key="EQUAL"]').click()
  await page.locator('#face').screenshot(path='/mnt/data/fx991ES_LCD_Result_Preview.png')
  print('Created MODE, prompt, result previews; dialogs:',await page.locator('dialog').count())
  await browser.close()
asyncio.run(main())
