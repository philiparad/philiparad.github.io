import test from 'node:test';
import assert from 'node:assert/strict';
import {logicalSelectedParagraphIndices} from '../js/text-lists.js';
import {formatSelectedParagraphs} from '../js/text-paragraph-format.js';
import {formatDocumentRange} from '../js/text-range-format.js';
import {validateParagraphs,validateRuns} from '../js/rich-text.js';

const model=()=>({
 runs:[{text:'שלום\n'},{text:'↳ English',italic:true},
  {text:'\n↳ סעיף',bold:true},{text:'\nName | Value'},
  {text:'\nסוף',color:'#b42318'}],
 paragraphs:[
  {align:'right',dir:'rtl',list:'number',numberStart:4},
  {align:'left',dir:'ltr',list:'bullet'},
  {align:'right',dir:'rtl',list:'bullet'},
  {align:'left',dir:'ltr',list:'none'},
  {align:'right',dir:'rtl',list:'number',numberStart:9}
 ]
});
const select=(ap,ao,fp,fo)=>({
 anchor:{paragraph:ap,offset:ao},focus:{paragraph:fp,offset:fo}
});

test('TXT-060 forward selection ending at next row start excludes that row',()=>{
 const picked=logicalSelectedParagraphIndices(select(1,2,3,0),5);
 assert.deepEqual(picked,[1,2]);
 const result=formatSelectedParagraphs(model(),select(1,2,3,0),'align','center');
 assert.deepEqual(result.indices,[1,2]);
 assert.deepEqual(result.paragraphs.map(p=>p.align),
  ['right','center','center','left','right']);
 assert.equal(result.paragraphs[0].numberStart,4);
 assert.equal(result.paragraphs[4].numberStart,9);
 assert.equal(result.runs.map(r=>r.text).join(''),model().runs.map(r=>r.text).join(''));
});

test('TXT-060 backwards selection preserves logical range and only affected RTL paragraphs',()=>{
 const result=formatSelectedParagraphs(model(),select(4,2,2,1),'dir','ltr');
 assert(result&&result.changed);
 assert.deepEqual(result.indices,[2,3,4]);
 assert.deepEqual(result.paragraphs.map(p=>p.dir),
  ['rtl','ltr','ltr','ltr','ltr']);
 assert.equal(model().paragraphs[4].dir,'rtl');
 const reversed=logicalSelectedParagraphIndices(select(3,0,1,2),5);
 assert.deepEqual(reversed,[1,2]);
});

test('TXT-060 collapsed carets select only their own paragraph',()=>{
 assert.deepEqual(logicalSelectedParagraphIndices(select(2,0,2,0),5),[2]);
 assert.deepEqual(logicalSelectedParagraphIndices(select(4,2,4,2),5),[4]);
 const updated=formatSelectedParagraphs(model(),select(3,4,3,4),'align','right');
 assert.equal(updated.paragraphs[3].align,'right');
 assert.equal(updated.paragraphs[2].align,'right');
 assert.equal(updated.paragraphs[1].align,'left');
});

test('TXT-060 invalid selections and formatting are rejected without mutation',()=>{
 const original=model();
 assert.equal(formatSelectedParagraphs(original,select(2,0,2,0),'dir','rtl').changed,false);
 assert.equal(formatSelectedParagraphs(original,select(2,0,2,0),'dir','javascript:alert(1)'),null);
 assert.equal(formatSelectedParagraphs(original,select(2,0,2,0),'align','justify'),null);
 assert.equal(formatSelectedParagraphs(original,select(7,0,1,0),'dir','ltr'),null);
 assert.equal(formatSelectedParagraphs(original,select(-1,0,1,0),'dir','ltr'),null);
 assert.deepEqual(logicalSelectedParagraphIndices(null,5),[]);
 assert.deepEqual(logicalSelectedParagraphIndices(select(0,0,3,0),0),[]);
 assert.deepEqual(logicalSelectedParagraphIndices(select(0,0,99,0),5),[]);
 assert.deepEqual(original,model());
});

test('TXT-060 paragraph formatting and cross-row inline formatting remain independent',()=>{
 const saved=select(0,2,4,0),input=model();
 const after=formatSelectedParagraphs(input,saved,'dir','ltr');
 assert(after);
 const text=input.runs.map(r=>r.text).join('');
 const marked=formatDocumentRange(after,2,text.length-3,'bold');
 assert(marked);
 assert.equal(marked.runs.map(r=>r.text).join(''),text);
 assert.deepEqual(marked.paragraphs,after.paragraphs);
 assert(marked.runs.find(r=>r.text.includes('English')).bold);
 assert(marked.runs.find(r=>r.text.includes('סעיף')).bold);
 validateRuns(marked.runs,text);
 validateParagraphs(marked.paragraphs,text);
 assert.deepEqual(input,model(),'Original document must remain unchanged');
});

test('TXT-060 newline-only boundary selection affects preceding paragraph',()=>{
 assert.deepEqual(logicalSelectedParagraphIndices(select(0,4,1,0),5),[0]);
 assert.deepEqual(logicalSelectedParagraphIndices(select(1,0,0,4),5),[0]);
 const result=formatSelectedParagraphs(model(),select(0,4,1,0),'align','left');
 assert.equal(result.paragraphs[0].align,'left');
 assert.equal(result.paragraphs[1].align,'left');
 assert.equal(result.paragraphs[2].align,'right');
});
