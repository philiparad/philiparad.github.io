/* Browser-generated LCD visual regression gallery.
 * From calculator/desktop: npm run test:lcd-visual
 * Requires Playwright Chromium: npx playwright install chromium
 * Does not alter calculation logic or manufacturer-device pixel claims.
 */
'use strict';
const {chromium}=require('../desktop/node_modules/playwright');
const {mkdir,writeFile,readFile}=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'desktop','lcd-screenshots');
// PNG header verification needs no image-processing package.
async function verifyPNG(file,dpr){
 const bytes=await readFile(file);
 const signature='89504e470d0a1a0a';
 if(bytes.subarray(0,8).toString('hex')!==signature)
  throw Error('Invalid screenshot PNG: '+file);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 const expectedWidth=Math.round(496*dpr),expectedHeight=Math.round(171*dpr);
 if(Math.abs(width-expectedWidth)>1||Math.abs(height-expectedHeight)>1)
  throw Error('Unexpected screenshot dimensions: '+width+'x'+height+
   ' expected ~'+expectedWidth+'x'+expectedHeight);
 return {width,height};
}
const cases=[
 ['root-empty',[{type:'squareRoot',parts:{radicand:[]}}],'edit'],
 ['root-filled',[{type:'squareRoot',parts:{radicand:[{type:'char',value:'9'}]}}],'edit'],
 ['fraction',[{type:'fraction',parts:{numerator:[{type:'char',value:'1'}],denominator:[{type:'char',value:'3'}]}}],'edit'],
 ['nested',[{type:'squareRoot',parts:{radicand:[{type:'fraction',parts:{numerator:[{type:'char',value:'2'}],denominator:[{type:'char',value:'5'}]}}]}}],'edit'],
 ['result-radical',[], 'result','4√6',{kind:'surd',text:'4√6'}],
 ['result-fraction',[], 'result','7/12',{kind:'fraction',text:'7/12',numerator:'7',denominator:'12'}],
 ['result-decimal',[], 'result','123.45',{kind:'decimal',text:'123.45'}]
];
(async()=>{
 await mkdir(output,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const manifest=[];
 try{
  for(const dpr of [1,1.25,1.5,2]){
   const context=await browser.newContext({viewport:{width:800,height:420},deviceScaleFactor:dpr});
   const page=await context.newPage();
   await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:20px;background:#e9eeea}canvas{display:block;width:480px;height:155px;image-rendering:auto;border:8px solid #111;border-radius:4px}</style><canvas id="lcd" width="960" height="310"></canvas>');
   for(const file of ['js/lcd-viewport.js','js/display.js','js/lcd-enhanced.js'])
    await page.addScriptTag({path:path.join(root,file)});
   for(const [label,nodes,screen,result='',chosen=null] of cases){
    const info=await page.evaluate(({nodes,screen,result,chosen})=>{
     const canvas=document.getElementById('lcd');
     const state={power:true,screen,mode:'COMP',math:true,contrast:5,
      input:'',result,viewport:{inputX:0,inputY:0,resultX:0},
      editor:{root:nodes,path:[],offset:0},
      resultPresentation:chosen?{chosen}:null};
     const mode=window.FreshEnhancedLCD.draw(canvas,state);
     const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
     let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<160)ink++;
     return {mode,ink};
    },{nodes,screen,result,chosen});
    if(info.mode!=='enhanced'||info.ink<20)throw Error('Missing enhanced drawing for '+label+' DPR '+dpr);
    const filename=label+'-enhanced-dpr-'+String(dpr).replace('.','_')+'.png';
    await page.locator('#lcd').screenshot({path:path.join(output,filename)});
    const enhancedPng=await verifyPNG(path.join(output,filename),dpr);
    manifest.push({name:label,dpr,renderer:'enhanced',filename,...info,...enhancedPng});
    // Keep a same-size baseline from the old renderer for direct A/B review.
    // This is a comparison screenshot, not an approved visual golden master.
    const comparison=await page.evaluate(({nodes,screen,result,chosen})=>{
     const canvas=document.getElementById('lcd'),ctx=canvas.getContext('2d');
     const enhanced=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     window.FreshLCD.draw(canvas,{power:true,screen,mode:'COMP',math:true,
      contrast:5,input:'',result,viewport:{inputX:0,inputY:0,resultX:0},
      editor:{root:nodes,path:[],offset:0},
      resultPresentation:chosen?{chosen}:null});
     const authentic=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     let changedPixels=0;
     for(let i=0;i<enhanced.length;i+=4){
      if(enhanced[i]!==authentic[i]||enhanced[i+1]!==authentic[i+1]||
         enhanced[i+2]!==authentic[i+2])changedPixels++;
     }
     return {changedPixels,totalPixels:canvas.width*canvas.height};
    },{nodes,screen,result,chosen});
    if(comparison.changedPixels===0)
     throw Error('Enhanced image is pixel-identical to authentic: '+label+' DPR '+dpr);
    manifest[manifest.length-1].changedPixels=comparison.changedPixels;
    manifest[manifest.length-1].changedFraction=
     comparison.changedPixels/comparison.totalPixels;
    const baselineFile=label+'-authentic-dpr-'+String(dpr).replace('.','_')+'.png';
    await page.locator('#lcd').screenshot({path:path.join(output,baselineFile)});
    const authenticPng=await verifyPNG(path.join(output,baselineFile),dpr);
    manifest.push({name:label,dpr,renderer:'authentic',
     filename:baselineFile,...comparison,...authenticPng});
   }
   await context.close();
  }
  await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('PASS: '+manifest.length+' browser LCD A/B screenshots across four DPR values.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
