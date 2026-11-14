import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeVisualArtifacts} from './visual-artifacts.mjs';
import {chromium,firefox,webkit} from 'playwright';

const engine=process.env.TEACHING_BOARD_BROWSER||'chromium';
const type={chromium,firefox,webkit}[engine];
if(!type)throw new Error('Unsupported browser: '+engine);
const base=process.env.TEACHING_BOARD_URL||'http://127.0.0.1:8765/teaching-board/';
const recording=process.env.TEACHING_BOARD_GOLDEN_RECORD==='1';
const manifest=recording?null:JSON.parse(readFileSync(new URL('./visual-goldens.json',import.meta.url),'utf8'));
if(!recording){
 assert.equal(manifest.schemaVersion,1);
 assert.deepEqual(manifest.dimensions,{width:720,height:470});
 assert.ok(manifest.engines?.[engine],'Missing golden image hashes for '+engine);
}
const browser=await type.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
const failures=[];
page.on('pageerror',error=>failures.push(error.message));
try {
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
 await page.evaluate(()=>document.fonts.ready);
 const capture=await page.evaluate(async()=>{
  const {sceneSVG,svgEl,background}=await import('./js/scene.js');
  const {RenderCache}=await import('./js/render-cache.js');
  const {backgroundOrder}=await import('./js/background-lock.js');
  const W=720,H=470,ns='http://www.w3.org/2000/svg';
  const equation={source:'x^2+1=10',
   src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRrQAAAAASUVORK5CYII=',
   w:92,h:45};
  const fixtures=[
   {name:'mixed Hebrew English and inline math',items:[{
    id:'mixed',type:'text',x:45,y:37,w:370,h:35,fontSize:26,
    text:'שלום English \uFFFC\nSecond עברית',
    runs:[{text:'שלום ',bold:true,color:'#b42318'},
          {text:'English ',italic:true},{text:'\uFFFC',equation},
          {text:'\nSecond עברית',underline:true}],
    paragraphs:[{align:'right',dir:'rtl',list:'none'},
                {align:'left',dir:'ltr',list:'none'}]
   }]},
   {name:'rotated sticky note with custom numbered paragraphs',items:[{
    id:'note',type:'note',x:120,y:85,w:330,h:38,fontSize:24,
    rotation:19,fill:'#fff1a8',
    text:'שלב ראשון\nStep two\nשלב שלישי',
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
                {align:'left',dir:'ltr',list:'number'},
                {align:'right',dir:'rtl',list:'number'}]
   }]},
   {name:'narrow wrapping, ligatures, emoji and background shapes',items:[
    {id:'bg',type:'rectangle',x:25,y:18,w:660,h:430,
     fill:'#faf6eb',stroke:'#d2a55b',lineWidth:2},
    {id:'wrap',type:'text',x:60,y:48,w:215,h:20,fontSize:23,
     text:'שלום supercalifragilistic 👨‍👩‍👧‍👦\n English mathematics',
     paragraphs:[{align:'right',dir:'rtl',list:'bullet'},
                 {align:'left',dir:'ltr',list:'bullet'}]},
    {id:'rotated',type:'text',x:335,y:180,w:255,h:40,fontSize:27,
     rotation:-15,text:'English עברית mixed',
     paragraphs:[{align:'center',dir:'ltr',list:'none'}]}
   ]}
  ];
  const holder=document.createElement('section');
  holder.id='visual-preview';
  holder.style.cssText='position:fixed;left:0;top:0;z-index:10000;background:white;display:flex;gap:8px;';
  document.body.append(holder);
  function editorSVG(board){
   const svg=svgEl('svg',{xmlns:ns,overflow:'hidden',width:W,height:H,
    viewBox:'0 0 '+W+' '+H});
   background(svg,'plain',{x:0,y:0,zoom:1},'paper',board.backgroundOptions);
   const g=svgEl('g',{transform:'translate(0 0) scale(1)'});
   const cache=new RenderCache();
   backgroundOrder(board.items).forEach(item=>g.append(cache.draw(item)));
   svg.append(g);
   return svg;
  }
  async function digest(pixels){
   const value=await crypto.subtle.digest('SHA-256',pixels);
   return [...new Uint8Array(value)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function raster(svg){
   const markup=new XMLSerializer().serializeToString(svg);
   const blob=new Blob([markup],{type:'image/svg+xml;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   try{
    const image=new Image();image.src=url;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=W;canvas.height=H;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0,W,H);
    const pixels=ctx.getImageData(0,0,W,H).data;
    return {pixels,sha256:await digest(pixels),png:canvas.toDataURL('image/png'),markup};
   }finally{URL.revokeObjectURL(url);}
  }
  const differencePng=(before,after)=>{
   const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
   const context=canvas.getContext('2d');
   const image=context.createImageData(W,H);
   for(let i=0;i<before.length;i+=4){
    const changed=before[i]!==after[i]||before[i+1]!==after[i+1]||
      before[i+2]!==after[i+2]||before[i+3]!==after[i+3];
    if(changed){
     image.data[i]=255;image.data[i+1]=0;image.data[i+2]=180;
    }else{
     const faded=Math.round((before[i]+before[i+1]+before[i+2])/15)+204;
     image.data[i]=faded;image.data[i+1]=faded;image.data[i+2]=faded;
    }
    image.data[i+3]=255;
   }
   context.putImageData(image,0,0);
   return canvas.toDataURL('image/png');
  };
  const results=[],snapshots=[];
  for(const fixture of fixtures){
   const board={background:'plain',items:fixture.items};
   const edited=editorSVG(board);
   const exported=sceneSVG(board,0,{x:0,y:0,w:W,h:H});
   holder.replaceChildren(edited,exported);
   const first=await raster(edited),second=await raster(exported);
   let different=0,largest=0,ink=0;
   for(let offset=0;offset<first.pixels.length;offset+=4){
    let delta=0;
    for(let k=0;k<4;k++)delta=Math.max(delta,Math.abs(first.pixels[offset+k]-second.pixels[offset+k]));
    if(delta>0){different++;largest=Math.max(largest,delta);}
    if(first.pixels[offset]<240||first.pixels[offset+1]<240||first.pixels[offset+2]<240)ink++;
   }
   // Negative control: deliberately hide text in the cached board scene.
   // The comparator must detect a real visual regression rather than merely
   // comparing two white/blank images or treating all images as equal.
   let injectedDifference=null,injectedHash=null;
   if(fixture.name==='mixed Hebrew English and inline math'){
    const changed=edited.querySelector('g[data-id="mixed"]');
    changed.setAttribute('opacity','0');
    const damaged=await raster(edited);
    let pixels=0;
    for(let offset=0;offset<damaged.pixels.length;offset+=4){
     if(damaged.pixels[offset]!==second.pixels[offset]||
        damaged.pixels[offset+1]!==second.pixels[offset+1]||
        damaged.pixels[offset+2]!==second.pixels[offset+2]||
        damaged.pixels[offset+3]!==second.pixels[offset+3])pixels++;
    }
    injectedDifference=pixels;injectedHash=damaged.sha256;
    changed.setAttribute('opacity','1');
   }
   snapshots.push({name:fixture.name,cached:first.png,export:second.png,
    difference:differencePng(first.pixels,second.pixels)});
   results.push({
    name:fixture.name,inkPixels:ink,differentPixels:different,maxChannelDifference:largest,
    editorImageCount:edited.querySelectorAll('image').length,
    exportImageCount:exported.querySelectorAll('image').length,
    svgDataValid:exported.getAttribute('viewBox')==='0 0 '+W+' '+H,
    editorHash:first.sha256,exportHash:second.sha256,
    injectedDifference,injectedHash
   });
  }
  return {results,snapshots};
 });
 const {results:findings,snapshots}=capture;
 const outputDirectory=process.env.TEACHING_BOARD_VISUAL_DIR||'/tmp/teaching-board-visual-artifacts';
 writeVisualArtifacts(outputDirectory,engine,snapshots,findings,{
  width:720,height:470,expected:recording?{}:manifest.engines[engine]
 });
 console.log('VISUAL ARTIFACTS '+engine+': '+outputDirectory);
 const goldenMismatches=[];
 for(const test of findings){
  console.log('PIXEL '+engine+' '+test.name+': '+JSON.stringify(test));
  assert(test.inkPixels>50,'Fixture rendered blank: '+test.name);
  assert.equal(test.editorImageCount,test.exportImageCount,'Inline equation/image missing');
  assert(test.svgDataValid,'Export viewBox was incorrect');
  assert.equal(test.differentPixels,0,'Board and export rendered different pixels: '+test.name);
  assert.match(test.editorHash,/^[0-9a-f]{64}$/);
  assert.equal(test.editorHash,test.exportHash,'Cached and exported images disagree by hash');
  if(test.injectedDifference!==null){
   assert(test.injectedDifference>200,'Visual diff failed to detect deliberately missing text');
   assert.notEqual(test.injectedHash,test.exportHash,'Negative control did not change the rendered image');
  }
  console.log('GOLDEN '+JSON.stringify({engine,fixture:test.name,sha256:test.exportHash}));
  if(!recording){
   const expected=manifest.engines[engine][test.name];
   assert.match(expected||'',/^[0-9a-f]{64}$/,'Missing or malformed committed golden hash for '+test.name);
   if(test.exportHash!==expected)goldenMismatches.push({engine,fixture:test.name,expected,actual:test.exportHash});
  }
 }
 assert.deepEqual(failures,[]);
 if(!recording){
  assert.equal(Object.keys(manifest.engines[engine]).length,findings.length,'Golden manifest has orphaned or duplicate fixtures');
  assert.deepEqual(goldenMismatches,[],'Changed SVG pixels require inspection and explicit golden approval');
 }
 console.log('PASS '+engine+' '+(recording?'golden-recording':'committed-golden-check')+' board/SVG pixel parity: '+findings.length+' fixtures');
}catch(error){
 await page.locator('#visual-preview').screenshot({path:'/tmp/teaching-board-visual-parity-failure.png'}).catch(()=>{});
 throw error;
}finally{
 await browser.close();
}
