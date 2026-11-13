import test from 'node:test';
import assert from 'node:assert/strict';
import {toggleParagraphLists,editableParagraphs,selectedParagraphIndices} from '../js/text-lists.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';

const row=(list='none',dir='rtl')=>({align:'right',dir,list});
test('list commands toggle selected paragraphs and preserve Hebrew direction',()=>{
 const initial=[row(),row('bullet'),row('number','ltr'),row()];
 const converted=toggleParagraphLists(initial,[0,1],'bullet');
 assert.deepEqual(converted.map(p=>p.list),['bullet','bullet','number','none']);
 assert.equal(converted[2].dir,'ltr');
 assert.deepEqual(initial.map(p=>p.list),['none','bullet','number','none']);
 assert.deepEqual(toggleParagraphLists(converted,[0,1],'bullet').map(p=>p.list),['none','none','number','none']);
 assert.equal(toggleParagraphLists(initial,[0,9],'number'),null);
 assert.throws(()=>toggleParagraphLists(initial,[0],'unsafe'),/Unsupported list type/);
});
test('list conversion does not change mathematical text runs or backups',()=>{
 const board=createBoard();
 board.items=[{id:'t',type:'text',x:0,y:0,w:400,h:100,text:'שלום x²\nEnglish',
   runs:[{text:'שלום x²\n',bold:true},{text:'English',italic:true}],
   paragraphs:[row(),row('number','ltr')]}];
 const changed=toggleParagraphLists(board.items[0].paragraphs,[0,1],'bullet');
 const result={...board.items[0],paragraphs:changed};
 board.items=[result];
 const imported=parseBackup(serializeBackup(board)).items[0];
 assert.deepEqual(imported.runs,result.runs);
 assert.deepEqual(imported.paragraphs,result.paragraphs);
});
function element(tag,parent=null){
 const e={tagName:tag,parentElement:parent,children:[],childNodes:[],contains(n){return n===this||this.children.some(c=>c.contains(n));}};
 if(parent){parent.children.push(e);parent.childNodes.push(e);}
 return e;
}
test('paragraph index discovery ignores list wrapper and preserves order',()=>{
 const root=element('DIV'),p0=element('DIV',root),ul=element('UL',root);
 const p1=element('LI',ul),p2=element('LI',ul),p3=element('DIV',root);
 const blocks=editableParagraphs(root);
 assert.deepEqual(blocks,[p0,p1,p2,p3]);
 const collapsed={collapsed:true,startContainer:p2,endContainer:p2};
 assert.deepEqual(selectedParagraphIndices(root,{rangeCount:1,getRangeAt:()=>collapsed},blocks),[2]);
 const selected={collapsed:false,startContainer:p1,endContainer:p3,intersectsNode:n=>n===p1||n===p2||n===p3};
 assert.deepEqual(selectedParagraphIndices(root,{rangeCount:1,getRangeAt:()=>selected},blocks),[1,2,3]);
 const outside=element('DIV');
 assert.deepEqual(selectedParagraphIndices(root,{rangeCount:1,getRangeAt:()=>({...collapsed,startContainer:outside})},blocks),[]);
});
