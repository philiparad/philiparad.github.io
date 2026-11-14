import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryEdit,boundaryNavigation,unlistEmptyParagraph} from '../js/text-boundary-keys.js';
import {replaceRichClipboard} from '../js/text-inline-clipboard.js';
import {validateParagraphs} from '../js/rich-text.js';

const point=(p,o)=>({paragraph:p,offset:o});
const at=(p,o)=>({anchor:point(p,o),focus:point(p,o)});
const doc=()=>({
 runs:[{text:'אבג\n\nEnglish\n'},{text:'\uFFFC',equation:{
  source:'x^2',src:'data:image/png;base64,AAAA',w:50,h:28}},
  {text:' tail\nסיום'}],
 paragraphs:[
  {align:'right',dir:'rtl',list:'number',numberStart:7},
  {align:'right',dir:'rtl',list:'number'},
  {align:'left',dir:'ltr',list:'bullet'},
  {align:'left',dir:'ltr',list:'none'},
  {align:'right',dir:'rtl',list:'number',numberStart:12}
 ]
});
const rows=()=>doc().runs.map(r=>r.text).join('').split('\n');
const cut={schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]};

test('TXT-061 Backspace merges paragraphs at exact preceding newline and keeps destination formatting',()=>{
 const input=doc();
 const action=boundaryEdit(input,at(2,0),'Backspace');
 assert.deepEqual(action,{kind:'join',start:4,end:5});
 const after=replaceRichClipboard(input,action.start,action.end,cut);
 assert(after);
 assert.equal(after.text,'אבג\nEnglish\n\uFFFC tail\nסיום');
 assert.equal(after.paragraphs.length,4);
 assert.equal(after.paragraphs[1].list,'number');
 assert.equal(after.paragraphs[1].dir,'rtl');
 assert.deepEqual(after.cursor,point(1,0));
 const next=boundaryEdit(input,at(4,0),'Backspace');
 assert.deepEqual(next,{kind:'join',start:19,end:20});
 const joined=replaceRichClipboard(input,next.start,next.end,cut);
 assert(joined);
 assert.equal(joined.paragraphs.at(-1).dir,'ltr');
});

test('TXT-061 Delete at list end removes only the newline and preserves numbering',()=>{
 const input=doc();
 assert.deepEqual(boundaryEdit(input,at(0,3),'Delete'),{
  kind:'join',start:3,end:4
 });
 const first=replaceRichClipboard(input,3,4,cut);
 assert(first);
 assert.equal(first.text,'אבג\nEnglish\n\uFFFC tail\nסיום');
 assert.equal(first.paragraphs[0].numberStart,7);
 assert.equal(first.paragraphs[1].list,'bullet');
 assert.equal(first.cursor.paragraph,0);
 assert.equal(first.cursor.offset,3);
 assert.equal(boundaryEdit(input,at(0,2),'Delete'),null);
 assert.equal(boundaryEdit(input,at(4,4),'Delete'),null);
});

test('TXT-061 Backspace on empty numbered list row removes marker before joining',()=>{
 const input=doc();
 const operation=boundaryEdit(input,at(1,0),'Backspace');
 assert.deepEqual(operation,{kind:'unlist',paragraph:1,cursor:point(1,0)});
 const updated=unlistEmptyParagraph(input,operation.paragraph);
 assert(updated);
 assert.equal(updated.paragraphs[1].list,'none');
 assert.equal(updated.paragraphs[1].numberStart,undefined);
 assert.equal(updated.paragraphs[0].numberStart,7);
 assert.deepEqual(updated.runs,input.runs);
 assert.deepEqual(input.paragraphs[1].list,'number');
 validateParagraphs(updated.paragraphs,input.runs.map(r=>r.text).join(''));
 assert.equal(unlistEmptyParagraph(input,2),null);
 assert.deepEqual(boundaryEdit(input,at(1,0),'Delete'),
  {kind:'join',start:4,end:5});
});

test('TXT-061 removal of empty ordered item preserves following ordinal without stale list starts',()=>{
 const input={runs:[{text:'first\n\nthird\nend'}],
  paragraphs:[
   {align:'left',dir:'ltr',list:'number',numberStart:9},
   {align:'left',dir:'ltr',list:'number'},
   {align:'left',dir:'ltr',list:'number'},
   {align:'left',dir:'ltr',list:'bullet'}
  ]};
 const after=unlistEmptyParagraph(input,1);
 assert(after);
 assert.equal(after.paragraphs[1].list,'none');
 assert.equal(after.paragraphs[2].numberStart,11);
 assert.equal(after.paragraphs[3].list,'bullet');
 const beforeFirst={runs:[{text:'\nentry'}],paragraphs:[
  {align:'right',dir:'rtl',list:'number',numberStart:14},
  {align:'right',dir:'rtl',list:'number'}
 ]};
 const removed=unlistEmptyParagraph(beforeFirst,0);
 assert.equal(removed.paragraphs[1].numberStart,15);
});

test('TXT-061 Alt+Up/Down navigates numbered, empty and equation paragraphs without editing text',()=>{
 const input=doc();
 const down=boundaryNavigation(input,at(0,3),'ArrowDown',{alt:true});
 assert.deepEqual(down,{anchor:point(1,0),focus:point(1,0)});
 const fromEmpty=boundaryNavigation(input,down,'ArrowDown',{alt:true});
 assert.deepEqual(fromEmpty,{anchor:point(2,0),focus:point(2,0)});
 const back=boundaryNavigation(input,fromEmpty,'ArrowUp',{alt:true});
 assert.deepEqual(back,{anchor:point(1,0),focus:point(1,0)});
 const nearMath=boundaryNavigation(input,at(2,5),'ArrowDown',{alt:true});
 assert.deepEqual(nearMath,{anchor:point(3,5),focus:point(3,5)});
 assert.equal(rows()[3].includes('\uFFFC'),true);
 assert.equal(boundaryNavigation(input,at(4,4),'ArrowDown',{alt:true}),null);
 assert.equal(boundaryNavigation(input,at(0,0),'ArrowUp',{alt:true}),null);
});

test('TXT-061 Shift+Alt arrows preserve anchor, build reversible backward selection',()=>{
 const input=doc(),start=at(2,3);
 const up=boundaryNavigation(input,start,'ArrowUp',{alt:true,shift:true});
 assert.deepEqual(up,{anchor:point(2,3),focus:point(1,0)});
 const again=boundaryNavigation(input,up,'ArrowUp',{alt:true,shift:true});
 assert.deepEqual(again,{anchor:point(2,3),focus:point(0,0)});
 const down=boundaryNavigation(input,again,'ArrowDown',{alt:true,shift:true});
 assert.deepEqual(down,up);
 const normal=boundaryNavigation(input,again,'ArrowDown',{alt:true});
 assert.deepEqual(normal,{anchor:point(1,0),focus:point(1,0)});
});

test('TXT-061 Ctrl/Meta+Home and End reach correct document edges and extend selections',()=>{
 const input=doc();
 assert.deepEqual(boundaryNavigation(input,at(2,3),'Home',{ctrl:true}),{
  anchor:point(0,0),focus:point(0,0)
 });
 assert.deepEqual(boundaryNavigation(input,at(1,0),'End',{meta:true}),{
  anchor:point(4,4),focus:point(4,4)
 });
 const extend=boundaryNavigation(input,at(3,1),'Home',{ctrl:true,shift:true});
 assert.deepEqual(extend,{anchor:point(3,1),focus:point(0,0)});
 const final=boundaryNavigation(input,extend,'End',{meta:true,shift:true});
 assert.deepEqual(final,{anchor:point(3,1),focus:point(4,4)});
 assert.equal(boundaryNavigation(input,at(0,0),'Home',{ctrl:true}),null);
 assert.equal(boundaryNavigation(input,at(2,1),'Home',{alt:true,ctrl:true}),null);
});

test('TXT-061 unmodified vertical arrows only take over native movement from empty paragraphs',()=>{
 const input=doc();
 assert.deepEqual(boundaryNavigation(input,at(1,0),'ArrowDown'),{
  anchor:point(2,0),focus:point(2,0)
 });
 assert.deepEqual(boundaryNavigation(input,at(1,0),'ArrowUp'),{
  anchor:point(0,0),focus:point(0,0)
 });
 assert.equal(boundaryNavigation(input,at(2,1),'ArrowUp'),null);
 assert.equal(boundaryNavigation(input,at(2,1),'ArrowDown'),null);
});

test('TXT-061 refuses ranges, invalid offsets and unsupported keyboard edits',()=>{
 const input=doc();
 assert.equal(boundaryEdit(input,{anchor:point(1,0),focus:point(2,0)},'Backspace'),null);
 assert.equal(boundaryEdit(input,at(1,1),'Backspace'),null);
 assert.equal(boundaryEdit(input,at(0,0),'Backspace'),null);
 assert.equal(boundaryEdit(input,at(99,0),'Delete'),null);
 assert.equal(boundaryEdit(input,at(2,0),'Enter'),null);
 assert.equal(boundaryNavigation(input,at(99,0),'ArrowDown',{alt:true}),null);
 assert.equal(boundaryNavigation(input,at(2,0),'ArrowLeft',{alt:true}),null);
 assert.equal(boundaryNavigation(input,at(2,0),'End',{ctrl:true,alt:true}),null);
});
