import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInlineEquation,equationSize,equationLines} from '../js/inline-equation.js';
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
