import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRuns,compactRuns,paragraphRuns,validateParagraphs,colorHex} from '../js/rich-text.js';

test('strikethrough is preserved and remains independent of underline',()=>{
 const runs=compactRuns([
  {text:'A',bold:true,strike:true},
  {text:'B',bold:true,strike:true},
  {text:'C',underline:true,strike:false},
 ]);
 assert.equal(runs.length,2);
 assert.deepEqual(runs.map(r=>r.text),['AB','C']);
 assert.equal(runs[0].strike,true);
 assert.equal(runs[1].strike,false);
 assert.equal(runs[1].underline,true);
 validateRuns(runs,'ABC');
 const paragraphs=paragraphRuns({text:'ABC',runs,paragraphs:[{align:'auto',list:'none'}]});
 assert.equal(paragraphs[0].runs[0].strike,true);
});

test('legacy runs without strikethrough continue to validate',()=>{
 const runs=[{text:'שלום English',bold:true,italic:false,underline:false,color:'#123abc'}];
 validateRuns(runs,'שלום English');
 assert.equal(compactRuns(runs)[0].strike,false);
 assert.equal(colorHex('rgb(18, 52, 86)'),'#123456');
});

test('malformed strikethrough metadata is rejected',()=>{
 assert.throws(()=>validateRuns([{text:'a',strike:'yes'}],'a'),/Invalid text formatting/);
 assert.throws(()=>validateRuns([{text:'a',strike:1}],'a'),/Invalid text formatting/);
});

test('paragraph metadata survives formatting boundaries',()=>{
 const item={runs:[{text:'אבג\n',strike:true},{text:'x',underline:true}],paragraphs:[{align:'right',list:'none'},{align:'left',list:'bullet'}]};
 const rows=paragraphRuns(item);
 assert.equal(rows.length,2);
 assert.equal(rows[0].align,'right');
 assert.equal(rows[1].list,'bullet');
 assert.equal(rows[1].runs[0].underline,true);
 validateParagraphs(item.paragraphs,'אבג\nx');
});

test('explicit direction survives paragraph layout; legacy paragraphs remain automatic',()=>{
 const item={text:'שלום test\nEnglish שלום',runs:[{text:'שלום test\nEnglish שלום'}],paragraphs:[{align:'right',list:'none',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]};
 validateParagraphs(item.paragraphs,item.text);
 const rows=paragraphRuns(item);
 assert.equal(rows[0].dir,'rtl');
 assert.equal(rows[1].dir,'ltr');
 assert.deepEqual(paragraphRuns({text:'Legacy'})[0].dir,'auto');
 assert.doesNotThrow(()=>validateParagraphs([{align:'auto',list:'none'}],'Legacy'));
 for(const dir of ['right','left','AUTO','up',null])assert.throws(()=>validateParagraphs([{align:'auto',list:'none',dir}],'Legacy'),/Invalid text paragraphs/);
});
