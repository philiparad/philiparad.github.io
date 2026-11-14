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

 assert.deepEqual(pageErrors,[]);
 console.log('All '+engine+' browser smoke checks passed.');
}finally{
 await browser.close();
}
