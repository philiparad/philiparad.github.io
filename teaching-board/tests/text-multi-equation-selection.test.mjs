import test from 'node:test';
import assert from 'node:assert/strict';
import {captureLogicalSelection,restoreLogicalSelection} from '../js/text-selection.js';
import {selectedDeletion} from '../js/text-boundary-keys.js';
import {replaceRichClipboard} from '../js/text-inline-clipboard.js';
import {validateRuns,validateParagraphs} from '../js/rich-text.js';

const eq=(source)=>({source,src:'data:image/png;base64,AAAA',w:45,h:25});
const model=()=>({
 runs:[
  {text:'אב',bold:true},{text:'\uFFFC',equation:eq('x^2')},
  {text:'גד\n',italic:true},{text:'\uFFFC',equation:eq('y')},
  {text:'\uFFFC',equation:eq('z')},{text:'A\nשלום\n\nLast',color:'#147d92'},
  {text:'\uFFFC',equation:eq('t')}
 ],
 paragraphs:[
  {align:'right',dir:'rtl',list:'number',numberStart:7},
  {align:'right',dir:'rtl',list:'bullet'},
  {align:'right',dir:'rtl',list:'number',numberStart:13},
  {align:'left',dir:'ltr',list:'none'},
  {align:'left',dir:'ltr',list:'number',numberStart:21}
 ]
});
const at=(p,o)=>({paragraph:p,offset:o});
const selected=(a,b)=>({anchor:a,focus:b});
const cut={schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]};
const values=s=>s.runs.filter(r=>r.equation).map(r=>r.equation.source);
function element(tag,...children){
 const n={nodeType:1,tagName:tag.toUpperCase(),dataset:{},childNodes:children,
  children:children.filter(ch=>ch.nodeType===1),
  contains(other){return this===other||this.childNodes.some(ch=>ch===other||ch.contains?.(other));}};
 for(const ch of children){ch.parentNode=n;ch.parentElement=n;}
 return n;
}
const textNode=value=>({nodeType:3,textContent:value,childNodes:[]});
const equationNode=source=>Object.assign(element('span',element('span',textNode('image ALT should never count'))),
 {dataset:{equation:JSON.stringify(eq(source))}});
function domFixture(){
 const one=element('li',element('span',textNode('אב')),equationNode('x^2'),
  element('span',textNode('גד')));
 const two=element('li',equationNode('y'),equationNode('z'),element('span',textNode('A')));
 const three=element('li',element('span',textNode('שלום')));
 const empty=element('div',element('br'));
 const last=element('li',element('span',textNode('Last')),equationNode('t'));
 const root=element('div',element('ol',one,two),element('ul',three),
  empty,element('ol',last));
 return {root,one,two,three,empty,last};
}

test('TXT-062 multiple equations are each exactly one UTF-16 selection unit',()=>{
 const {root,one,two}=domFixture();
 const math=two.childNodes[1],inner=math.childNodes[0].childNodes[0];
 const selection={
  rangeCount:1,anchorNode:one.childNodes[0].childNodes[0],anchorOffset:2,
  focusNode:inner,focusOffset:5
 };
 assert.deepEqual(captureLogicalSelection(root,selection),selected(at(0,2),at(1,2)));
 const before={...selection,focusOffset:0};
 assert.deepEqual(captureLogicalSelection(root,before),selected(at(0,2),at(1,1)));
 const emptyPoint={...selection,anchorNode:two,anchorOffset:2,
  focusNode:two,focusOffset:2};
 assert.deepEqual(captureLogicalSelection(root,emptyPoint),selected(at(1,2),at(1,2)));
});

test('TXT-062 list-container and root selection boundaries select correct neighboring paragraphs',()=>{
 const {root,two}=domFixture(),ol=root.childNodes[0];
 const capture=(node,start,end)=>captureLogicalSelection(root,{
  rangeCount:1,anchorNode:node,anchorOffset:start,
  focusNode:node,focusOffset:end
 });
 assert.deepEqual(capture(ol,1,2),selected(at(1,0),at(1,3)));
 assert.deepEqual(capture(ol,0,1),selected(at(0,0),at(1,0)));
 assert.deepEqual(capture(root,0,4),selected(at(0,0),at(4,5)));
 assert.deepEqual(capture(root,1,3),selected(at(2,0),at(4,0)));
 const reversed={rangeCount:1,anchorNode:ol,anchorOffset:2,
  focusNode:two.childNodes[0],focusOffset:0};
 assert.deepEqual(captureLogicalSelection(root,reversed),selected(at(1,3),at(1,0)));
 const saved=selected(at(4,5),at(0,2));
 const fake={setBaseAndExtent(...a){this.args=a;}};
 assert.equal(restoreLogicalSelection(root,fake,saved),true);
 assert.equal(fake.args[1],2,
  'The restored end caret belongs after the fourth inline child');
 assert.equal(fake.args[3],2);
});

test('TXT-062 Backspace on selected multiple math atoms removes complete sources and keeps list',()=>{
 const input=model();
 const action=selectedDeletion(input,selected(at(1,2),at(1,0)),'Backspace');
 assert.deepEqual(action,{kind:'selection',start:6,end:8});
 const after=replaceRichClipboard(input,action.start,action.end,cut);
 assert(after);
 assert.deepEqual(values(after),['x^2','t']);
 assert.equal(after.text,'אב\uFFFCגד\nA\nשלום\n\nLast\uFFFC');
 assert.deepEqual(after.paragraphs,input.paragraphs);
 assert.deepEqual(after.cursor,at(1,0));
 validateRuns(after.runs,after.text);validateParagraphs(after.paragraphs,after.text);
 assert.deepEqual(values(input),['x^2','y','z','t']);
});

test('TXT-062 selections spanning mixed RTL/LTR list transitions delete exact newlines and equations',()=>{
 const input=model();
 const first=selectedDeletion(input,selected(at(2,0),at(0,2)),'Delete');
 assert.deepEqual(first,{kind:'selection',start:2,end:10});
 const joined=replaceRichClipboard(input,first.start,first.end,cut);
 assert(joined);
 assert.equal(joined.text,'אבשלום\n\nLast\uFFFC');
 assert.deepEqual(values(joined),['t']);
 assert.deepEqual(joined.paragraphs.map(p=>p.list),['number','none','number']);
 assert.deepEqual(joined.paragraphs.map(p=>p.dir),['rtl','ltr','ltr']);
 assert.equal(joined.paragraphs[0].numberStart,7);
 assert.equal(joined.paragraphs[2].numberStart,21);
 assert.deepEqual(joined.cursor,at(0,2));
 const second=selectedDeletion(input,selected(at(1,0),at(4,0)),'Backspace');
 assert.deepEqual(second,{kind:'selection',start:6,end:16});
 const rest=replaceRichClipboard(input,second.start,second.end,cut);
 assert(rest);
 assert.equal(rest.text,'אב\uFFFCגד\nLast\uFFFC');
 assert.deepEqual(values(rest),['x^2','t']);
 assert.deepEqual(rest.paragraphs.map(p=>p.numberStart),[7,21]);
});

test('TXT-062 never alters data for collapsed or invalid selections',()=>{
 const input=model(),unchanged=structuredClone(input);
 for(const invalid of [
  selected(at(0,0),at(0,0)),
  selected(at(0,99),at(2,0)),
  selected(at(-1,0),at(0,0)),
  selected(at(0,0),at(5,0)),
  selected(at(0,0),at(1,-2))
 ])assert.equal(selectedDeletion(input,invalid,'Delete'),null);
 assert.equal(selectedDeletion(input,selected(at(0,0),at(1,0)),'ArrowRight'),null);
 assert.deepEqual(input,unchanged);
});
