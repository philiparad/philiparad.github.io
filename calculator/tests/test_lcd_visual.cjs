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
// A static contact sheet makes the uploaded workflow artifact reviewable
// offline. No external scripts or CSS frameworks are needed.
function escapeHTML(value){
 return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function reviewHTML(manifest){
 // Include only fully captured A/B pairs. On a browser failure the
 // artifact can contain an unfinished pair, which must not block review.
 const enhanced=manifest.filter(row=>row.renderer==='enhanced'&&
  manifest.some(item=>item.renderer==='authentic'&&
   item.name===row.name&&item.dpr===row.dpr));
 const groups=[...new Set(enhanced.map(row=>row.name))];
 const scales=[...new Set(enhanced.map(row=>row.dpr))];
 const items=enhanced.map(row=>{
  const comparison=manifest.find(item=>item.name===row.name&&
   item.dpr===row.dpr&&item.renderer==='authentic');
  if(!comparison)throw Error('Missing authentic comparison for '+row.name);
  const diff=Number(row.changedFraction||0)*100;
  return '<section class="pair" data-case="'+escapeHTML(row.name)+
   '" data-dpr="'+escapeHTML(row.dpr)+'"><h2>'+escapeHTML(row.name)+
   ' · DPR '+escapeHTML(row.dpr)+'</h2><p>'+
   'Changed pixels: '+escapeHTML(row.changedPixels)+
   ' ('+diff.toFixed(2)+'%)</p><div class="screens">'+
   '<figure><figcaption>Enhanced LCD</figcaption><img src="'+
   escapeHTML(row.filename)+'" alt="Enhanced LCD"></figure>'+
   '<figure><figcaption>Authentic LCD</figcaption><img src="'+
   escapeHTML(comparison.filename)+'" alt="Authentic LCD"></figure>'+
   '</div></section>';
 }).join('\n');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>LCD visual regression review</title><style>'+
 'body{font:15px/1.5 system-ui,sans-serif;background:#eef1ef;color:#18231d;margin:0;padding:24px}'+
 'main{max-width:1250px;margin:auto}h1{font-size:1.7rem}header{margin-bottom:22px}'+
 '.filters{display:flex;gap:14px;flex-wrap:wrap;margin:16px 0}'+
 'select{padding:9px;border:1px solid #a9bbb1;border-radius:5px}'+
 '.pair{background:white;border:1px solid #cbd4cd;border-radius:10px;padding:16px;margin:18px 0}'+
 '.pair h2{margin:0;font-size:1.1rem}.pair p{color:#3c5848;margin:6px 0 15px}'+
 '.screens{display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
 'figure{margin:0;min-width:0}figcaption{font-weight:bold;margin-bottom:7px}'+
 'img{max-width:100%;height:auto;image-rendering:auto;border:4px solid #1c2920;background:#d7e6d7}'+
 '@media(max-width:760px){.screens{grid-template-columns:1fr}}'+
 '</style></head><body><main><header><h1>LCD visual regression review</h1>'+
 '<p>Matched browser screenshots; comparison is not physical-device parity.</p>'+
 '<div class="filters"><label>Expression <select id="scenario"><option value="all">All</option>'+
 groups.map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join('')+
 '</select></label><label>Display scale <select id="dpr"><option value="all">All</option>'+
 scales.map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join('')+
 '</select></label></div></header><div id="gallery">'+items+'</div>'+
 '<script>(function(){const a=document.getElementById("scenario"),'+
 'b=document.getElementById("dpr");function filter(){'+
 'for(const p of document.querySelectorAll(".pair")){'+
 'p.hidden=(a.value!=="all"&&p.dataset.case!==a.value)||'+
 '(b.value!=="all"&&p.dataset.dpr!==b.value);}}'+
 'a.addEventListener("change",filter);b.addEventListener("change",filter);})();'+
 '</script></main></body></html>';
}
const cases=[
 ['root-empty',[{type:'squareRoot',parts:{radicand:[]}}],'edit'],
 ['root-filled',[{type:'squareRoot',parts:{radicand:[{type:'char',value:'9'}]}}],'edit'],
 ['fraction',[{type:'fraction',parts:{numerator:[{type:'char',value:'1'}],denominator:[{type:'char',value:'3'}]}}],'edit'],
 ['nested',[{type:'squareRoot',parts:{radicand:[{type:'fraction',parts:{numerator:[{type:'char',value:'2'}],denominator:[{type:'char',value:'5'}]}}]}}],'edit'],
 ['result-radical',[], 'result','4√6',{kind:'surd',text:'4√6'}],
 ['result-fraction',[], 'result','7/12',{kind:'fraction',text:'7/12',numerator:'7',denominator:'12'}],
 ['result-decimal',[], 'result','123.45',{kind:'decimal',text:'123.45'}],
 ['nested-caret',[{type:'squareRoot',parts:{radicand:Array.from({length:30},()=>({type:'char',value:'8'}))}}], 'edit','',null,
  {path:[{index:0,field:'radicand'}],offset:30}],
 ['scrolled-fraction',[
  ...Array.from({length:32},()=>({type:'char',value:'8'})),
  {type:'fraction',parts:{numerator:[{type:'char',value:'2'}],denominator:[{type:'char',value:'7'}]}}
 ],'edit','',null,{inputX:40,offset:33}],
 ['manual-pan',[
  ...Array.from({length:32},()=>({type:'char',value:'8'})),
  {type:'squareRoot',parts:{radicand:[{type:'char',value:'4'}]}}
 ],'edit','',null,{inputX:48,offset:0,manualPan:true}]
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
   for(const [label,nodes,screen,result='',chosen=null,options={}] of cases){
    const info=await page.evaluate(({nodes,screen,result,chosen,options})=>{
     const canvas=document.getElementById('lcd');
     const state={power:true,screen,mode:'COMP',math:true,contrast:5,
      input:'',result,viewport:{inputX:options.inputX||0,inputY:0,resultX:0,manualPan:!!options.manualPan},
      editor:{root:nodes,path:options.path||[],offset:options.offset||0},
      resultPresentation:chosen?{chosen}:null};
     const mode=window.FreshEnhancedLCD.draw(canvas,state);
     const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
     let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<160)ink++;
     return {mode,ink};
    },{nodes,screen,result,chosen,options});
    if(info.mode!=='enhanced'||info.ink<20)throw Error('Missing enhanced drawing for '+label+' DPR '+dpr);
    const filename=label+'-enhanced-dpr-'+String(dpr).replace('.','_')+'.png';
    await page.locator('#lcd').screenshot({path:path.join(output,filename)});
    const enhancedPng=await verifyPNG(path.join(output,filename),dpr);
    manifest.push({name:label,dpr,renderer:'enhanced',filename,...info,...enhancedPng});
    // Keep a same-size baseline from the old renderer for direct A/B review.
    // This is a comparison screenshot, not an approved visual golden master.
    const comparison=await page.evaluate(({nodes,screen,result,chosen,options})=>{
     const canvas=document.getElementById('lcd'),ctx=canvas.getContext('2d');
     const enhanced=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     window.FreshLCD.draw(canvas,{power:true,screen,mode:'COMP',math:true,
      contrast:5,input:'',result,viewport:{inputX:options.inputX||0,inputY:0,resultX:0,manualPan:!!options.manualPan},
      editor:{root:nodes,path:options.path||[],offset:options.offset||0},
      resultPresentation:chosen?{chosen}:null});
     const authentic=ctx.getImageData(0,0,canvas.width,canvas.height).data;
     let changedPixels=0;
     for(let i=0;i<enhanced.length;i+=4){
      if(enhanced[i]!==authentic[i]||enhanced[i+1]!==authentic[i+1]||
         enhanced[i+2]!==authentic[i+2])changedPixels++;
     }
     return {changedPixels,totalPixels:canvas.width*canvas.height};
    },{nodes,screen,result,chosen,options});
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
  console.log('PASS: '+manifest.length+' browser LCD A/B screenshots across four DPR values.');
 }finally{
  // Preserve a browsable partial gallery on any Playwright/render error.
  // GitHub Actions uploads this directory with if: always().
  try{
   await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
   await writeFile(path.join(output,'index.html'),reviewHTML(manifest));
  }finally{await browser.close()}
 }
})().catch(e=>{console.error(e);process.exitCode=1});
