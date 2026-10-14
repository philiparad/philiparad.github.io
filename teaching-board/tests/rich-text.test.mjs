import test from 'node:test';
import assert from 'node:assert/strict';
import {textRuns,compactRuns,validateRuns,runLines,colorHex} from '../js/rich-text.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
test('mixed formatting preserves boundaries through wrapping and backup',()=>{
 const runs=compactRuns([{text:'Hello ',bold:true},{text:'class',italic:true,color:'#147d92'},{text:'\nשלום',underline:true}]);const text=runs.map(r=>r.text).join('');const lines=runLines(runs,30);assert.equal(lines.length,2);assert.equal(lines[0][0].bold,true);assert.equal(lines[0][1].italic,true);assert.equal(lines[1][0].underline,true);
 const b=createBoard();b.items=[{id:'t',type:'text',x:0,y:0,w:360,h:130,text,runs}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);
});
test('plain text styles migrate, adjacent equal formats merge and malformed runs fail',()=>{
 assert.equal(textRuns({text:'old',textStyle:'bold-italic'})[0].italic,true);assert.equal(compactRuns([{text:'a',bold:true},{text:'b',bold:true}])[0].text,'ab');
 for(const runs of [[{text:'x',bold:'yes'}],[{text:'x',color:'url(bad)'}],[{text:'different'}]])assert.throws(()=>validateRuns(runs,'x'));
 assert.equal(colorHex('rgb(20, 125, 146)'),'#147d92');assert.equal(colorHex('rgb(999, 0, 0)'),undefined);
});
