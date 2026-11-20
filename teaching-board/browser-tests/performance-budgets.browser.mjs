import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

// PERF-018: CI performance regression budgets. Targets are product goals;
// gates are deliberately wider to account for shared GitHub-hosted runners.
// All elapsed times come from a real Chromium page, not mocked operations.
const TARGETS={
 startupMs:2000,panP95Ms:16.7,penFrameP95Ms:16.7,
 selectionP95Ms:50,textP95Ms:50,undoRedoP95Ms:100,
 heapGrowthBytes:0
};
const LIMITS={
 startupMs:5000,panP95Ms:100,penFrameP95Ms:100,
 selectionP95Ms:150,textP95Ms:150,undoRedoP95Ms:200,
 heapGrowthBytes:32*1024*1024
};
const percentile=(values,p=.95)=>{
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.max(0,Math.ceil(sorted.length*p)-1)];
};
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-precise-memory-info']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const base=process.env.TEACHING_BOARD_URL||'http://127.0.0.1:8765/teaching-board/';
const output='/tmp/teaching-board-performance/perf-018.json';
let report;
try{
 const start=performance.now();
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:45000});
 await page.locator('#app[aria-busy="false"]').waitFor({timeout:30000});
 const startupMs=performance.now()-start;
 const session=await page.context().newCDPSession(page);
 await session.send('HeapProfiler.enable');
 await session.send('HeapProfiler.collectGarbage');
 const result=await page.evaluate(async()=>{
  const {Editor}=await import('./js/editor.js');
  const {createBoard}=await import('./js/model.js');
  const {BoardRepository}=await import('./js/storage.js');
  const {InlineText}=await import('./js/inline-text.js');
  const tick=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const measure=fn=>{const start=performance.now();fn();return performance.now()-start;};
  const root=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;background:#fff;z-index:3000';
  document.body.append(root);
  const board=createBoard('PERF-018 benchmark fixture');
  board.items=Array.from({length:1000},(_,i)=>({
   id:'bench-'+i,type:'rectangle',x:(i%40)*30,y:Math.floor(i/40)*26,
   w:35,h:30,stroke:'#203954',fill:'none',lineWidth:2
  }));
  board.items.push({id:'bench-text',type:'text',x:80,y:750,w:380,h:40,
   fontSize:24,text:'Performance benchmark'});
  const repo=new BoardRepository('teaching-board-perf018-'+crypto.randomUUID());
  let editor,inline;
  try{
   const open=performance.now();
   editor=new Editor(root,board,repo);
   const editorOpenMs=performance.now()-open;
   await tick();await tick();
   const pan=[];
   for(let i=0;i<36;i++){
    board.viewport.x=-i*7;
    board.viewport.y=-(i%5)*4;
    board.viewport.zoom=1+(i%4)*.02;
    pan.push(measure(()=>editor.paint()));
    await tick();
   }
   // Selected-item movement uses the same paint path as live drag.
   editor.selected=new Set(board.items.slice(0,120).map(item=>item.id));
   editor.paint();
   const selected=board.items.slice(0,120);
   const selection=[];
   for(let i=0;i<24;i++){
    for(const item of selected)item.x+=1;
    selection.push(measure(()=>editor.paint()));
    await tick();
   }
   editor.selected.clear();
   editor.paint();
   const penFrames=[],intervals=[];
   editor.tool='pen';
   const svg=editor.svg;
   // Synthetic benchmark pointers do not belong to an OS pointer stream.
   // Bypass browser capture validation, not the editor gesture logic.
   svg.setPointerCapture=()=>{};
   const pointer=(x,y)=>({button:0,pointerId:901,pointerType:'mouse',
    clientX:x,clientY:y,timeStamp:performance.now(),
    target:svg,preventDefault(){}});
   editor.pointerDown(pointer(100,100));
   let previous=performance.now();
   for(let i=0;i<45;i++){
    const now=await new Promise(resolve=>requestAnimationFrame(resolve));
    intervals.push(now-previous);previous=now;
    penFrames.push(measure(()=>editor.pointerMove(pointer(102+i*2,100+i))));
   }
   editor.pointerUp(pointer(195,145));
   // Text-input measurement includes rich text history and layout scheduling.
   const item=board.items.find(x=>x.id==='bench-text');
   inline=new InlineText(editor,item,true);
   const text=[];
   for(let i=0;i<24;i++){
    inline.input.textContent='Performance benchmark '+('text '.repeat(i+1));
    text.push(measure(()=>inline.input.dispatchEvent(new InputEvent('input',{
     bubbles:true,inputType:'insertText',data:'x'}))));
    await tick();
   }
   inline.finish(false,false);
   inline=null;
   // Change one item and exercise real editor history and scene repaints.
   board.items[0].x+=17;
   editor.commit();
   const history=[];
   for(let i=0;i<12;i++){
    history.push(measure(()=>{editor.undo();editor.redo();})/2);
    await tick();
   }
   return {editorOpenMs,panP95Ms:pan.length?pan.sort((a,b)=>a-b)[Math.ceil(pan.length*.95)-1]:0,
    selectionP95Ms:selection.sort((a,b)=>a-b)[Math.ceil(selection.length*.95)-1],
    penFrameP95Ms:intervals.slice(3).sort((a,b)=>a-b)[Math.ceil((intervals.length-3)*.95)-1],
    penWorkP95Ms:penFrames.sort((a,b)=>a-b)[Math.ceil(penFrames.length*.95)-1],
    textP95Ms:text.sort((a,b)=>a-b)[Math.ceil(text.length*.95)-1],
    undoRedoP95Ms:history.sort((a,b)=>a-b)[Math.ceil(history.length*.95)-1],
    objectCount:board.items.length};
  }finally{
   if(inline&&!inline.closed)inline.finish(false,false);
   editor?.dispose();repo.close();root.remove();
  }
 });
 await session.send('HeapProfiler.collectGarbage');
 const heapStart=(await session.send('Runtime.getHeapUsage')).usedSize;
 // Bounded repeated document navigation must not accumulate significant heap.
 for(let i=0;i<3;i++){
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app[aria-busy="false"]').waitFor();
 }
 await session.send('HeapProfiler.collectGarbage');
 const heapEnd=(await session.send('Runtime.getHeapUsage')).usedSize;
 await session.detach();
 report={version:'PERF-018',browser:'chromium',node:process.version,
  measuredAt:new Date().toISOString(),metrics:{
   startupMs, ...result,heapGrowthBytes:Math.max(0,heapEnd-heapStart)},
  targets:TARGETS,limits:LIMITS};
 const checks={};
 for(const [key,ceiling]of Object.entries(LIMITS)){
  const value=report.metrics[key];
  assert(Number.isFinite(value)&&value>=0,
   'Missing/nonfinite benchmark metric '+key+': '+value);
  checks[key]={observed:value,goal:TARGETS[key],ciLimit:ceiling,passed:value<=ceiling};
 }
 report.checks=checks;
 console.log('PERF-018 metrics '+JSON.stringify(report.metrics));
 for(const [key,value]of Object.entries(checks))
  console.log((value.passed?'PASS ':'FAIL ')+key+': '+value.observed.toFixed(2)+
   ' (target '+value.goal+', CI cap '+value.ciLimit+')');
 assert(Object.values(checks).every(value=>value.passed),
  'PERF-018 performance budget exceeded; see JSON metrics artifact');
}finally{
 await mkdir('/tmp/teaching-board-performance',{recursive:true});
 if(report)await writeFile(output,JSON.stringify(report,null,2)+'\n');
 await browser.close();
}
