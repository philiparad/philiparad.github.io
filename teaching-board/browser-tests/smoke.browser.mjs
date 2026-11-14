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
   const equation={source:'x^2+1',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRrQAAAAASUVORK5CYII=',w:80,h:90};
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
