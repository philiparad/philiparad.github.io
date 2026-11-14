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
  assert.equal(await page.getByRole('textbox',{name:'Unparsed text recovery'}).inputValue(),'שלום English');
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

 assert.deepEqual(pageErrors,[]);
 console.log('All '+engine+' browser smoke checks passed.');
}finally{
 await browser.close();
}
