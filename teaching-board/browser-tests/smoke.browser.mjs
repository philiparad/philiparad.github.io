import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from 'playwright';

const base=process.env.TEACHING_BOARD_URL||'http://127.0.0.1:8765/teaching-board/';
const engine=process.env.TEACHING_BOARD_BROWSER||'chromium';
const browserType={chromium,firefox,webkit}[engine];
if(!browserType)throw new Error('Unsupported browser engine: '+engine);
const browser=await browserType.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
const page=await browser.newPage({viewport:{width:1440,height:900},locale:'he-IL'});
const pageErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
async function check(name,run){
 try{await run();console.log('PASS '+name);}
 catch(error){
  await page.screenshot({path:'/tmp/teaching-board-browser-failure.png',fullPage:true}).catch(()=>{});
  console.error('FAIL '+name);
  throw error;
 }
}
try{
 await check('load dashboard without runtime errors',async()=>{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
  await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
  assert.match(await page.locator('h1').first().innerText(),/Your lessons|Make room/);
  assert.deepEqual(pageErrors,[]);
 });

 await check('native selection formats Hebrew text and undo/redo restores draft',async()=>{
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const host=document.createElement('div');host.id='browser-smoke-editor';host.style.cssText='position:fixed;inset:150px 120px 80px;background:#fff;z-index:1000';
   document.body.append(host);
   const editor={area:host,board:{viewport:{x:0,y:0,zoom:1}},disposed:true,applyText(...args){this.saved=args;},paint(){}};
   const item={id:'browser-text',type:'text',x:10,y:10,w:450,h:100,fontSize:24,
    text:'שלום English',paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const draft=new InlineText(editor,item,true);
   window.__smoke={host,editor,draft,readRichDocument};
   const node=draft.input.querySelector('span')?.firstChild;
   if(!node||node.nodeType!==3)throw Error('No editable text node');
   draft.input.focus();
   const r=document.createRange();r.setStart(node,0);r.setEnd(node,4);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(r);
  });
  await page.getByRole('button',{name:'Bold selected text'}).click();
  const format=await page.evaluate(()=>{
   const {draft,readRichDocument}=window.__smoke;
   return readRichDocument(draft.input,draft.item).runs.map(run=>({text:run.text,bold:run.bold}));
  });
  assert(format.some(run=>run.text.includes('שלום')&&run.bold),'Bold was not applied to Hebrew selection');
  await page.locator('.inline-text-editor [contenteditable="true"]').focus();
  await page.keyboard.press('Control+z');
  const undone=await page.evaluate(()=>window.__smoke.readRichDocument(window.__smoke.draft.input,window.__smoke.draft.item).runs);
  assert(!undone.some(run=>run.text.includes('שלום')&&run.bold),'Undo failed to revert formatting');
  await page.keyboard.press('Control+y');
  const redone=await page.evaluate(()=>window.__smoke.readRichDocument(window.__smoke.draft.input,window.__smoke.draft.item).runs);
  assert(redone.some(run=>run.text.includes('שלום')&&run.bold),'Redo failed to restore formatting');
 });

 await check('numbered-list and keyboard formatting survive native edit/save',async()=>{
  await page.evaluate(()=>{
   const {draft}=window.__smoke;
   const selection=window.getSelection();draft.input.focus();
   const range=document.createRange();range.selectNodeContents(draft.input);range.collapse(true);
   selection.removeAllRanges();selection.addRange(range);
  });
  await page.getByRole('button',{name:'Numbered list selected text'}).click();
  const list=await page.evaluate(()=>{
   const {draft,readRichDocument}=window.__smoke;
   return {hasOL:!!draft.input.querySelector('ol'),paragraphs:readRichDocument(draft.input,draft.item).paragraphs};
  });
  assert.equal(list.hasOL,true);
  assert.equal(list.paragraphs[0].list,'number');
  await page.getByRole('button',{name:'Done'}).click();
  const saved=await page.evaluate(()=>window.__smoke.editor.saved);
  assert(saved&&saved[1].includes('שלום')&&saved[0]?.paragraphs?.length>0,'Rich text not committed');
 });

 await check('SVG renders isolated RTL/LTR tokens and inline equation inside measured bounds',async()=>{
  const visual=await page.evaluate(async()=>{
   const {drawItem,bounds}=await import('./js/scene.js');
   const item={id:'sample',type:'text',x:0,y:0,w:420,h:100,fontSize:24,
    text:'שלום English \uFFFC',paragraphs:[{align:'right',list:'none',dir:'rtl'}],
    runs:[{text:'שלום ',bold:true},{text:'English ',italic:true},
     {text:'\uFFFC',equation:{source:'x^2+1',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRrQAAAAASUVORK5CYII=',w:100,h:40}}]};
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('width','500');svg.setAttribute('height','220');
   svg.style.cssText='position:fixed;right:0;top:120px;background:white;z-index:1001';
   svg.append(drawItem(item));document.body.append(svg);
   const text=[...svg.querySelectorAll('text')].map(node=>({
    text:node.textContent,isolate:node.getAttribute('unicode-bidi'),direction:node.getAttribute('direction'),
    box:{x:node.getBBox().x,width:node.getBBox().width}
   }));
   const equation=svg.querySelector('image');
   return {text,imageCount:svg.querySelectorAll('image').length,imageWidth:equation?.getBBox().width,bounds:bounds(item)};
  });
  assert(visual.text.some(n=>n.text.includes('שלום')&&n.isolate==='isolate'&&n.direction==='rtl'));
  assert(visual.text.some(n=>n.text.includes('English')&&n.isolate==='isolate'&&n.direction==='ltr'));
  assert.equal(visual.imageCount,1);
  assert(visual.imageWidth>0);
  assert(visual.bounds.h>0);
 });

 await check('HTML editor height and paragraph direction contain exported SVG layout',async()=>{
  const metrics=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {textObjectHeight,drawItem}=await import('./js/scene.js');
   const {readRichDocument,paragraphRuns}=await import('./js/rich-text.js');
   const {textLayoutMetrics}=await import('./js/inline-equation.js');
   const host=document.createElement('div');host.id='smoke-layout-parity';
   host.style.cssText='position:fixed;inset:130px 70px 50px;background:white;z-index:1500';
   document.body.append(host);
   const editor={area:host,board:{viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(){}};
   const item={id:'parity',type:'note',x:10,y:10,w:175,h:22,fontSize:25,
    fill:'#fff1a8',
    text:'שלום mixed words\nSecond English explanation with superlongword',
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
                {align:'left',dir:'ltr',list:'number'}]};
   const draft=new InlineText(editor,item,true);
   await document.fonts.ready;
   draft.resize();
   const model=readRichDocument(draft.input,draft.item);
   const content={...item,text:model.runs.map(run=>run.text).join(''),
    runs:model.runs,paragraphs:model.paragraphs};
   const layout=textLayoutMetrics(content,paragraphRuns(content));
   const svg=drawItem(content);
   const result={
    overlayHeight:draft.height,
    htmlScrollHeight:draft.input.scrollHeight,
    svgLayoutHeight:layout.height,
    renderedHeight:textObjectHeight(content),
    directions:[...draft.input.querySelectorAll('li')].map(n=>getComputedStyle(n).direction),
    listStart:draft.input.querySelector('ol')?.start,
    svgTextCount:svg.querySelectorAll('text').length,
    listMetadata:content.paragraphs.map(p=>p.list)
   };
   draft.finish(false);host.remove();
   return result;
  });
  assert(metrics.htmlScrollHeight>22,'HTML fixture must wrap to more than its stored height');
  assert(metrics.overlayHeight>=metrics.htmlScrollHeight,'HTML editor clips its own scroll content');
  assert(metrics.overlayHeight>=metrics.svgLayoutHeight,'SVG export needs more vertical space than HTML editor');
  assert(metrics.renderedHeight>=metrics.svgLayoutHeight,'SVG bounds clip measured text lines');
  assert.deepEqual(metrics.directions,['rtl','ltr']);
  assert.deepEqual(metrics.listMetadata,['number','number']);
  assert.equal(metrics.listStart,7);
  assert(metrics.svgTextCount>=4,'The SVG renderer lost paragraph contents');
 });


 await check('HTML and SVG anchors agree for Hebrew RTL, English LTR and centered text',async()=>{
  const report=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {drawEquationText}=await import('./js/inline-equation.js');
   const {readRichDocument,paragraphRuns}=await import('./js/rich-text.js');
   const {svgEl}=await import('./js/scene.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:125px 90px 75px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'anchor-fixture',type:'text',x:0,y:0,w:360,h:24,fontSize:24,
    text:'שלום תלמידים\nEnglish students\nCentered paragraph',
    paragraphs:[{align:'right',dir:'rtl',list:'none'},
                {align:'left',dir:'ltr',list:'none'},
                {align:'center',dir:'ltr',list:'none'}]};
   const editor={area:host,board:{id:'browser-anchor-fixture-'+crypto.randomUUID(),
    viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const draft=new InlineText(editor,item,true);
   await document.fonts.ready;draft.resize();
   const rich=readRichDocument(draft.input,item);
   const model={...item,text:rich.runs.map(run=>run.text).join(''),
    runs:rich.runs,paragraphs:rich.paragraphs};
   const svg=svgEl('svg',{width:400,height:240,viewBox:'0 0 400 240'});
   svg.style.cssText='position:fixed;right:0;bottom:0;z-index:2501';
   svg.append(drawEquationText(model,paragraphRuns(model),svgEl));
   host.append(svg);
   const blocks=[...draft.input.children];
   const vectorLines=[];
   // SVG creates a text node for each token, not each paragraph.
   for(const node of svg.querySelectorAll('text')){
    const baseline=Number(node.getAttribute('y'));
    let line=vectorLines.find(row=>Math.abs(row.y-baseline)<1);
    if(!line){line={y:baseline,nodes:[]};vectorLines.push(line);}
    line.nodes.push(node);
   }
   if(blocks.length!==3||vectorLines.length!==3)
    throw Error('Missing one-line paragraphs: HTML='+blocks.length+
     ', SVG='+vectorLines.length+', SVG tokens='+svg.querySelectorAll('text').length);
   const inputBounds=draft.input.getBoundingClientRect();
   const rows=blocks.map((block,index)=>{
    const range=document.createRange();range.selectNodeContents(block);
    const html=range.getBoundingClientRect(),nodes=vectorLines[index].nodes;
    const bounds=nodes.map(node=>node.getBBox()).filter(box=>box.width>0.1);
    if(!bounds.length)throw Error('No measurable SVG glyphs in paragraph '+index);
    return {string:block.textContent,svgText:nodes.map(node=>node.textContent).join(''),
     html:{left:html.left-inputBounds.left,right:html.right-inputBounds.left},
     svg:{left:Math.min(...bounds.map(box=>box.x)),
      right:Math.max(...bounds.map(box=>box.x+box.width))},
     width:item.w};
   });
   draft.finish(false);host.remove();
   return rows;
  });
  assert.deepEqual(report.map(r=>r.string),report.map(r=>r.svgText));
  for(const [index,edge] of [[0,'right'],[1,'left']]){
   const r=report[index],expected=edge==='right'?r.width:0;
   assert(Math.abs(r.html[edge]-expected)<18,
    'HTML '+edge+' alignment drifted: '+JSON.stringify(r));
   assert(Math.abs(r.svg[edge]-expected)<18,
    'SVG '+edge+' alignment drifted: '+JSON.stringify(r));
   assert(Math.abs(r.html[edge]-r.svg[edge])<12,
    'HTML/SVG '+edge+' anchors disagree: '+JSON.stringify(r));
  }
  const center=report[2],htmlCenter=(center.html.left+center.html.right)/2,
   svgCenter=(center.svg.left+center.svg.right)/2;
  assert(Math.abs(htmlCenter-center.width/2)<18,
   'HTML center alignment shifted: '+JSON.stringify(center));
  assert(Math.abs(svgCenter-center.width/2)<18,
   'SVG center alignment shifted: '+JSON.stringify(center));
  assert(Math.abs(htmlCenter-svgCenter)<12,
   'HTML and SVG centers disagree: '+JSON.stringify(center));
 });

 await check('mixed Hebrew/English wraps remain visible in HTML and SVG, including sticky notes',async()=>{
  const samples=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {textLayoutMetrics}=await import('./js/inline-equation.js');
   const {drawItem,svgEl}=await import('./js/scene.js');
   const {readRichDocument,paragraphRuns}=await import('./js/rich-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:125px 90px 75px;background:white;z-index:2500';
   document.body.append(host);
   const fixtures=[
    {id:'wrapped-rtl',type:'text',x:0,y:0,w:195,h:12,fontSize:24,
     text:'לומדים מתמטיקה באמצעות תרגילים בעברית ובאנגלית',
     paragraphs:[{align:'right',dir:'rtl',list:'none'}]},
    {id:'wrapped-english',type:'text',x:0,y:0,w:205,h:12,fontSize:24,
     text:'Understanding variables through carefully written English examples',
     paragraphs:[{align:'left',dir:'ltr',list:'none'}]},
    {id:'wrapped-note',type:'note',x:0,y:0,w:225,h:20,fontSize:24,fill:'#fff1a8',
     text:'שלב ראשון עם הסבר מפורט\nSecond step with enough words to wrap',
     paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
                 {align:'left',dir:'ltr',list:'number'}]}
   ];
   const outcomes=[];
   for(const item of fixtures){
    const editor={area:host,board:{id:'browser-wrap-fixture-'+crypto.randomUUID(),
     viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
    const draft=new InlineText(editor,item,true);
    await document.fonts.ready;draft.resize();
    const rich=readRichDocument(draft.input,item);
    const model={...item,text:rich.runs.map(run=>run.text).join(''),
     runs:rich.runs,paragraphs:rich.paragraphs};
    const metrics=textLayoutMetrics(model,paragraphRuns(model));
    const input=draft.input.getBoundingClientRect();
    const walker=document.createTreeWalker(draft.input,NodeFilter.SHOW_TEXT);
    const tops=[],htmlGlyphs=[];
    let node;
    // Native Range rectangles verify actual browser line breaks rather
    // than relying on one bounding box per paragraph.
    while((node=walker.nextNode())){
     for(let offset=0;offset<node.length;offset++){
      if(/\s/.test(node.textContent[offset]))continue;
      const range=document.createRange();
      range.setStart(node,offset);range.setEnd(node,offset+1);
      const rect=range.getBoundingClientRect();
      if(!rect.width&&!rect.height)continue;
      const b={left:rect.left-input.left,right:rect.right-input.left,
       top:rect.top-input.top,bottom:rect.bottom-input.top};
      htmlGlyphs.push(b);
      if(!tops.some(t=>Math.abs(t-b.top)<3))tops.push(b.top);
     }
    }
    const scene=svgEl('svg',{width:item.w,height:Math.ceil(metrics.height+20)});
    scene.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none';
    const group=drawItem(model);scene.append(group);host.append(scene);
    const svg=group.querySelector('g:last-child');
    const vector=[...svg.querySelectorAll('text')].map(n=>n.getBBox());
    scene.remove();
    const nonSynthetic=metrics.lines.flatMap(line=>line.parts.filter(p=>!p.synthetic).map(p=>p.text)).join('');
    outcomes.push({id:item.id,w:item.w,height:draft.height,htmlScroll:draft.input.scrollHeight,
     svgHeight:metrics.height,nativeLines:tops.length,vectorLines:metrics.lines.length,
     sourceText:model.text.replaceAll('\n',''),renderedText:nonSynthetic,
     glyphs:htmlGlyphs,vector:vector.map(b=>({x:b.x,right:b.x+b.width,y:b.y,bottom:b.y+b.height}))});
    draft.finish(false);
   }
   host.remove();
   return outcomes;
  });
  for(const entry of samples){
   assert(entry.nativeLines>=2&&entry.vectorLines>=2,
    'Fixture did not actually wrap: '+JSON.stringify({id:entry.id,html:entry.nativeLines,svg:entry.vectorLines}));
   assert(Math.abs(entry.nativeLines-entry.vectorLines)<=2,
    'HTML/SVG wrapping differs by more than two lines: '+JSON.stringify({id:entry.id,html:entry.nativeLines,svg:entry.vectorLines}));
   assert.equal(entry.renderedText,entry.sourceText,'SVG line wrapping lost or duplicated characters: '+entry.id);
   assert(entry.height>=entry.htmlScroll-2&&entry.height>=entry.svgHeight,
    'Editing overlay clips wrapped content: '+entry.id);
   assert(entry.glyphs.length>12&&entry.vector.length>=2,
    'Wrapped glyph positions were not measured: '+entry.id);
   assert(entry.glyphs.every(b=>b.left>=-4&&b.right<=entry.w+4&&b.bottom<=entry.height+5),
    'HTML glyph escapes editing box: '+entry.id);
   assert(entry.vector.every(b=>b.x>=-6&&b.right<=entry.w+6&&b.y>=-6&&b.bottom<=entry.svgHeight+6),
    'SVG glyph escapes rendered text bounds: '+entry.id);
  }
 });

 await check('inline math uses native baselines, atomic wrapping and bounded HTML/SVG export',async()=>{
  const report=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {equationContentWidth,textLayoutMetrics}=await import('./js/inline-equation.js');
   const {paragraphRuns,readRichDocument}=await import('./js/rich-text.js');
   const {drawItem,sceneSVG,svgEl}=await import('./js/scene.js');
   const {createBoard,parseBackup,serializeBackup}=await import('./js/model.js');
   const mathCanvas=document.createElement('canvas');mathCanvas.width=80;mathCanvas.height=90;
   const mathContext=mathCanvas.getContext('2d');mathContext.fillStyle='#168b62';
   mathContext.fillRect(5,4,70,82);
   const equation={source:'x^2+1',src:mathCanvas.toDataURL('image/png'),w:80,h:90};
   const cases=[
    {id:'rtl-math',type:'note',x:0,y:0,w:330,h:20,fontSize:24,fill:'#fff1a8',
     text:'שלום \uFFFC English',runs:[{text:'שלום '},{text:'\uFFFC',equation},{text:' English'}],
     paragraphs:[{align:'right',dir:'rtl',list:'none'}]},
    {id:'wrapped-math',type:'text',x:0,y:0,w:145,h:15,fontSize:24,
     text:'Before \uFFFC after',runs:[{text:'Before '},{text:'\uFFFC',equation:{...equation,w:1400,h:45}},{text:' after'}],
     paragraphs:[{align:'left',dir:'ltr',list:'none'}]},
    {id:'tall-math',type:'text',x:0,y:0,w:330,h:15,fontSize:24,
     text:'Solve \uFFFC now',runs:[{text:'Solve '},{text:'\uFFFC',equation:{...equation,w:45,h:120}},{text:' now'}],
     paragraphs:[{align:'left',dir:'ltr',list:'none'}]}
   ];
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:125px 80px 50px;background:white;z-index:3000';
   document.body.append(host);
   const result=[];
   for(const item of cases){
    const editor={area:host,board:{id:'browser-inline-math-'+crypto.randomUUID(),
      viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
    const draft=new InlineText(editor,item,true);
    await document.fonts.ready;
    const img=draft.input.querySelector('.inline-equation img');
    await img.decode();
    draft.resize();
    const box=img.getBoundingClientRect(),inputBox=draft.input.getBoundingClientRect();
    const inline=img.closest('.inline-equation');
    const sentinel=document.createElement('span');
    sentinel.style.cssText='display:inline-block;width:0;height:0;line-height:0;vertical-align:baseline;padding:0;border:0;margin:0';
    inline.after(sentinel);
    const nativeBaseline=sentinel.getBoundingClientRect().top-inputBox.top;
    sentinel.remove();
    const snapshot=readRichDocument(draft.input,item),model={...item,
      text:snapshot.runs.map(run=>run.text).join(''),
      runs:snapshot.runs,paragraphs:snapshot.paragraphs};
    const metrics=textLayoutMetrics(model,paragraphRuns(model));
    const svg=svgEl('svg',{width:item.w,height:metrics.height+10});
    svg.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none';
    const drawing=drawItem(model);svg.append(drawing);host.append(svg);
    const vectorImage=drawing.querySelector('image');
    const vb=vectorImage?.getBBox();
    const exported=sceneSVG({...createBoard('Math export'),background:'plain',items:[model]});
    const exportCount=exported.querySelectorAll('image').length;
    const expectedBaselines=[];let top=metrics.pad;
    for(const line of metrics.lines){
      if(line.parts.some(part=>part.equation))expectedBaselines.push(top+line.height-metrics.font*.25);
      top+=line.height;
    }
    const actual={
      id:item.id,limit:equationContentWidth(item),pad:metrics.pad,
      imgX:box.left-inputBox.left,imgRight:box.right-inputBox.left,
      imgBottom:box.bottom-inputBox.top,imgWidth:box.width,imgHeight:box.height,
      nativeBaseline,verticalAlign:getComputedStyle(inline).verticalAlign,
      svgImage:vb?{x:vb.x,right:vb.x+vb.width,width:vb.width,
        y:vb.y,bottom:vb.y+vb.height,height:vb.height}:null,
      svgBaseline:expectedBaselines[0],svgLineCount:metrics.lines.length,
      editorHeight:draft.height,htmlScroll:draft.input.scrollHeight,
      layoutHeight:metrics.height,exportCount,plainText:model.text,
      equations:model.runs.filter(run=>run.equation).length
    };
    svg.remove();draft.finish(false);
    result.push(actual);
   }
   host.remove();
   return result;
  });
  for(const item of report){
   assert.equal(item.verticalAlign,'baseline','Equation did not align to native text baseline: '+item.id);
   assert(item.svgImage&&item.exportCount===1&&item.equations===1,
    'Equation lost during rendering or SVG export: '+JSON.stringify(item));
   assert(Math.abs(item.imgBottom-item.nativeBaseline)<3,
    'HTML equation baseline drift: '+JSON.stringify(item));
   assert(Math.abs(item.svgImage.bottom-item.svgBaseline)<0.1,
    'SVG equation baseline drift: '+JSON.stringify(item));
   assert(Math.abs(item.imgWidth-item.svgImage.width)<1&&Math.abs(item.imgHeight-item.svgImage.height)<1,
    'HTML/SVG equation scaling mismatch: '+JSON.stringify(item));
   assert(item.svgImage.x>=item.pad-2&&item.svgImage.right<=item.pad+item.limit+2,
    'SVG math escapes text content width: '+JSON.stringify(item));
   assert(item.imgX>=item.pad-3&&item.imgRight<=item.pad+item.limit+3,
    'HTML math escapes text content width: '+JSON.stringify(item));
   assert(item.svgImage.y>=item.pad-1&&item.svgImage.bottom<=item.layoutHeight+1,
    'SVG math escapes vertical text bounds: '+JSON.stringify(item));
   assert(item.editorHeight>=item.htmlScroll-2&&item.editorHeight>=item.layoutHeight,
    'HTML editor clips inline math: '+JSON.stringify(item));
   assert(item.plainText.includes('\uFFFC'),'Math placeholder was removed: '+item.id);
  }
  assert(report.find(item=>item.id==='wrapped-math').svgLineCount>1,
   'Oversized equation should wrap atomically onto an available line');
 });


 await check('inline equation keyboard, pointer and history preserve atomic selection in RTL/LTR',async()=>{
  const created=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {restoreLogicalSelection,captureLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:110px 80px 55px;background:white;z-index:2600';
   document.body.append(host);
   const art=document.createElement('canvas');art.width=60;art.height=35;
   const pen=art.getContext('2d');pen.fillStyle='#3455a5';pen.fillRect(2,2,55,30);
   const eq={source:'x^2',src:art.toDataURL('image/png'),w:60,h:35};
   const item={id:'atomic-math',type:'text',x:10,y:10,w:420,h:120,fontSize:24,
    text:'שלום \uFFFC English\nSolve \uFFFC now',
    runs:[{text:'שלום '},{text:'\uFFFC',equation:eq},{text:' English\nSolve '},
          {text:'\uFFFC',equation:{...eq,source:'y^2'}},{text:' now'}],
    paragraphs:[{align:'right',dir:'rtl',list:'none'},
                {align:'left',dir:'ltr',list:'none'}]};
   const editor={area:host,board:{id:'atomic-math-'+crypto.randomUUID(),
      viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(...args){this.saved=args;}};
   const draft=new InlineText(editor,item,true);
   const selection=window.getSelection();
   const move=(paragraph,offset)=>{
    draft.input.focus();
    if(!restoreLogicalSelection(draft.input,selection,
      {anchor:{paragraph,offset},focus:{paragraph,offset}}))throw Error('Cannot restore initial caret');
   };
   const state=()=>({logical:captureLogicalSelection(draft.input,selection),
    sources:readRichDocument(draft.input,draft.item).runs.filter(r=>r.equation).map(r=>r.equation.source),
    text:readRichDocument(draft.input,draft.item).runs.map(r=>r.text).join('')});
   move(1,6);
   window.__atomicMath={draft,editor,host,move,state};
   return state();
  });
  assert.deepEqual(created.sources,['x^2','y^2']);
  assert.equal(created.logical.focus.offset,6);

  await page.keyboard.press('ArrowRight');
  assert.equal((await page.evaluate(()=>window.__atomicMath.state())).logical.focus.offset,7,
   'LTR right arrow should skip the whole equation');
  await page.keyboard.press('ArrowLeft');
  assert.equal((await page.evaluate(()=>window.__atomicMath.state())).logical.focus.offset,6);
  await page.keyboard.press('Shift+ArrowRight');
  const selected=await page.evaluate(()=>window.__atomicMath.state());
  assert.deepEqual(selected.logical,{anchor:{paragraph:1,offset:6},focus:{paragraph:1,offset:7}},
   'Shift+Right should select exactly one math placeholder');
  await page.keyboard.press('Delete');
  const removedSelection=await page.evaluate(()=>window.__atomicMath.state());
  assert.deepEqual(removedSelection.sources,['x^2'],
   'Deleting a selected equation must remove its entire DOM token');
  assert.equal(removedSelection.text,'שלום \uFFFC English\nSolve  now');
  await page.keyboard.press('Control+z');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2','y^2'],
   'Undo must recover an equation deleted from a range selection');

  await page.evaluate(()=>window.__atomicMath.move(0,5));
  await page.keyboard.press('ArrowLeft');
  assert.equal((await page.evaluate(()=>window.__atomicMath.state())).logical.focus.offset,6,
   'RTL left arrow should skip the whole equation');
  await page.keyboard.press('ArrowRight');
  assert.equal((await page.evaluate(()=>window.__atomicMath.state())).logical.focus.offset,5);

  await page.evaluate(()=>window.__atomicMath.move(1,7));
  await page.keyboard.press('Backspace');
  const removed=await page.evaluate(()=>window.__atomicMath.state());
  assert.deepEqual(removed.sources,['x^2']);
  assert.equal(removed.text,'שלום \uFFFC English\nSolve  now');
  assert.equal(removed.logical.focus.offset,6);
  await page.keyboard.press('Control+z');
  const undone=await page.evaluate(()=>window.__atomicMath.state());
  assert.deepEqual(undone.sources,['x^2','y^2']);
  assert.equal(undone.text,created.text);
  await page.keyboard.press('Control+y');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2']);
  await page.keyboard.press('Control+z');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2','y^2']);

  await page.evaluate(()=>window.__atomicMath.move(1,6));
  await page.keyboard.press('Delete');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2']);
  await page.keyboard.press('Control+z');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2','y^2']);

  const mobile=await page.evaluate(()=>{
   const {draft,move,state}=window.__atomicMath;
   move(1,7);
   const event=new InputEvent('beforeinput',{
    inputType:'deleteContentBackward',bubbles:true,cancelable:true
   });
   draft.input.dispatchEvent(event);
   return {prevented:event.defaultPrevented,...state()};
  });
  assert.equal(mobile.prevented,true,'Atomic deletion should handle cancelable beforeinput');
  assert.deepEqual(mobile.sources,['x^2'],'Touch/IME deletion must remove the entire equation');
  await page.keyboard.press('Control+z');
  assert.deepEqual((await page.evaluate(()=>window.__atomicMath.state())).sources,['x^2','y^2']);

  const pointer=await page.evaluate(()=>{
   const {draft,move,state}=window.__atomicMath;
   const eq=draft.input.querySelector('.inline-equation');
   const r=eq.getBoundingClientRect();
   const click=x=>eq.dispatchEvent(new PointerEvent('pointerdown',{
    button:0,bubbles:true,clientX:x,clientY:r.top+r.height/2
   }));
   move(0,0);click(r.right-2);const right=state().logical.focus.offset;
   click(r.left+2);const left=state().logical.focus.offset;
   return {right,left};
  });
  assert.deepEqual(pointer,{right:5,left:6},
   'In RTL, clicking the equation right/left edges should locate the caret before/after it');

  const direction=await page.evaluate(()=>{
   const {draft,move,state}=window.__atomicMath;
   draft.input.children[0].dir='ltr';
   move(0,5);
   return state();
  });
  assert.equal(direction.logical.focus.offset,5);
  await page.keyboard.press('ArrowRight');
  assert.equal((await page.evaluate(()=>window.__atomicMath.state())).logical.focus.offset,6,
   'Changing paragraph to LTR must change arrow behavior around the equation');

  await page.evaluate(()=>{
   const {draft,host}=window.__atomicMath;
   draft.finish(false);host.remove();
  });
 });


 await check('inline equation clipboard preserves LaTeX, formatting, safe paste and accessible math',async()=>{
  const copied=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {restoreLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {TEXT_RICH_CLIPBOARD}=await import('./js/text-inline-clipboard.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:100px 70px 50px;background:white;z-index:2900';
   document.body.append(host);
   const canvas=document.createElement('canvas');canvas.width=60;canvas.height=40;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#1852cb';ctx.fillRect(2,2,56,36);
   const image=canvas.toDataURL('image/png');
   const equation={source:'\\frac{x+1}{2}',src:image,w:60,h:40};
   const source={id:'clip-source',type:'text',x:10,y:10,w:400,h:130,fontSize:24,
    text:'שלום \uFFFC English\nReview \uFFFC end',
    runs:[{text:'שלום ',bold:true,color:'#b42318'},
       {text:'\uFFFC',equation},
       {text:' English\nReview ',italic:true},
       {text:'\uFFFC',equation:{...equation,source:'y^2'}},
       {text:' end'}],
    paragraphs:[{align:'right',dir:'rtl',list:'none'},
                {align:'left',dir:'ltr',list:'bullet'}]};
   const editor={area:host,board:{id:'clipboard-'+crypto.randomUUID(),
     viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const draft=new InlineText(editor,source,true);
   const selected=window.getSelection();
   const choose=(start,end)=>{
    draft.input.focus();
    if(!restoreLogicalSelection(draft.input,selected,
      {anchor:{paragraph:0,offset:start},focus:{paragraph:0,offset:end}}))
     throw Error('Could not select source paragraph');
   };
   const data=new Map();
   const transfer={
    setData(type,value){data.set(type,value);},
    getData(type){return data.get(type)||'';}
   };
   const fire=(type,clipboardData)=>{
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'clipboardData',{value:clipboardData});
    draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   choose(0,14);
   const prevented=fire('copy',transfer);
   const meta=[...draft.input.querySelectorAll('.inline-equation')].map(node=>({
    role:node.getAttribute('role'),label:node.getAttribute('aria-label'),
    imgHidden:node.querySelector('img')?.getAttribute('aria-hidden')
   }));
   const doc=readRichDocument(draft.input,draft.item);
   window.__richClipboard={host,editor,source,draft,transfer,data,readRichDocument,
    TEXT_RICH_CLIPBOARD,fire,choose};
   return {prevented,plain:data.get('text/plain'),html:data.get('text/html'),
    rich:JSON.parse(data.get(TEXT_RICH_CLIPBOARD)),meta,
    beforeText:doc.runs.map(run=>run.text).join('')};
  });
  assert.equal(copied.prevented,true);
  assert.equal(copied.beforeText,'שלום \uFFFC English\nReview \uFFFC end');
  assert.equal(copied.rich.runs.find(run=>run.equation).equation.source,'\\frac{x+1}{2}');
  assert.equal(copied.rich.paragraphs[0].dir,'rtl');
  assert(copied.rich.runs.some(run=>run.bold&&run.color==='#b42318'));
  assert(copied.rich.runs.some(run=>run.italic));
  assert(copied.plain.includes('\\(\\frac{x+1}{2}\\)'));
  assert(!copied.plain.includes('\uFFFC'));
  assert(copied.html.includes('data-teaching-board-rich'));
  assert(copied.meta.every(node=>node.role==='math'&&
    node.label?.startsWith('Math equation: ')&&node.imgHidden==='true'),
    'Equation images must provide a single accessible math description');

  const pasted=await page.evaluate(()=>{
   const {host,draft,transfer,fire,editor}=window.__richClipboard;
   draft.finish(false);
   return true;
  });
  assert.equal(pasted,true);
  // Start an independent destination document while retaining the copied data.
  const destination=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {restoreLogicalSelection,captureLogicalSelection}=await import('./js/text-selection.js');
   const {host,editor,transfer,data,readRichDocument,TEXT_RICH_CLIPBOARD}=window.__richClipboard;
   const target={id:'clip-target',type:'text',x:10,y:10,w:500,h:100,fontSize:24,
    text:'Answer: END',paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
   const draft=new InlineText(editor,target,true),selection=window.getSelection();
   const select=(a,b=a)=>{
    draft.input.focus();
    if(!restoreLogicalSelection(draft.input,selection,
      {anchor:{paragraph:0,offset:a},focus:{paragraph:0,offset:b}}))
     throw Error('Cannot set destination caret');
   };
   const state=()=>{
    const doc=readRichDocument(draft.input,draft.item);
    return {text:doc.runs.map(run=>run.text).join(''),
      eqs:doc.runs.filter(run=>run.equation).map(run=>run.equation.source),
      bold:doc.runs.some(run=>run.bold&&run.color==='#b42318'&&run.text.includes('שלום')),
      italic:doc.runs.some(run=>run.italic&&run.text.includes('English')),
      paragraphs:doc.paragraphs,caret:captureLogicalSelection(draft.input,selection)};
   };
   const fire=(type,clipboardData)=>{
    const event=new Event(type,{bubbles:true,cancelable:true});
    Object.defineProperty(event,'clipboardData',{value:clipboardData});
    draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   select(8);
   const prevented=fire('paste',transfer);
   window.__richClipboard={...window.__richClipboard,draft,select,state,fire,editor,host};
   return {prevented,...state()};
  });
  assert.equal(destination.prevented,true);
  assert.equal(destination.text,'Answer: שלום \uFFFC EnglishEND');
  assert.deepEqual(destination.eqs,['\\frac{x+1}{2}']);
  assert(destination.bold&&destination.italic);
  assert.equal(destination.paragraphs[0].dir,'ltr','Destination paragraph direction must be retained');

  await page.evaluate(()=>window.__richClipboard.select(13,14));
  const cut=await page.evaluate(()=>{
   const {data,fire,state}=window.__richClipboard;
   const transfer={setData(type,value){data.set('cut:'+type,value);},
    getData(type){return data.get('cut:'+type)||'';}};
   const prevented=fire('cut',transfer);
   return {prevented,plain:transfer.getData('text/plain'),...state()};
  });
  assert(cut.prevented&&cut.plain.includes('\\frac{x+1}{2}'));
  assert.deepEqual(cut.eqs,[]);
  await page.keyboard.press('Control+z');
  assert.deepEqual((await page.evaluate(()=>window.__richClipboard.state())).eqs,['\\frac{x+1}{2}']);
  await page.keyboard.press('Control+y');
  assert.deepEqual((await page.evaluate(()=>window.__richClipboard.state())).eqs,[]);
  await page.keyboard.press('Control+z');

  const restored=await page.evaluate(()=>{
   const {data,fire,select,state}=window.__richClipboard;
   const transfer={getData(type){return type==='text/html'?data.get('text/html'):
     type==='text/plain'?data.get('text/plain'):'';}};
   const before=state().text;
   select(before.length);
   const prevented=fire('paste',transfer);
   return {prevented,...state()};
  });
  assert(restored.prevented);
  assert.deepEqual(restored.eqs,['\\frac{x+1}{2}','\\frac{x+1}{2}'],
   'The HTML clipboard fallback must keep the editable LaTeX source');
  assert(restored.bold&&restored.italic);

  const safe=await page.evaluate(()=>{
   const {select,fire,state,draft,host}=window.__richClipboard;
   const before=state().text;
   select(before.length);
   const untrusted='<img src=x onerror="window.__clipboardInjected=true">';
   const transfer={getData(type){return type==='text/html'?untrusted:
     type==='text/plain'?'<script>alert(1)</script>':'';}};
   const prevented=fire('paste',transfer);
   const result={prevented,...state(),scripts:draft.input.querySelectorAll('script').length,
    injected:!!window.__clipboardInjected};
   draft.finish(false);host.remove();
   return result;
  });
  assert(safe.prevented);
  assert.equal(safe.scripts,0);
  assert.equal(safe.injected,false);
  assert(safe.text.endsWith('<script>alert(1)</script>'),
   'Untrusted HTML must be inserted only as literal plain text');
 });


 await check('TXT-055 multi-paragraph clipboard retains list ordinals and bilingual styles',async()=>{
  const report=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {restoreLogicalSelection,captureLogicalSelection}=await import('./js/text-selection.js');
   const {TEXT_RICH_CLIPBOARD}=await import('./js/text-inline-clipboard.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:110px 80px 60px;background:white;z-index:3200';
   document.body.append(host);
   const editor={area:host,board:{id:'multi-clip-'+crypto.randomUUID(),
    viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const canvas=document.createElement('canvas');canvas.width=60;canvas.height=40;
   const paint=canvas.getContext('2d');paint.fillStyle='#227dcc';paint.fillRect(2,2,56,36);
   const eq={source:'\\frac{a+1}{2}',src:canvas.toDataURL('image/png'),w:60,h:40};
   const source={id:'multi-source',type:'text',x:0,y:0,w:440,h:40,fontSize:24,
    text:'ראשון\nאלגוריתם \uFFFC\nSolve x^2\nסיום',
    runs:[{text:'ראשון\n'},{text:'אלגוריתם ',bold:true,color:'#b42318'},
      {text:'\uFFFC',equation:eq},{text:'\nSolve x^2',italic:true},{text:'\nסיום'}],
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
      {align:'right',dir:'rtl',list:'number'},
      {align:'left',dir:'ltr',list:'number'},
      {align:'right',dir:'rtl',list:'bullet'}]};
   const selection=window.getSelection();
   const create=(item)=>new InlineText(editor,item,true);
   const select=(draft,a,b=a)=>{
    draft.input.focus();
    if(!restoreLogicalSelection(draft.input,selection,{anchor:a,focus:b}))
     throw Error('Unable to place a clipboard selection');
   };
   const pos=(paragraph,offset)=>({paragraph,offset});
   const state=draft=>{
    const doc=readRichDocument(draft.input,draft.item);
    const ol=draft.input.querySelector('ol');
    return {text:doc.runs.map(r=>r.text).join(''),paragraphs:doc.paragraphs,
      eqs:doc.runs.filter(r=>r.equation).map(r=>r.equation.source),
      bold:doc.runs.some(r=>r.bold&&r.color==='#b42318'&&r.text.includes('אלגוריתם')),
      italic:doc.runs.some(r=>r.italic&&r.text.includes('Solve')),
      listStart:ol?.start??null,listItems:ol?.children.length??0,
      listDirs:ol?[...ol.children].map(li=>li.dir):[],
      caret:captureLogicalSelection(draft.input,selection)};
   };
   const data=new Map();
   const transfer={setData(type,value){data.set(type,value);},
     getData(type){return data.get(type)||'';}};
   const fire=(draft,name,clipboardData)=>{
    const event=new Event(name,{cancelable:true,bubbles:true});
    Object.defineProperty(event,'clipboardData',{value:clipboardData});
    draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   let draft=create(source);
   select(draft,pos(1,0),pos(2,9));
   const copied=fire(draft,'copy',transfer);
   const meta=JSON.parse(data.get(TEXT_RICH_CLIPBOARD));
   const html=data.get('text/html'),plain=data.get('text/plain');
   const sourceBefore=state(draft);
   draft.finish(false);

   const empty={id:'multi-empty',type:'text',x:0,y:0,w:450,h:20,fontSize:24,
    text:'',paragraphs:[{align:'auto',dir:'auto',list:'none'}]};
   draft=create(empty);
   select(draft,pos(0,0));
   const pasted=fire(draft,'paste',transfer);
   const afterPaste=state(draft);
   draft.stepTextHistory('undo');
   const afterUndo=state(draft);
   draft.stepTextHistory('redo');
   const afterRedo=state(draft);
   select(draft,pos(0,0),pos(1,0));
   const cutData=new Map();
   const cutTransfer={setData(type,value){cutData.set(type,value);},
    getData(type){return cutData.get(type)||'';}};
   const cut=fire(draft,'cut',cutTransfer);
   const afterCut=state(draft);
   draft.stepTextHistory('undo');
   const afterCutUndo=state(draft);
   draft.finish(false);

   const bullet={id:'multi-bullet',type:'text',x:0,y:0,w:490,h:20,fontSize:24,
    text:'Prefix tail',paragraphs:[{align:'right',dir:'rtl',list:'bullet'}]};
   draft=create(bullet);
   select(draft,pos(0,7));
   const prefixPasted=fire(draft,'paste',transfer);
   const afterPrefixPaste=state(draft);
   draft.finish(false);

   const fallback={id:'multi-fallback',type:'text',x:0,y:0,w:490,h:20,fontSize:24,
    text:'',paragraphs:[{align:'auto',dir:'auto',list:'none'}]};
   draft=create(fallback);
   select(draft,pos(0,0));
   const htmlOnly={
    getData(type){
      return type===TEXT_RICH_CLIPBOARD?'{invalid JSON':
       type==='text/html'?html:type==='text/plain'?plain:'';
    }
   };
   const htmlPasted=fire(draft,'paste',htmlOnly);
   const afterHtmlPaste=state(draft);
   draft.finish(false);

   const numbered={id:'multi-plain',type:'text',x:0,y:0,w:480,h:25,fontSize:24,
    text:'לפני סוף',
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:12}]};
   draft=create(numbered);
   select(draft,pos(0,5));
   const unsafe={
    getData(type){
      return type==='text/html'?'<img src=x onerror="window.__pasteAttack=true">':
       type==='text/plain'?'first\nsecond\nthird':'';
    }
   };
   const plainPasted=fire(draft,'paste',unsafe),afterPlainPaste=state(draft);
   const injected=!!window.__pasteAttack;
   const unexpectedImageCount=draft.input.querySelectorAll('img').length;
   draft.finish(false);
   host.remove();
   return {copied,meta,html,plain,sourceBefore,pasted,afterPaste,afterUndo,
     afterRedo,cut,afterCut,afterCutUndo,prefixPasted,afterPrefixPaste,
     htmlPasted,afterHtmlPaste,plainPasted,afterPlainPaste,injected,unexpectedImageCount};
  });
  assert(report.copied);
  assert.equal(report.meta.paragraphs[0].numberStart,8);
  assert.equal(report.meta.paragraphs[1].list,'number');
  assert.equal(report.meta.paragraphs[0].dir,'rtl');
  assert.equal(report.meta.paragraphs[1].dir,'ltr');
  assert.equal(report.meta.runs.find(r=>r.equation)?.equation.source,'\\frac{a+1}{2}');
  assert.match(report.html,/<ol start="8">/);
  assert.match(report.html,/<li dir="rtl"/);
  assert.match(report.html,/<li dir="ltr"/);
  assert.match(report.html,/<strong>אלגוריתם <\/strong>/);
  assert.match(report.html,/<em>Solve x\^2<\/em>/);
  assert(report.plain.includes('\\(\\frac{a+1}{2}\\)'));

  assert(report.pasted,'Rich paste should intercept native browser paste');
  assert.equal(report.afterPaste.text,'אלגוריתם \uFFFC\nSolve x^2');
  assert.deepEqual(report.afterPaste.eqs,['\\frac{a+1}{2}']);
  assert(report.afterPaste.bold&&report.afterPaste.italic);
  assert.equal(report.afterPaste.listStart,8);
  assert.equal(report.afterPaste.listItems,2);
  assert.deepEqual(report.afterPaste.listDirs,['rtl','ltr']);
  assert.equal(report.afterPaste.paragraphs[0].numberStart,8);
  assert.equal(report.afterPaste.paragraphs[1].numberStart,undefined);
  assert.equal(report.afterUndo.text,'');
  assert.deepEqual(report.afterRedo,report.afterPaste,'Redo should reconstruct numbered RTL/LTR paragraphs');

  assert(report.cut);
  assert.equal(report.afterCut.text,'Solve x^2');
  assert.equal(report.afterCut.listStart,9,
   'Removing a complete numbered paragraph should retain the next real ordinal');
  assert.equal(report.afterCut.paragraphs[0].dir,'ltr');
  assert.deepEqual(report.afterCutUndo,report.afterPaste,'Undo should restore both copied list rows');

  assert(report.prefixPasted);
  assert.equal(report.afterPrefixPaste.paragraphs[0].list,'bullet');
  assert.equal(report.afterPrefixPaste.paragraphs[1].list,'number');
  assert.equal(report.afterPrefixPaste.paragraphs[1].numberStart,9,
   'A list pasted after a bullet prefix must preserve its remaining ordinal');
  assert.equal(report.afterPrefixPaste.listStart,9);

  assert(report.htmlPasted);
  assert.equal(report.afterHtmlPaste.listStart,8);
  assert.deepEqual(report.afterHtmlPaste.eqs,['\\frac{a+1}{2}']);
  assert(report.plainPasted);
  assert.deepEqual(report.afterPlainPaste.paragraphs.map(p=>p.list),
   ['number','number','number']);
  assert.deepEqual(report.afterPlainPaste.paragraphs.map(p=>p.dir),
   ['rtl','rtl','rtl']);
  assert.equal(report.afterPlainPaste.listStart,12);
  assert.equal(report.afterPlainPaste.listItems,3);
  assert.equal(report.injected,false);
  assert.equal(report.unexpectedImageCount,0);
 });

 await check('TXT-056 plain paste inherits caret style, pending marks and accessible math in RTL/LTR',async()=>{
  const report=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {restoreLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:100px 70px 50px;background:white;z-index:3600';
   document.body.append(host);
   const editor={area:host,board:{id:'plain-paste-'+crypto.randomUUID(),
      viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const textModel={
    type:'text',x:0,y:0,w:500,h:40,fontSize:24,
    text:'שלום English\nFinal',
    runs:[{text:'שלום ',bold:true,color:'#b42318'},
      {text:'English',italic:true,color:'#147d92'},
      {text:'\nFinal',underline:true}],
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:8},
      {align:'left',dir:'ltr',list:'bullet'}]
   };
   const selection=window.getSelection();
   const create=(item)=>new InlineText(editor,{...structuredClone(item),
     id:'plain-paste-'+crypto.randomUUID()},true);
   const caret=(draft,p,offset,end=offset)=>{
    draft.input.focus();
    const a={paragraph:p,offset},f={paragraph:p,offset:end};
    if(!restoreLogicalSelection(draft.input,selection,{anchor:a,focus:f}))
      throw Error('Cannot place plaintext paste caret');
   };
   const state=draft=>{
    const doc=readRichDocument(draft.input,draft.item);
    const ordered=draft.input.querySelector('ol');
    return {text:doc.runs.map(r=>r.text).join(''),runs:doc.runs,
      paragraphs:doc.paragraphs,listStart:ordered?.start,
      directions:[...draft.input.querySelectorAll('div,li')].map(el=>el.dir)};
   };
   const paste=(draft,plain,html='')=>{
    const data={getData(type){
      return type==='text/plain'?plain:type==='text/html'?html:'';
    }};
    const event=new Event('paste',{cancelable:true,bubbles:true});
    Object.defineProperty(event,'clipboardData',{value:data});
    draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   let draft=create(textModel);caret(draft,0,2);
   const prevented=paste(draft,'אחד\nשניים');
   const multiline=state(draft);
   draft.stepTextHistory('undo');
   const undone=state(draft);
   draft.stepTextHistory('redo');
   const redone=state(draft);
   draft.finish(false);

   const boundary=create(textModel);
   caret(boundary,0,5);
   paste(boundary,'Boundary');
   const edge=state(boundary);
   boundary.finish(false);

   const english=create(textModel);
   caret(english,0,8);
   paste(english,'Inserted');
   const italic=state(english);
   english.finish(false);

   const selectionReplace=create(textModel);
   caret(selectionReplace,0,5,8);
   paste(selectionReplace,'REPLACE');
   const replaced=state(selectionReplace);
   selectionReplace.finish(false);

   const nextParagraph=create(textModel);
   caret(nextParagraph,1,2);
   paste(nextParagraph,'UNDER');
   const underlined=state(nextParagraph);
   nextParagraph.finish(false);

   const pending=create(textModel);
   caret(pending,0,2);
   pending.pendingMarks={bold:false,color:'#147d92'};
   const pendingPrevented=paste(pending,'first\r\nsecond');
   const pendingState=state(pending);
   pending.finish(false);

   const canvas=document.createElement('canvas');canvas.width=30;canvas.height=20;
   canvas.getContext('2d').fillRect(2,2,26,16);
   const equation={source:'x^2',src:canvas.toDataURL('image/png'),w:30,h:20};
   const eqModel={type:'text',x:0,y:0,w:400,h:30,fontSize:24,
     text:'Hello\uFFFCworld\nEnglish',
     runs:[{text:'Hello',bold:true,color:'#147d92'},
       {text:'\uFFFC',equation},{text:'world',italic:true},{text:'\nEnglish',underline:true}],
     paragraphs:[{align:'right',dir:'rtl',list:'none'},
       {align:'left',dir:'ltr',list:'none'}]};
   const nearBefore=create(eqModel);
   caret(nearBefore,0,5);
   paste(nearBefore,'BEFORE');
   const beforeMath=state(nearBefore);
   nearBefore.finish(false);
   const nearAfter=create(eqModel);
   caret(nearAfter,0,6);
   paste(nearAfter,'AFTER');
   const afterMath=state(nearAfter);
   const mathLabels=[...nearAfter.input.querySelectorAll('[role="math"]')]
     .map(n=>({name:n.getAttribute('aria-label'),
       hidden:n.querySelector('img')?.getAttribute('aria-hidden')}));
   nearAfter.finish(false);

   const hostile=create(textModel);
   caret(hostile,0,2);
   const plain='<script>window.__pasteAttack=true</script>';
   const untrustedPrevented=paste(hostile,plain,
     '<img src=x onerror="window.__pasteAttack=true">');
   const untrustedState=state(hostile);
   const scriptCount=hostile.input.querySelectorAll('script').length,
    injected=!!window.__pasteAttack;
   hostile.finish(false);
   host.remove();
   return {prevented,multiline,undone,redone,edge,italic,replaced,
     underlined,pendingPrevented,pendingState,beforeMath,afterMath,mathLabels,
     untrustedPrevented,untrustedState,scriptCount,injected};
  });
  const inserted=(doc,text)=>doc.runs.find(r=>r.text.includes(text));
  assert(report.prevented);
  assert.equal(report.multiline.text,'שלאחד\nשנייםום English\nFinal');
  assert(inserted(report.multiline,'אחד').bold);
  assert.equal(inserted(report.multiline,'אחד').color,'#b42318');
  assert.deepEqual(report.multiline.paragraphs.map(x=>x.dir),['rtl','rtl','ltr']);
  assert.deepEqual(report.multiline.paragraphs.map(x=>x.list),['number','number','bullet']);
  assert.equal(report.multiline.listStart,8);
  assert.equal(report.undone.text,'שלום English\nFinal');
  assert.deepEqual(report.redone,report.multiline);
  assert.equal(inserted(report.edge,'Boundary').color,'#b42318');
  assert(inserted(report.italic,'Inserted').italic);
  assert.equal(inserted(report.italic,'Inserted').color,'#147d92');
  assert(inserted(report.replaced,'REPLACE').italic);
  assert.equal(inserted(report.replaced,'REPLACE').color,'#147d92');
  assert(inserted(report.underlined,'UNDER').underline);
  assert.equal(inserted(report.underlined,'UNDER').color,undefined);
  assert.equal(report.pendingPrevented,true);
  assert.equal(report.pendingState.text,'שלfirst\nsecondום English\nFinal');
  assert.equal(inserted(report.pendingState,'first').bold,false);
  assert.equal(inserted(report.pendingState,'first').color,'#147d92');
  assert.deepEqual(report.pendingState.paragraphs.map(x=>x.dir),['rtl','rtl','ltr']);
  assert(inserted(report.beforeMath,'BEFORE').bold);
  assert.equal(inserted(report.beforeMath,'BEFORE').color,'#147d92');
  assert(inserted(report.afterMath,'AFTER').italic);
  assert.equal(inserted(report.afterMath,'AFTER').color,undefined);
  assert.deepEqual(report.afterMath.runs.filter(r=>r.equation).map(r=>r.equation.source),['x^2']);
  assert.deepEqual(report.mathLabels,[{name:'Math equation: x^2',hidden:'true'}]);
  assert(report.untrustedPrevented);
  assert.equal(report.scriptCount,0);
  assert.equal(report.injected,false);
  assert(report.untrustedState.text.includes('<script>window.__pasteAttack=true</script>'));
  assert(inserted(report.untrustedState,'<script>').bold);
 });


 await check('TXT-057 explicit paste formatting modes work with keyboard and preserve math source',async()=>{
  const initial=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {restoreLogicalSelection,captureLogicalSelection}=await import('./js/text-selection.js');
   const {TEXT_RICH_CLIPBOARD}=await import('./js/text-inline-clipboard.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:105px 60px 40px;background:#fff;z-index:4100';
   document.body.append(host);
   const board={id:'mode-clipboard-'+crypto.randomUUID(),viewport:{x:0,y:0,zoom:1}};
   const editor={area:host,board,disposed:true,paint(){},applyText(){}};
   const canvas=document.createElement('canvas');canvas.width=40;canvas.height=26;
   canvas.getContext('2d').fillRect(2,2,36,22);
   const eq={source:'x^2+1',src:canvas.toDataURL('image/png'),w:40,h:26};
   const source={schema:1,runs:[
    {text:'שלום ',bold:true,color:'#b42318'},
    {text:'\uFFFC',equation:eq},
    {text:' English\nSecond',underline:true,color:'#7c50b0'}
   ],paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:8},
    {align:'left',dir:'ltr',list:'number'}]};
   const target={type:'text',x:10,y:10,w:540,h:90,fontSize:24,
    text:'Start End',runs:[{text:'Start End',italic:true,color:'#147d92'}],
    paragraphs:[{align:'center',dir:'ltr',list:'bullet'}]};
   const data={getData(type){
    if(type===TEXT_RICH_CLIPBOARD)return JSON.stringify(source);
    if(type==='text/plain')return 'שלום \\(x^2+1\\) English\nSecond';
    return '';
   }};
   const create=()=>{
    const draft=new InlineText(editor,{...structuredClone(target),
     id:'mode-target-'+crypto.randomUUID()},true);
    draft.input.focus();
    const point={paragraph:0,offset:6},selection=window.getSelection();
    if(!restoreLogicalSelection(draft.input,selection,{anchor:point,focus:point}))
     throw Error('Could not place paste caret');
    return draft;
   };
   const state=()=>{
    const draft=window.__pasteModeTest.draft,doc=readRichDocument(draft.input,draft.item);
    return {text:doc.runs.map(r=>r.text).join(''),runs:doc.runs,
     paragraphs:doc.paragraphs,
     equations:doc.runs.filter(r=>r.equation).map(r=>r.equation.source),
     position:captureLogicalSelection(draft.input,window.getSelection()),
     mode:draft.pasteFormattingMode,selectedMode:draft.pasteModeSelect.value,
     active:document.activeElement===draft.input};
   };
   const paste=()=>{
    const event=new Event('paste',{bubbles:true,cancelable:true});
    Object.defineProperty(event,'clipboardData',{value:data});
    window.__pasteModeTest.draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   const draft=create();
   window.__pasteModeTest={host,editor,draft,target,create,state,paste};
   const mode=draft.pasteModeSelect;
   return {initialMode:mode.value,label:mode.getAttribute('aria-label'),
    options:[...mode.options].map(o=>({text:o.text,value:o.value})),
    position:state().position};
  });
  assert.equal(initial.initialMode,'keep');
  assert.equal(initial.label,'Paste formatting mode');
  assert.deepEqual(initial.options,[
   {text:'Keep source formatting',value:'keep'},
   {text:'Match destination formatting',value:'match'}]);
  assert.deepEqual(initial.position.focus,{paragraph:0,offset:6});
  const keep=await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   return {prevented:m.paste(),...m.state()};
  });
  assert(keep.prevented);
  assert.equal(keep.mode,'keep');
  assert.equal(keep.equations[0],'x^2+1');
  assert(keep.runs.some(r=>r.text.includes('שלום')&&r.bold&&r.color==='#b42318'));
  assert(keep.runs.some(r=>r.text.includes('English')&&r.underline&&r.color==='#7c50b0'));
  assert.deepEqual(keep.paragraphs.map(p=>p.list),['bullet','number']);
  assert.equal(keep.paragraphs[1].numberStart,9);
  const restored=await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   m.draft.finish(false);
   m.draft=m.create();
   return m.state();
  });
  assert.equal(restored.mode,'keep');
  assert.deepEqual(restored.position.focus,{paragraph:0,offset:6});

  const mode=page.locator('.inline-text-actions select[aria-label="Paste formatting mode"]').last();
  await mode.focus();
  await page.keyboard.press('ArrowDown');
  const afterKeyboard=await page.evaluate(()=>window.__pasteModeTest.state());
  assert.equal(afterKeyboard.mode,'match','Native ArrowDown should switch paste formatting mode');
  assert.equal(afterKeyboard.selectedMode,'match');
  assert(afterKeyboard.active,'Changing mode should return focus to the editor');
  assert.deepEqual(afterKeyboard.position.focus,{paragraph:0,offset:6},
   'Mode switch must preserve selection and the exact paste insertion point');
  const matched=await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   return {prevented:m.paste(),...m.state()};
  });
  assert(matched.prevented);
  assert.equal(matched.text,keep.text);
  assert.deepEqual(matched.equations,['x^2+1']);
  assert(matched.runs.some(r=>r.text.includes('שלום')&&r.italic&&
   !r.bold&&r.color==='#147d92'));
  assert(matched.runs.some(r=>r.text.includes('English')&&r.italic&&
   !r.underline&&r.color==='#147d92'));
  assert(matched.runs.some(r=>r.text.includes('Second')&&r.italic&&
   !r.underline&&r.color==='#147d92'));
  assert.deepEqual(matched.paragraphs.map(p=>p.dir),['ltr','ltr']);
  assert.deepEqual(matched.paragraphs.map(p=>p.list),['bullet','bullet']);
  assert(matched.runs.find(r=>r.equation).equation.src.startsWith('data:image/png;base64,'));
  const history=await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   m.draft.stepTextHistory('undo');const undo=m.state();
   m.draft.stepTextHistory('redo');const redo=m.state();
   return {undo,redo};
  });
  assert.equal(history.undo.text,'Start End');
  assert.deepEqual(history.redo.text,matched.text);
  assert.deepEqual(history.redo.equations,['x^2+1']);
  assert.deepEqual(history.redo.paragraphs,matched.paragraphs);

  const reset=await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   m.draft.finish(false);m.draft=m.create();
   m.draft.pasteModeSelect.focus();
   return m.state();
  });
  assert.equal(reset.mode,'keep','Paste setting should remain local to one draft');
  await page.keyboard.press('ArrowDown');
  const keyboardMatch=await page.evaluate(()=>window.__pasteModeTest.state());
  assert.equal(keyboardMatch.mode,'match');
  await mode.focus();
  await page.keyboard.press('ArrowUp');
  const keyboardKeep=await page.evaluate(()=>window.__pasteModeTest.state());
  assert.equal(keyboardKeep.mode,'keep');
  assert(keyboardKeep.active);
  assert.deepEqual(keyboardKeep.position.focus,{paragraph:0,offset:6});
  await page.evaluate(()=>{
   const m=window.__pasteModeTest;
   m.draft.finish(false);
   m.host.remove();
   delete window.__pasteModeTest;
  });
 });

 await check('TXT-058 external editor clipboard and keyboard plain paste interoperability',async()=>{
  const result=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {restoreLogicalSelection}=await import('./js/text-selection.js');
   const {TEXT_RICH_CLIPBOARD,externalRichClipboardHTML,
      clipboardFromTransfer,clipboardPlainText}=await import('./js/text-inline-clipboard.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:105px 60px 40px;z-index:4200;background:#fff';
   document.body.append(host);
   const editor={area:host,board:{id:'external-clipboard-'+crypto.randomUUID(),
    viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const selection=window.getSelection();
   const create=(text='')=>new InlineText(editor,{
    id:'ext-'+crypto.randomUUID(),type:'text',x:0,y:0,w:500,h:50,fontSize:24,
    text,runs:[{text,italic:true,color:'#147d92'}],
    paragraphs:[{align:'left',dir:'ltr',list:'bullet'}]},true);
   const choose=(draft,at)=>{
    draft.input.focus();const point={paragraph:0,offset:at};
    if(!restoreLogicalSelection(draft.input,selection,{anchor:point,focus:point}))
     throw Error('Cannot position external clipboard caret');
   };
   const state=draft=>{
    const doc=readRichDocument(draft.input,draft.item);
    return {text:doc.runs.map(r=>r.text).join(''),runs:doc.runs,
      paragraphs:doc.paragraphs,
      equations:doc.runs.filter(r=>r.equation).map(r=>r.equation.source)};
   };
   const send=(draft,clipboardData)=>{
    const event=new Event('paste',{bubbles:true,cancelable:true});
    Object.defineProperty(event,'clipboardData',{value:clipboardData});
    draft.input.dispatchEvent(event);
    return event.defaultPrevented;
   };
   const html='<ol start="4"><li dir="rtl" style="text-align:right">'+
    '<strong style="color:#b42318">שלום</strong></li>'+
    '<li dir="ltr"><em>English</em></li></ol>';
   const htmlOnly={getData(type){return type==='text/html'?html:'';}};
   const parsed=externalRichClipboardHTML(html);
   let d=create();choose(d,0);
   const yes=send(d,htmlOnly),htmlOnlyState=state(d);
   const htmlStart=d.input.querySelector('ol')?.start;
   d.stepTextHistory('undo');const undone=state(d);
   d.stepTextHistory('redo');const redone=state(d);
   d.finish(false);

   d=create('BeforeAfter');choose(d,6);
   d.pasteModeSelect.value='match';
   d.pasteModeSelect.dispatchEvent(new Event('change',{bubbles:true}));
   const matchPrevented=send(d,htmlOnly),matchState=state(d);
   d.finish(false);

   const canvas=document.createElement('canvas');canvas.width=40;canvas.height=25;
   canvas.getContext('2d').fillRect(2,2,36,21);
   const rich={schema:1,
    runs:[{text:'אלגברה ',bold:true,color:'#b42318'},
      {text:'\uFFFC',equation:{source:'x^2',src:canvas.toDataURL('image/png'),w:40,h:25}}],
    paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:9}]};
   const richClipboard={
    getData(type){
     return type===TEXT_RICH_CLIPBOARD?JSON.stringify(rich):
      type==='text/plain'?'אלגברה \\(x^2\\)':'';
    }
   };
   d=create('StartEnd');choose(d,5);
   const plainKey=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,shiftKey:true,key:'v'});
   d.input.dispatchEvent(plainKey);
   const flagBefore=d.forcePlainNextPaste;
   const forced=send(d,richClipboard),forcedState=state(d);
   d.stepTextHistory('undo');const forcedUndo=state(d);
   d.finish(false);

   d=create('StartEnd');choose(d,5);
   const commandKey=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,metaKey:true,shiftKey:true,key:'v'});
   d.input.dispatchEvent(commandKey);
   const macFlag=d.forcePlainNextPaste;
   const macPlain=send(d,richClipboard),macPlainState=state(d);
   d.finish(false);

   d=create('StartEnd');choose(d,5);
   d.input.dispatchEvent(new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,shiftKey:true,key:'v'}));
   d.input.dispatchEvent(new KeyboardEvent('keyup',{
    bubbles:true,ctrlKey:true,shiftKey:true,key:'v'}));
   const staleCleared=!d.forcePlainNextPaste;
   const richAfterKeyup=send(d,richClipboard),richAfterKeyupState=state(d);
   d.finish(false);

   d=create('StartEnd');choose(d,5);
   const richKey=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,key:'v'});
   d.input.dispatchEvent(richKey);
   const regular=send(d,richClipboard),regularState=state(d);
   d.finish(false);

   const encodedHTML='<div data-teaching-board-rich="'+
    encodeURIComponent(JSON.stringify(rich))+'">'+
    'אלגברה \\(x^2\\)</div>';
   const htmlCarrier={getData(type){return type==='text/html'?encodedHTML:'';}};
   d=create();choose(d,0);
   d.input.dispatchEvent(new KeyboardEvent('keydown',{
    bubbles:true,ctrlKey:true,shiftKey:true,key:'v'}));
   const carrierPlain=send(d,htmlCarrier),carrierPlainState=state(d);
   d.finish(false);

   const safeFragment='<p dir="rtl"><span style="color:#147d92;'+
    'font-weight:bold">לימוד</span><br>English</p>'+
    '<p><em>Second</em><span style="display:none">HIDDEN</span></p>';
   const imported=externalRichClipboardHTML(safeFragment);
   const officeHTML='<html><head><meta charset="utf-8"><style>.office{font-size:14px}</style>'+
    '</head><body><p class="office" dir="rtl"><strong>Office content</strong></p></body></html>';
   const officeImported=externalRichClipboardHTML(officeHTML);
   d=create();choose(d,0);
   const withBr=send(d,{getData(type){return type==='text/html'?safeFragment:'';}}),
    brState=state(d);
   d.finish(false);

   const evil='<p>Hello</p><img src="x" onerror="window.__externalInjected=true">';
   const evilData={getData(type){
    return type==='text/html'?evil:
     type==='text/plain'?'<script>window.__externalInjected=true</script>':'';
   }};
   d=create('A');choose(d,1);
   const preventedUnsafe=send(d,evilData),unsafeState=state(d);
   const unsafeNodes=d.input.querySelectorAll('img,script,iframe,svg').length;
   d.finish(false);

   const htmlGuard={getData(type){
    return type==='text/html'?'<p>'+('X'.repeat(251000))+'</p>':'';
   }};
   d=create('SAFE');choose(d,2);
   const oversize=send(d,htmlGuard),oversizeState=state(d);
   d.finish(false);
   const injected=!!window.__externalInjected;
   host.remove();
   return {parsed,yes,htmlOnlyState,htmlStart,undone,redone,
    matchPrevented,matchState,flagBefore,forced,forcedState,
    forcedUndo,macFlag,macPlain,macPlainState,staleCleared,richAfterKeyup,
    richAfterKeyupState,regular,regularState,carrierPlain,carrierPlainState,
    imported,officeImported,withBr,brState,preventedUnsafe,unsafeState,unsafeNodes,
    oversize,oversizeState,injected};
  });
  assert(result.parsed);
  assert.equal(result.parsed.paragraphs[0].numberStart,4);
  assert.deepEqual(result.parsed.paragraphs.map(p=>p.dir),['rtl','ltr']);
  assert(result.yes);
  assert.equal(result.htmlOnlyState.text,'שלום\nEnglish');
  assert.equal(result.htmlStart,4);
  assert(result.htmlOnlyState.runs.some(r=>r.text.includes('שלום')&&r.bold&&r.color==='#b42318'));
  assert(result.htmlOnlyState.runs.some(r=>r.text.includes('English')&&r.italic));
  assert.equal(result.undone.text,'');
  assert.deepEqual(result.redone,result.htmlOnlyState);
  assert(result.matchPrevented);
  assert.equal(result.matchState.text,'Beforeשלום\nEnglishAfter');
  assert.deepEqual(result.matchState.paragraphs.map(p=>p.list),['bullet','bullet']);
  assert.deepEqual(result.matchState.paragraphs.map(p=>p.dir),['ltr','ltr']);
  assert(result.matchState.runs.some(r=>r.text.includes('שלום')&&
    r.italic&&r.color==='#147d92'&&!r.bold));
  assert(result.matchState.runs.some(r=>r.text.includes('English')&&
    r.italic&&r.color==='#147d92'));
  assert.equal(result.flagBefore,true);
  assert(result.forced);
  assert.equal(result.forcedState.text,'Startאלגברה \\(x^2\\)End');
  assert.deepEqual(result.forcedState.equations,[]);
  assert(result.forcedState.runs.some(r=>r.text.includes('אלגברה')&&
    r.italic&&r.color==='#147d92'));
  assert.equal(result.forcedUndo.text,'StartEnd');
  assert(result.macFlag);
  assert(result.macPlain);
  assert.equal(result.macPlainState.equations.length,0);
  assert(result.macPlainState.text.includes('\\(x^2\\)'));
  assert(result.staleCleared,'Cancelled Ctrl+Shift+V should not change a later paste');
  assert(result.richAfterKeyup);
  assert.deepEqual(result.richAfterKeyupState.equations,['x^2']);
  assert(result.regular);
  assert.deepEqual(result.regularState.equations,['x^2']);
  assert(result.regularState.runs.some(r=>r.text.includes('אלגברה')&&r.bold));
  assert(result.carrierPlain);
  assert(result.carrierPlainState.text.includes('\\(x^2\\)'));
  assert.deepEqual(result.carrierPlainState.equations,[]);
  assert(result.imported);
  assert(result.officeImported);
  assert.equal(result.officeImported.runs[0].text,'Office content');
  assert.equal(result.officeImported.runs[0].bold,true);
  assert.equal(result.officeImported.paragraphs[0].dir,'rtl');
  assert(result.withBr);
  assert(result.brState.text.includes('לימוד\nEnglish'));
  assert(result.brState.text.includes('Second'));
  assert(!result.brState.text.includes('HIDDEN'));
  assert(result.preventedUnsafe);
  assert.equal(result.unsafeNodes,0);
  assert.equal(result.injected,false);
  assert(result.unsafeState.text.includes('<script>window.__externalInjected=true</script>'));
  assert(result.oversize);
  assert.equal(result.oversizeState.text,'SAFE');
 });


 await check('TXT-059 external nested lists, mixed-direction tables and safe flat import',async()=>{
  const result=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {externalRichClipboardHTML,clipboardPlainText}=await import('./js/text-inline-clipboard.js');
   const {restoreLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:80px 50px 40px;background:white;z-index:4500';
   document.body.append(host);
   const editor={area:host,board:{id:'nested-import-'+crypto.randomUUID(),
     viewport:{x:0,y:0,zoom:1}},disposed:true,paint(){},applyText(){}};
   const html='<section dir="rtl">'+
    '<ol start="4">'+
     '<li>סעיף ראשון<ul>'+
       '<li dir="ltr"><p><em>nested English</em></p></li>'+
       '<li dir="rtl"><strong>סעיף פנימי</strong></li>'+
     '</ul></li>'+
     '<li>סעיף שני<ol start="2">'+
       '<li dir="ltr">Inner A</li>'+
       '<li dir="rtl">פנימי ב</li>'+
     '</ol></li>'+
     '<li>סעיף שלישי</li>'+
    '</ol>'+
    '<table dir="rtl"><thead>'+
     '<tr><th>שם</th><th dir="ltr">Value</th></tr>'+
    '</thead><tbody>'+
     '<tr><td dir="rtl"><p><span style="color:#b42318">שלום</span></p></td>'+
       '<td dir="ltr"><strong>42</strong></td></tr>'+
     '<tr dir="ltr"><td>English</td><td>עולם</td></tr>'+
    '</tbody></table>'+
    '</section>';
   const parsed=externalRichClipboardHTML(html);
   const model=(text='')=>({id:'nested-'+crypto.randomUUID(),type:'text',
    x:0,y:0,w:550,h:65,fontSize:24,
    text,runs:[{text,italic:true,color:'#147d92'}],
    paragraphs:[{align:'left',dir:'ltr',list:'bullet'}]});
   const make=(text='')=>{
    const draft=new InlineText(editor,model(text),true);
    draft.input.focus();const caret={paragraph:0,offset:text.length};
    if(!restoreLogicalSelection(draft.input,window.getSelection(),{anchor:caret,focus:caret}))
      throw Error('TXT-059 cannot focus paste target');
    return draft;
   };
   const state=draft=>{
    const doc=readRichDocument(draft.input,draft.item);
    return {text:doc.runs.map(r=>r.text).join(''),runs:doc.runs,
     paragraphs:doc.paragraphs,
     listStarts:[...draft.input.querySelectorAll('ol')].map(x=>x.start),
     listTypes:[...draft.input.querySelectorAll('li')].map(x=>x.parentNode.tagName),
     listDirections:[...draft.input.querySelectorAll('li')].map(x=>x.dir)};
   };
   const paste=(draft,value)=>{
    const event=new Event('paste',{bubbles:true,cancelable:true});
    Object.defineProperty(event,'clipboardData',
     {value:{getData(type){return type==='text/html'?value:'';}}});
    draft.input.dispatchEvent(event);return event.defaultPrevented;
   };
   let draft=make();
   const keepPrevented=paste(draft,html),keep=state(draft);
   draft.stepTextHistory('undo');const undo=state(draft);
   draft.stepTextHistory('redo');const redo=state(draft);
   draft.finish(false);

   draft=make('Prefix ');
   draft.pasteModeSelect.value='match';
   draft.pasteModeSelect.dispatchEvent(new Event('change',{bubbles:true}));
   const matchPrevented=paste(draft,html),match=state(draft);
   draft.finish(false);

   const hostile='<table><tr><td>Safe</td><td><img src=x '+
    'onerror="window.__nestedAttack=true"></td></tr></table>';
   draft=make('SAFE');
   const hostilePaste=paste(draft,hostile),safe=state(draft);
   const injected=!!window.__nestedAttack;
   const embeddedNodes=draft.input.querySelectorAll('img,script,iframe,svg').length;
   draft.finish(false);

   const tooMany='<table>'+Array.from({length:1100},
    (_,i)=>'<tr><td>'+i+'</td></tr>').join('')+'</table>';
   const rejected=externalRichClipboardHTML(tooMany);
   const tooDeep='<ol start="10001"><li>Overflow</li></ol>';
   const rejectedOrdinal=externalRichClipboardHTML(tooDeep);
   const plain=parsed?clipboardPlainText(parsed):null;
   host.remove();
   return {parsed,plain,keepPrevented,keep,undo,redo,matchPrevented,match,
    hostilePaste,safe,injected,embeddedNodes,rejected,rejectedOrdinal};
  });
  assert(result.parsed,'nested lists and tables should be safely importable');
  const lines=result.plain.split('\n');
  assert.deepEqual(lines,[
    'סעיף ראשון','↳ nested English','↳ סעיף פנימי',
    'סעיף שני','↳ Inner A','↳ פנימי ב','סעיף שלישי',
    'שם | Value','שלום | 42','English | עולם'
  ]);
  assert.deepEqual(result.parsed.paragraphs.map(p=>p.list),[
    'number','bullet','bullet','number','number','number','number',
    'none','none','none'
  ]);
  assert.deepEqual(result.parsed.paragraphs.slice(0,7).map(p=>p.numberStart),[
    4,undefined,undefined,5,2,3,6
  ]);
  assert.deepEqual(result.parsed.paragraphs.map(p=>p.dir),[
    'rtl','ltr','rtl','rtl','ltr','rtl','rtl','rtl','rtl','ltr'
  ]);
  assert(result.parsed.runs.some(r=>r.text.includes('nested English')&&r.italic));
  assert(result.parsed.runs.some(r=>r.text.includes('סעיף פנימי')&&r.bold));
  assert(result.parsed.runs.some(r=>r.text.includes('שלום')&&r.color==='#b42318'));
  assert(result.parsed.runs.some(r=>r.text.includes('42')&&r.bold));
  assert(result.parsed.runs.some(r=>r.text.includes('שם')&&r.bold));
  assert(result.keepPrevented);
  assert.equal(result.keep.text,result.plain);
  assert.deepEqual(result.keep.paragraphs.map(p=>p.list),
   result.parsed.paragraphs.map(p=>p.list));
  assert.equal(result.keep.paragraphs[0].numberStart,4);
  assert(result.keep.listStarts.includes(4));
  assert(result.keep.listStarts.includes(5));
  assert(result.keep.listStarts.includes(2));
  assert(result.keep.listStarts.includes(6));
  assert.equal(result.undo.text,'');
  assert.equal(result.redo.text,result.keep.text);
  assert.deepEqual(result.redo.paragraphs,result.keep.paragraphs);
  assert(result.matchPrevented);
  assert.equal(result.match.text,'Prefix '+result.plain);
  assert(result.match.paragraphs.every(p=>p.list==='bullet'));
  assert(result.match.paragraphs.every(p=>p.dir==='ltr'));
  assert(result.match.runs.some(r=>r.text.includes('nested English')&&
    r.italic&&r.color==='#147d92'));
  assert(result.match.runs.some(r=>r.text.includes('שלום')&&
    r.italic&&r.color==='#147d92'&&!r.bold));
  assert(result.hostilePaste,'Unsafe HTML with no text/plain must still block browser default');
  assert.equal(result.safe.text,'SAFE');
  assert.equal(result.embeddedNodes,0);
  assert.equal(result.injected,false);
  assert.equal(result.rejected,null,'Imports above the bounded paragraph cap must be rejected');
  assert.equal(result.rejectedOrdinal,null,'Out-of-range list numbers must not be silently reset');
 });


 await check('TXT-060 imported list and table paragraphs retain exact keyboard selections during formatting',async()=>{
  const output=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {restoreLogicalSelection,captureLogicalSelection}=await import('./js/text-selection.js');
   const {externalRichClipboardHTML}=await import('./js/text-inline-clipboard.js');
   const html='<section dir="rtl"><ol start="6">'+
    '<li>שלום מספר</li><li>Second item<ul>'+
    '<li dir="ltr"><em>Nested English</em></li></ul></li>'+
    '<li>עוד שורה</li></ol><table dir="ltr">'+
    '<tr><th>Column</th><th>עמודה</th></tr>'+
    '<tr dir="rtl"><td>ערך</td><td>Value</td></tr></table></section>';
   const imported=externalRichClipboardHTML(html);
   if(!imported||imported.paragraphs.length!==6)throw Error('Invalid mixed HTML fixture');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:85px 50px 35px;background:white;z-index:4900';
   document.body.append(host);
   const board={id:'format-rtl-'+crypto.randomUUID(),viewport:{x:0,y:0,zoom:1}};
   const editor={area:host,board,disposed:true,paint(){},applyText(){}};
   const text=imported.runs.map(r=>r.text).join('');
   const draft=new InlineText(editor,{
    id:'selection-format-'+crypto.randomUUID(),type:'text',
    x:10,y:10,w:550,h:120,fontSize:24,text,
    runs:imported.runs,paragraphs:imported.paragraphs
   },true);
   const select=(a,b)=>{
    draft.input.focus();
    if(!restoreLogicalSelection(draft.input,window.getSelection(),
     {anchor:{paragraph:a[0],offset:a[1]},focus:{paragraph:b[0],offset:b[1]}}))
     throw Error('Cannot restore logical test selection');
   };
   const read=()=>{
    const doc=readRichDocument(draft.input,draft.item);
    return {text:doc.runs.map(r=>r.text).join(''),runs:doc.runs,
     paragraphs:doc.paragraphs,
     selection:captureLogicalSelection(draft.input,window.getSelection()),
     listStarts:[...draft.input.querySelectorAll('ol')].map(n=>n.start),
     canUndo:draft.textHistory.canUndo,
     aria:draft.input.getAttribute('aria-multiline')};
   };
   const initial=read();
   select([1,2],[4,0]);
   const forwardBefore=read().selection;
   const changedAlign=draft.setParagraphAlignment('center');
   const aligned=read();
   const changedDir=draft.setParagraphDirection('ltr');
   const directed=read();

   select([5,11],[3,1]); // backwards across a list-to-table boundary
   const backwardBefore=read().selection;
   const changedList=draft.formatList('bullet');
   const listed=read();

   // Cross-paragraph keyboard formatting rebuilds the DOM. Anchor/focus
   // must remain in the same logical positions, even when reversed.
   const key=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,key:'b'});
   const consumed=!draft.input.dispatchEvent(key);
   const bolded=read();
   const selectedRow3=bolded.runs.filter(r=>r.text.includes('עוד שורה'));
   const selectedRow5=bolded.runs.filter(r=>r.text.includes('ערך'));
   const row3First=bolded.runs.find(r=>r.text.startsWith('ע'));
   const ctrlZ=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,key:'z'});
   draft.input.dispatchEvent(ctrlZ);
   const undone=read();
   const ctrlY=new KeyboardEvent('keydown',{
    bubbles:true,cancelable:true,ctrlKey:true,key:'y'});
   draft.input.dispatchEvent(ctrlY);
   const redone=read();

   // Change direction via a genuinely keyboard-focusable toolbar control.
   select([0,2],[2,0]);
   const dropdownBefore=read().selection;
   const dirChoice=draft.controls.querySelector('select[aria-label="Paragraph text direction"]');
   dirChoice.focus();
   dirChoice.value='ltr';
   dirChoice.dispatchEvent(new Event('change',{bubbles:true}));
   const dropdownAfter=read();
   const active=document.activeElement===draft.input;

   draft.finish(false);
   host.remove();
   return {initial,forwardBefore,changedAlign,aligned,changedDir,directed,
    backwardBefore,changedList,listed,consumed,bolded,selectedRow3,
    selectedRow5,row3First,undone,redone,dropdownBefore,dropdownAfter,active};
  });
  assert.equal(output.initial.paragraphs.length,6);
  assert.equal(output.initial.aria,'true');
  assert.equal(output.initial.paragraphs[0].numberStart,6);
  assert(output.initial.paragraphs.some(p=>p.list==='none'));
  assert.deepEqual(output.forwardBefore,{
   anchor:{paragraph:1,offset:2},focus:{paragraph:4,offset:0}
  });
  assert(output.changedAlign);
  assert.deepEqual(output.aligned.paragraphs.map(p=>p.align),
   ['auto','center','center','center','auto','auto']);
  assert.deepEqual(output.aligned.selection,output.forwardBefore);
  assert(output.changedDir);
  assert.deepEqual(output.directed.paragraphs.map(p=>p.dir),
   ['rtl','ltr','ltr','ltr','ltr','rtl']);
  assert.deepEqual(output.directed.selection,output.forwardBefore);
  assert.equal(output.directed.paragraphs[0].numberStart,6);

  assert.deepEqual(output.backwardBefore,{
   anchor:{paragraph:5,offset:11},focus:{paragraph:3,offset:1}
  });
  assert(output.changedList);
  assert.deepEqual(output.listed.paragraphs.map(p=>p.list),
   ['number','number','bullet','bullet','bullet','bullet']);
  assert.deepEqual(output.listed.selection,output.backwardBefore);
  assert(output.consumed,'Ctrl+B must be handled without native execCommand');
  assert.deepEqual(output.bolded.selection,output.backwardBefore);
  assert.equal(output.bolded.text,output.initial.text);
  assert.deepEqual(output.bolded.paragraphs,output.listed.paragraphs);
  assert(output.bolded.runs.some(r=>r.text.includes('ורה')&&r.bold),
   'Cross-paragraph formatting must affect the selected Hebrew text');
  assert(output.bolded.runs.some(r=>r.text.includes('Value')&&r.bold),
   'Table-derived English cell text must retain selected formatting');
  assert.equal(output.undone.text,output.initial.text);
  assert.deepEqual(output.undone.paragraphs,output.listed.paragraphs);
  assert.deepEqual(output.redone.runs,output.bolded.runs);
  assert.deepEqual(output.redone.selection,output.bolded.selection);

  assert.deepEqual(output.dropdownBefore,{
   anchor:{paragraph:0,offset:2},focus:{paragraph:2,offset:0}
  });
  assert(output.active,'Changing dropdown with keyboard focus must return to editor');
  assert.deepEqual(output.dropdownAfter.selection,output.dropdownBefore);
  assert.equal(output.dropdownAfter.paragraphs[0].dir,'ltr');
  assert.equal(output.dropdownAfter.paragraphs[1].dir,'ltr');
  assert.equal(output.dropdownAfter.paragraphs[2].dir,'ltr');
  assert.equal(output.dropdownAfter.paragraphs[5].dir,'rtl');
 });

 await check('A4 user confirmation flows a numbered list without dropping text or ordinals',async()=>{
  await page.evaluate(async()=>{
   const {createBoard,validateBoard}=await import('./js/model.js');
   const {Pages,A4}=await import('./js/pages.js');
   const {History}=await import('./js/history.js');
   const source='שלב ראשון '+('Explain the step '.repeat(85))+'\nשלב שני';
   const board={...createBoard('Browser A4'),layout:'a4',pageCount:1,
    items:[{id:'ordered',type:'text',x:50,y:A4.h-130,w:250,h:40,fontSize:24,text:source,
      paragraphs:[{align:'right',list:'number',dir:'rtl',numberStart:7},
       {align:'right',list:'number',dir:'rtl'}]}]};
   const history=new History({items:structuredClone(board.items),pageCount:board.pageCount});
   const editor={
    board,selected:new Set(['ordered']),area:{clientHeight:720,clientWidth:1100},history,
    commit(){validateBoard(this.board);this.history.commit({items:structuredClone(this.board.items),pageCount:this.board.pageCount});},
    paint(){},save(){}
   };
   const pages=new Pages(editor);editor.pages=pages;
   const controls=pages.controls();controls.id='browser-smoke-a4';
   document.body.append(controls);pages.update();
   window.__smokeA4={editor,pages,source};
  });
  await page.getByRole('button',{name:'Flow selected text onto A4 pages'}).click();
  await page.locator('dialog[open]').waitFor({timeout:15000});
  await page.locator('dialog[open] button[type=submit]').click();
  await page.waitForFunction(()=>window.__smokeA4.editor.history.past.length===1,null,{timeout:15000});
  const result=await page.evaluate(async()=>{
   const {textLayoutMetrics}=await import('./js/inline-equation.js');
   const {paragraphRuns}=await import('./js/rich-text.js');
   const {editor,source}=window.__smokeA4;
   const markers=editor.board.items.flatMap(item=>textLayoutMetrics(item,paragraphRuns(item)).lines)
    .flatMap(line=>line.parts.filter(part=>part.synthetic).map(part=>part.text.trim()).filter(Boolean));
   return {text:editor.board.items.map(item=>item.text).join(''),count:editor.board.items.length,
    pages:editor.board.pageCount,markers,undo:editor.history.past.length,original:source};
  });
  assert.equal(result.text,result.original);
  assert(result.count>1&&result.pages>1);
  assert.deepEqual(result.markers,['7.','8.']);
  assert.equal(result.undo,1);
 });

 await check('edit-save-reload-SVG/backup round-trip preserves selected formatting',async()=>{
  const id=await page.evaluate(async()=>{
   const {createBoard}=await import('./js/model.js');
   const {BoardRepository}=await import('./js/storage.js');
   const saved=window.__smoke.editor.saved;
   if(!saved?.[0]?.runs||!saved[0].paragraphs)throw Error('No completed rich text draft');
   const board=createBoard('Cross-browser rich text round trip');
   board.items=[{...saved[0],text:saved[1],h:saved[2]}];
   const repo=new BoardRepository('teaching-board-cross-browser-smoke');
   await repo.save(board);repo.close();
   return board.id;
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
  const restored=await page.evaluate(async boardId=>{
   const {BoardRepository}=await import('./js/storage.js');
   const {serializeBackup,parseBackup}=await import('./js/model.js');
   const {sceneSVG}=await import('./js/scene.js');
   const repo=new BoardRepository('teaching-board-cross-browser-smoke');
   const board=await repo.get(boardId);repo.close();
   if(!board)throw Error('IndexedDB did not persist the formatted lesson');
   const backup=parseBackup(serializeBackup(board));
   const item=backup.items[0],svg=sceneSVG(backup);
   const textElements=[...svg.querySelectorAll('text')].map(n=>n.textContent);
   return {text:item.text,paragraphs:item.paragraphs,runs:item.runs,textElements,
    markup:new XMLSerializer().serializeToString(svg)};
  },id);
  assert.equal(restored.text,'שלום English');
  assert.equal(restored.paragraphs[0].list,'number');
  assert(restored.runs.some(run=>run.bold&&run.text.includes('שלום')));
  assert(restored.textElements.some(t=>t.includes('שלום')));
  assert(restored.textElements.some(t=>t.includes('English')));
  assert(restored.markup.includes('font-weight="700"'));
 });


 await check('list restructuring preserves exact selection across Hebrew and English paragraphs',async()=>{
  const before=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {captureLogicalSelection}=await import('./js/text-selection.js');
   const host=document.createElement('div');host.id='smoke-stable-selection';host.style.cssText='position:fixed;inset:140px 90px 50px;background:white;z-index:2000';
   document.body.append(host);
   const editor={area:host,board:{viewport:{x:0,y:0,zoom:1}},paint(){},disposed:true,applyText(){}};
   const item={id:'stable-text',type:'text',x:10,y:10,w:450,h:120,fontSize:24,
    text:'שלום Middle\nEnglish נוסחה',paragraphs:[
     {align:'right',dir:'rtl',list:'none'},{align:'left',dir:'ltr',list:'none'}]};
   const draft=new InlineText(editor,item,true);
   const first=draft.input.children[0].querySelector('span').firstChild;
   const second=draft.input.children[1].querySelector('span').firstChild;
   draft.input.focus();const range=document.createRange();range.setStart(first,2);range.setEnd(second,3);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   const start=captureLogicalSelection(draft.input,selection);
   window.__stable={draft,host,start};
   return start;
  });
  assert.deepEqual(before,{anchor:{paragraph:0,offset:2},focus:{paragraph:1,offset:3}});
  await page.getByRole('button',{name:'Bulleted list selected text'}).click();
  const afterBullet=await page.evaluate(async()=>{
   const {captureLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {draft}=window.__stable;
   return {selection:captureLogicalSelection(draft.input,window.getSelection()),
    paragraphs:readRichDocument(draft.input,draft.item).paragraphs.map(p=>p.list)};
  });
  assert.deepEqual(afterBullet.selection,before);
  assert.deepEqual(afterBullet.paragraphs,['bullet','bullet']);
  await page.getByRole('button',{name:'Numbered list selected text'}).click();
  const afterNumber=await page.evaluate(async()=>{
   const {captureLogicalSelection}=await import('./js/text-selection.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const {draft}=window.__stable;
   const result={selection:captureLogicalSelection(draft.input,window.getSelection()),
    paragraphs:readRichDocument(draft.input,draft.item).paragraphs.map(p=>p.list)};
   draft.finish(false);window.__stable.host.remove();
   return result;
  });
  assert.deepEqual(afterNumber.selection,before);
  assert.deepEqual(afterNumber.paragraphs,['number','number']);
 });

 await check('collapsed cursor formatting applies to subsequent Hebrew typing and supports undo',async()=>{
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const host=document.createElement('div');host.id='smoke-pending-caret';host.style.cssText='position:fixed;inset:140px 90px 50px;background:white;z-index:2000';
   document.body.append(host);
   const editor={area:host,board:{viewport:{x:0,y:0,zoom:1}},paint(){},disposed:true,applyText(){}};
   const item={id:'pending-text',type:'text',x:10,y:10,w:420,h:100,fontSize:24,text:'שלום',
    paragraphs:[{align:'right',dir:'rtl',list:'none'}]};
   const draft=new InlineText(editor,item,true);
   const node=draft.input.querySelector('span').firstChild;
   draft.input.focus();const range=document.createRange();range.setStart(node,2);range.collapse(true);
   const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   window.__pending={draft,host};
  });
  await page.getByRole('button',{name:'Italic selected text'}).click();
  assert.equal(await page.evaluate(()=>window.__pending.draft.pendingMarks?.italic),true);
  await page.evaluate(()=>{
   const {draft}=window.__pending;
   window.__pending.inputEvents=[];
   draft.input.addEventListener('beforeinput',event=>{
    window.__pending.inputEvents.push({inputType:event.inputType,data:event.data,
     cancelable:event.cancelable,marks:structuredClone(draft.pendingMarks),
     caret:window.getSelection().anchorOffset});
   },true);
  });
  await page.keyboard.insertText('אב');
  const typed=await page.evaluate(async()=>{
   const {readRichDocument}=await import('./js/rich-text.js');
   const {draft}=window.__pending;
   return {runs:readRichDocument(draft.input,draft.item).runs,
    text:draft.input.textContent,pending:draft.pendingMarks,
    events:window.__pending.inputEvents,html:draft.input.innerHTML};
  });
  assert.equal(typed.text,'שלאבום');
  assert(typed.runs.some(run=>run.italic&&run.text==='אב'),'Inserted Hebrew should be italic: '+JSON.stringify(typed));
  assert.equal(typed.pending,null);
  await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(()=>window.__pending.draft.input.textContent),'שלום');
  await page.keyboard.press('Control+y');
  assert.equal(await page.evaluate(()=>window.__pending.draft.input.textContent),'שלאבום');
  await page.evaluate(()=>{window.__pending.draft.finish(false);window.__pending.host.remove();});
 });

 await check('composition events defer history and clear pending formatting',async()=>{
  const result=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {readRichDocument}=await import('./js/rich-text.js');
   const host=document.createElement('div');host.style.cssText='position:fixed;inset:140px 90px 50px;background:white;z-index:2000';
   document.body.append(host);
   const editor={area:host,board:{viewport:{x:0,y:0,zoom:1}},paint(){},disposed:true,applyText(){}};
   const item={id:'composition',type:'text',x:10,y:10,w:350,h:80,fontSize:24,text:'שלום',
    paragraphs:[{align:'right',dir:'rtl',list:'none'}]};
   const draft=new InlineText(editor,item,true);
   draft.pendingMarks={bold:true};
   draft.input.dispatchEvent(new CompositionEvent('compositionstart',{data:'ק',bubbles:true}));
   const pendingCleared=draft.pendingMarks===null;
   draft.input.children[0].querySelector('span').textContent='שלום קלט';
   draft.input.dispatchEvent(new InputEvent('input',{inputType:'insertCompositionText',data:'קלט',isComposing:true,bubbles:true}));
   const during=draft.textHistory.canUndo;
   draft.input.dispatchEvent(new CompositionEvent('compositionend',{data:'קלט',bubbles:true}));
   const after=draft.textHistory.canUndo;
   const text=readRichDocument(draft.input,draft.item).runs.map(run=>run.text).join('');
   draft.finish(false);host.remove();
   return {pendingCleared,during,after,text};
  });
  assert.deepEqual(result,{pendingCleared:true,during:false,after:true,text:'שלום קלט'});
 });

 await check('unsaved valid rich-text draft recovers after a browser reload',async()=>{
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {draftStorageKey}=await import('./js/text-draft-recovery.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:130px 80px 60px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'recovery-text',type:'text',x:0,y:0,w:350,h:90,fontSize:24,text:'שלום',
    paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const editor={area:host,board:{id:'browser-recovery-fixture',viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(){}};
   const key=draftStorageKey(editor.board.id,item.id);
   localStorage.removeItem(key);
   const draft=new InlineText(editor,item,true);
   draft.input.textContent='שלום Draft continued English';
   draft.input.oninput();
   const saved=localStorage.getItem(key);
   if(!saved||!saved.includes('Draft continued'))throw Error('Unsaved draft was not persisted locally');
   window.__recoveryKey=key;
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:130px 80px 60px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'recovery-text',type:'text',x:0,y:0,w:350,h:90,fontSize:24,text:'שלום',
    paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const editor={area:host,board:{id:'browser-recovery-fixture',viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(...args){this.saved=args;}};
   window.__recover={draft:new InlineText(editor,item,true),editor,host};
  });
  await page.getByRole('button',{name:'Recover saved draft'}).click();
  const recovered=await page.evaluate(()=>window.__recover.draft.input.textContent);
  assert.equal(recovered,'שלום Draft continued English');
  await page.getByRole('button',{name:'Done'}).click();
  const result=await page.evaluate(async()=>{
   const {draftStorageKey}=await import('./js/text-draft-recovery.js');
   const {editor,host}=window.__recover;
   const key=draftStorageKey(editor.board.id,'recovery-text');
   const output={text:editor.saved?.[1],cleared:localStorage.getItem(key)===null};
   host.remove();return output;
  });
  assert.equal(result.text,'שלום Draft continued English');
  assert.equal(result.cleared,true);
 });

 await check('malformed equation cannot close editor and offers last-valid and raw recovery',async()=>{
  const state=await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:130px 80px 60px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'invalid-equation-recovery',type:'text',x:0,y:0,w:360,h:90,
    fontSize:24,text:'שלום English',paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const editor={area:host,board:{id:'browser-invalid-recovery',viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(...args){this.saved=args;}};
   const draft=new InlineText(editor,item,true);
   draft.input.querySelector('span').dataset.equation='{broken JSON';
   draft.finish(true);
   const state={closed:!!draft.closed,hasError:!!draft.controls.querySelector('.error'),
    text:draft.input.textContent,rawControl:!![...draft.controls.querySelectorAll('button')].find(b=>b.textContent==='Show raw text')};
   window.__invalidRecovery={draft,host,editor};
   return state;
  });
  assert.equal(state.closed,false);
  assert.equal(state.hasError,true);
  assert.equal(state.rawControl,true);
  await page.getByRole('button',{name:'Show raw text'}).click();
  assert.equal((await page.getByRole('textbox',{name:'Unparsed text recovery'}).inputValue()).trimEnd(),'שלום English');
  await page.getByRole('button',{name:'Restore last valid version'}).click();
  const result=await page.evaluate(()=>{
   const {draft,host,editor}=window.__invalidRecovery;
   const valid=draft.input.textContent==='שלום English';
   draft.finish(true);
   const outcome={valid,closed:!!draft.closed,text:editor.saved?.[1],
    error:draft.controls.querySelector('.error')?.textContent||null,
    markup:draft.input.innerHTML};
   host.remove();return outcome;
  });
  assert(result.valid&&result.closed&&result.text==='שלום English',
   'Restored document failed to save: '+JSON.stringify(result));
 });

 await check('unparseable raw text survives reload without overwriting the saved lesson',async()=>{
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const {draftStorageKey}=await import('./js/text-draft-recovery.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:130px 80px 60px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'unparsed-text',type:'text',x:0,y:0,w:350,h:90,fontSize:24,
    text:'שלום',paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const editor={area:host,board:{id:'broken-draft-fixture',viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(){}};
   const key=draftStorageKey(editor.board.id,item.id);
   localStorage.removeItem(key);
   const draft=new InlineText(editor,item,true);
   const span=draft.input.querySelector('span');
   span.textContent='שלום INVALID';
   span.dataset.equation='{invalid';
   draft.input.oninput();
   const record=localStorage.getItem(key);
   if(!record||!record.includes('INVALID'))throw Error('Raw invalid draft was not preserved');
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
  await page.evaluate(async()=>{
   const {InlineText}=await import('./js/inline-text.js');
   const host=document.createElement('div');
   host.style.cssText='position:fixed;inset:130px 80px 60px;background:white;z-index:2500';
   document.body.append(host);
   const item={id:'unparsed-text',type:'text',x:0,y:0,w:350,h:90,fontSize:24,
    text:'שלום',paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   const editor={area:host,board:{id:'broken-draft-fixture',viewport:{x:0,y:0,zoom:1}},
    disposed:true,paint(){},applyText(){}};
   window.__brokenReload={draft:new InlineText(editor,item,true),host,editor};
  });
  await page.getByRole('button',{name:'Show unparsed text'}).click();
  const raw=(await page.getByRole('textbox',{name:'Unparsed text recovery'}).inputValue()).trimEnd();
  assert.equal(raw,'שלום INVALID');
  await page.getByRole('button',{name:'Discard saved draft'}).click();
  const outcome=await page.evaluate(async()=>{
   const {draftStorageKey}=await import('./js/text-draft-recovery.js');
   const {draft,host,editor}=window.__brokenReload;
   const key=draftStorageKey(editor.board.id,draft.item.id);
   const result={savedText:draft.item.text,cleared:localStorage.getItem(key)===null};
   draft.finish(false);host.remove();return result;
  });
  assert.deepEqual(outcome,{savedText:'שלום',cleared:true});
 });


 await check('new unsaved sticky note can be recovered after reload without duplicates',async()=>{
  const record=await page.evaluate(async()=>{
   const {createBoard}=await import('./js/model.js');
   const {BoardRepository}=await import('./js/storage.js');
   const {storeTextDraft,draftStorageKey}=await import('./js/text-draft-recovery.js');
   const repo=new BoardRepository();
   const lesson=createBoard('Browser new-note recovery '+crypto.randomUUID().slice(0,8));
   const saved=await repo.save(lesson);repo.close();
   const note={id:crypto.randomUUID(),type:'note',x:92,y:142,w:260,h:130,
    fontSize:26,fill:'#fff1a8',stroke:'#203954',rotation:0,locked:false,text:''};
   const snapshot={runs:[{text:'טיוטה ',bold:true},{text:'English lesson',italic:true}],
    paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
   if(!storeTextDraft(localStorage,saved.id,note,snapshot,null,Date.now(),{newItem:true}))
    throw Error('Failed to preserve a new unsaved note');
   return {boardId:saved.id,itemId:note.id,key:draftStorageKey(saved.id,note.id)};
  });
  await page.goto(base+'#/board/'+record.boardId,{waitUntil:'domcontentloaded'});
  const recover=page.getByRole('button',{name:'Recover unsaved text (1)'});
  await recover.waitFor({timeout:30000});
  assert.equal(await page.locator('[data-id="'+record.itemId+'"]').count(),0,
   'A draft was inserted into the board without confirmation');
  await recover.click();
  await page.getByRole('dialog',{name:'Recover unsaved text objects'}).waitFor();
  await page.getByRole('button',{name:'Open draft for review'}).click();
  const draft=await page.evaluate(()=>{
   const text=document.querySelector('.inline-text-editor [contenteditable="true"]');
   return {content:text?.textContent,bold:!!text?.querySelector('[style*="font-weight"]'),
    italic:!!text?.querySelector('[style*="italic"]'),
    status:document.querySelector('#status')?.textContent,
    dialogOpen:!!document.querySelector('dialog[open]'),
    overlayCount:document.querySelectorAll('.inline-text-editor').length};
  });
  assert(draft.content==='טיוטה English lesson'&&draft.bold&&draft.italic,
   'Draft review failed to open correctly: '+JSON.stringify(draft));
  assert.equal(await page.locator('[data-id="'+record.itemId+'"]').count(),0,
   'Opening recovery must not commit content before Done');
  await page.getByRole('button',{name:'Done'}).click();
  await page.waitForFunction(async({boardId,itemId,key})=>{
   const {BoardRepository}=await import('./js/storage.js');
   const repo=new BoardRepository();const board=await repo.get(boardId);repo.close();
   return board?.items.some(i=>i.id===itemId&&i.text==='טיוטה English lesson')&&
    localStorage.getItem(key)===null;
  },record,{timeout:30000});
  await page.reload({waitUntil:'domcontentloaded'});
  const hiddenRecover=page.getByRole('button',{name:/^Recover unsaved text/,includeHidden:true});
  await hiddenRecover.waitFor({state:'attached'});
  assert.equal(await hiddenRecover.isHidden(),true);
  const result=await page.evaluate(async({boardId,itemId,key})=>{
   const {BoardRepository}=await import('./js/storage.js');
   const repo=new BoardRepository(),board=await repo.get(boardId);repo.close();
   const matches=board.items.filter(i=>i.id===itemId);
   return {count:matches.length,type:matches[0]?.type,
    text:matches[0]?.text,x:matches[0]?.x,y:matches[0]?.y,
    localCleared:localStorage.getItem(key)===null};
  },record);
  assert.deepEqual(result,{count:1,type:'note',text:'טיוטה English lesson',
   x:92,y:142,localCleared:true});
 });

 assert.deepEqual(pageErrors,[]);
 console.log('All '+engine+' browser smoke checks passed.');
}finally{
 await browser.close();
}
