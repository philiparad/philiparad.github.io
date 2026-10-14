import test from 'node:test';
import assert from 'node:assert/strict';
import {readRichDocument,paragraphRuns,validateParagraphs} from '../js/rich-text.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
const txt=textContent=>({nodeType:3,textContent});
function node(tag,children=[],style={}){const n={nodeType:1,tagName:tag.toUpperCase(),style,childNodes:children,getAttribute(){return null;}};for(const c of children)c.parentNode=n;return n;}
test('paragraph reader preserves distinct alignments, blank lines and list types',()=>{
 const root=node('div',[node('div',[txt('Heading')],{textAlign:'center'}),node('div',[node('br')]),node('ul',[node('li',[txt('First')]),node('li',[node('b',[txt('Second')])])]),node('ol',[node('li',[txt('Step')])])]);
 const doc=readRichDocument(root,{}),text=doc.runs.map(r=>r.text).join('');assert.equal(text,'Heading\n\nFirst\nSecond\nStep');assert.deepEqual(doc.paragraphs.map(p=>p.list),['none','none','bullet','bullet','number']);assert.equal(doc.paragraphs[0].align,'center');assert.equal(paragraphRuns({text,...doc})[3].runs[0].bold,true);validateParagraphs(doc.paragraphs,text);
});
test('paragraph alignment and lists survive backups and invalid metadata is rejected',()=>{
 const b=createBoard();b.items=[{id:'text',type:'text',x:0,y:0,w:360,h:130,text:'A\nB',paragraphs:[{align:'center',list:'none'},{align:'right',list:'bullet'}]}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);
 for(const ps of [[],[{align:'justify',list:'none'}],[{align:'left',list:'bad'}]])assert.throws(()=>validateParagraphs(ps,'A'));
});
