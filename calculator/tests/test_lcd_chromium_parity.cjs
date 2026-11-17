/* CAL-012 — same staged fixture as the native WebView2 Windows host.
 * Run from calculator/desktop after npm install && npm run prepare.
 */
'use strict';
const {chromium}=require('../desktop/node_modules/playwright');
const {mkdir,writeFile}=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const desktop=path.resolve(__dirname,'../desktop');
const fixture=path.join(desktop,'dist','visual-fixture.html');
const output=path.join(desktop,'lcd-cross-engine','chromium');
const factors=[1,1.25,1.5,2];
const cases=[
 'ans','mode','eqnTypes','eqnCoefficients','fraction','nestedRoot',
 'fractionAnswer','engineering'
];
(async()=>{
 await mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const manifest=[];
 try{
  for(const factor of factors){
   const context=await browser.newContext({
    viewport:{width:800,height:420},deviceScaleFactor:factor
   });
   const page=await context.newPage();
   await page.goto(pathToFileURL(fixture).href,{waitUntil:'load'});
   const active=await page.evaluate(async()=>({
    ready:await window.CAL012.ready(),cases:window.CAL012.cases
   }));
   if(!active.ready||JSON.stringify(active.cases)!==JSON.stringify(cases))
    throw Error('CAL-012 fixture/font mismatch in Chromium');
   for(const scenario of cases){
    const info=await page.evaluate(name=>window.CAL012.render(name),scenario);
    if(info.mode!=='enhanced'||!info.fontReady||info.dark<20)
     throw Error('Invalid Chromium LCD for '+scenario+' at '+factor);
    const suffix=String(factor).replace('.','_');
    const filename=scenario+'-dpr-'+suffix+'.png';
    await page.locator('#lcd').screenshot({path:path.join(output,filename)});
    manifest.push({scenario,factor,filename,ink:info.dark,mode:info.mode,
     browserVersion:browser.version()});
    console.log('Chromium capture: '+filename);
   }
   await context.close();
  }
  if(manifest.length!==factors.length*cases.length)
   throw Error('Incomplete CAL-012 Chromium capture coverage');
  await writeFile(path.join(output,'manifest.json'),
   JSON.stringify(manifest,null,2)+'\n');
  console.log('CAL-012 Chromium: '+manifest.length+' screenshots complete');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
