import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInlineEquation,equationSize,equationLines,equationContentWidth,textLayoutMetrics} from '../js/inline-equation.js';
import {compactRuns,validateRuns,paragraphRuns} from '../js/rich-text.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
const equation={source:'x^2',src:'data:image/png;base64,AAAA',w:90,h:45};
test('equations stay atomic and keep independent source through compaction and backups',()=>{
 const runs=compactRuns([{text:'Solve '},{text:'\uFFFC',equation},{text:'\uFFFC',equation:{...equation,source:'y^2'}},{text:' now'}]);assert.equal(runs.length,4);const text=runs.map(r=>r.text).join('');validateRuns(runs,text);const b=createBoard();b.items=[{id:'t',type:'text',x:0,y:0,w:360,h:130,text,runs}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);assert.equal(paragraphRuns(b.items[0])[0].runs[1].equation.source,'x^2');
});
test('equation layout reserves width and height and wraps at an equation boundary',()=>{
 const rows=equationLines([{align:'left',list:'none',runs:[{text:'Example '},{text:'\uFFFC',equation},{text:' end'}]}],100,24,t=>t.length*12);assert.ok(rows.length>=2);const math=rows.flatMap(r=>r.parts).find(r=>r.equation);assert.ok(math.w<=100);assert.ok(rows.find(r=>r.parts.includes(math)).height>math.h);const size=equationSize({...equation,w:1000},24,100);assert.equal(size.w,100);assert.ok(size.h>0);
});
test('invalid equation payloads and mismatched placeholders are rejected',()=>{
 for(const eq of [{...equation,src:'https://example.com/x.png'},{...equation,w:Infinity},{...equation,source:''}])assert.throws(()=>validateInlineEquation(eq));assert.throws(()=>validateRuns([{text:'x',equation}],'x'));
});


test('inline equation width is bounded by actual text and note content boxes',()=>{
 const wide={...equation,w:1200,h:40};
 for(const item of [{type:'text',w:120,fontSize:24},{type:'note',w:160,fontSize:24}]){
  const limit=equationContentWidth(item);
  assert.equal(limit,item.w-(item.type==='note'?28:0));
  const size=equationSize(wide,item.fontSize,limit);
  assert.ok(size.w<=limit+1e-9&&size.h>0);
  const wrapped=textLayoutMetrics({...item,text:'Before \uFFFC after'},[
   {align:'left',dir:'ltr',list:'none',runs:[{text:'Before '},{text:'\uFFFC',equation:wide},{text:' after'}]}
  ]);
  assert.ok(wrapped.lines.length>=2,'Equation must remain atomic when moved to a new line');
  assert.ok(wrapped.lines.every(line=>line.width<=limit+1e-8));
  assert.equal(wrapped.lines.flatMap(line=>line.parts).filter(part=>part.equation).length,1);
 }
});
test('tall equation reserves baseline descent without escaping its line',()=>{
 const item={type:'text',w:300,fontSize:24};
 const tall={...equation,w:48,h:120};
 const metrics=textLayoutMetrics(item,[
  {align:'left',dir:'ltr',list:'none',runs:[{text:'Solve '},{text:'\uFFFC',equation:tall},{text:' now'}]}
 ]);
 const eqLine=metrics.lines.find(line=>line.parts.some(part=>part.equation));
 const image=eqLine.parts.find(part=>part.equation);
 const imageTop=eqLine.height-metrics.font*.25-image.h;
 assert.ok(imageTop>=-1e-8,'Math top exceeds reserved SVG line height');
 assert.equal(imageTop+image.h,eqLine.height-metrics.font*.25);
 assert.ok(eqLine.height>=image.h+metrics.font*.25);
});
