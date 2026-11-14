import test from 'node:test';
import assert from 'node:assert/strict';
import {TextHistory} from '../js/text-history.js';
import {compositionInsertion} from '../js/text-pending.js';
import {captureLogicalSelection,recoverEquationSelection} from '../js/text-selection.js';
import {adjacentEquationAtCaret} from '../js/text-equation-caret.js';

const point=(paragraph,offset)=>({paragraph,offset});
function txt(textContent){return {nodeType:3,textContent,childNodes:[]};}
function element(tag,...children){
 const n={nodeType:1,tagName:tag.toUpperCase(),dataset:{},childNodes:children,
  children:children.filter(c=>c.nodeType===1),
  contains(other){return this===other||this.childNodes.some(child=>child===other||child.contains?.(other));}};
 for(const child of children){child.parentNode=n;child.parentElement=n;}
 return n;
}
function fixture(){
 const before=txt('שלום '),after=txt(' English');
 const formula=element('span',element('img',txt('Decorative math alt text')));
 formula.dataset.equation='{"source":"x^2"}';
 const first=element('li',element('span',before),formula,element('span',after));
 const second=element('div',element('span',txt('עברית English')));
 const root=element('div',element('ol',first),second);
 return {before,after,formula,first,second,root,alt:formula.childNodes[0].childNodes[0]};
}
function selection(anchorNode,anchorOffset,focusNode=anchorNode,focusOffset=anchorOffset){
 return {rangeCount:1,anchorNode,anchorOffset,focusNode,focusOffset,
  setBaseAndExtent(a,ao,b,bo){
   this.anchorNode=a;this.anchorOffset=ao;
   this.focusNode=b;this.focusOffset=bo;
  }};
}

test('TXT-063 composition diff never replaces an equation or crosses paragraph boundaries',()=>{
 assert.deepEqual(compositionInsertion('שלום \uFFFC end','שלום חדש \uFFFC end'),
  {start:5,end:9});
 assert.deepEqual(compositionInsertion('אב\uFFFCגד','אב\uFFFCחדשגד'),
  {start:3,end:6});
 assert.equal(compositionInsertion('אב\uFFFCגד','אב!גד'),null);
 assert.equal(compositionInsertion('אב\uFFFCגד','אבגד'),null);
 assert.equal(compositionInsertion('אבגד','אב\uFFFCגד'),null);
 assert.equal(compositionInsertion('אב\nגד','אבגד'),null);
 assert.equal(compositionInsertion('אבגד','אב\nגד'),null);
 assert.equal(compositionInsertion('אב\uFFFCגד','אב\uFFFCגד'),null);
 assert.equal(compositionInsertion('אבגד','אב'),null);
 assert.deepEqual(compositionInsertion('A😊B','A😢B'),{start:1,end:3},
  'Emoji replacement must not start inside a surrogate pair');
 assert.deepEqual(compositionInsertion('שָלום','שׁלום'),{start:0,end:2},
  'Hebrew combining marks must remain attached to their base letter');
 assert.deepEqual(compositionInsertion('שלום','שָלום'),{start:0,end:2},
  'Adding niqqud must style the entire displayed Hebrew grapheme');
});

test('TXT-063 delayed IME final input replaces only latest undo entry',()=>{
 const para=[{align:'right',dir:'rtl',list:'number',numberStart:7}];
 const base={runs:[{text:'שלום \uFFFC'}],paragraphs:para,
  selection:{anchor:point(0,6),focus:point(0,6)}};
 const h=new TextHistory(base);
 assert.equal(h.amendCurrent({...base,runs:[{text:'corruption'}]}),false,
  'Never rewrite original state');
 assert.equal(h.current.runs[0].text,'שלום \uFFFC');
 const partial={...base,runs:[{text:'שלום אב\uFFFC'}]};
 const final={...base,runs:[{text:'שלום אבג\uFFFC'}],
  selection:{anchor:point(0,8),focus:point(0,8)}};
 assert.equal(h.push(partial),true);
 const index=h.index;
 assert.equal(h.amendCurrent(final,index),true);
 assert.equal(h.entries.length,2);
 assert.equal(h.index,index);
 assert.deepEqual(h.current.runs,final.runs);
 assert.equal(h.amendCurrent({...base,runs:[{text:'wrong'}]},index-1),false);
 assert.equal(h.undo().runs[0].text,'שלום \uFFFC');
 assert.equal(h.redo().runs[0].text,'שלום אבג\uFFFC');
 assert.deepEqual(h.current.selection,final.selection);
 assert.equal(h.amendCurrent(final,index),false,'Identical final input does not introduce new history');
});

test('TXT-063 equation image descendant selection recovers to one atomic boundary',()=>{
 const {root,formula,first,alt}=fixture();
 const sel=selection(alt,4);
 assert.deepEqual(captureLogicalSelection(root,sel),{
  anchor:point(0,6),focus:point(0,6)
 });
 assert.equal(recoverEquationSelection(root,sel),true);
 assert.equal(sel.anchorNode,first);
 assert.equal(sel.focusNode,first);
 assert.equal(sel.anchorOffset,2);
 assert.equal(sel.focusOffset,2);
 assert.equal(recoverEquationSelection(root,sel),false);
 assert.deepEqual(captureLogicalSelection(root,sel),{
  anchor:point(0,6),focus:point(0,6)
 });
 assert.equal(formula.dataset.equation,'{"source":"x^2"}');
});

test('TXT-063 normal Hebrew and English caret positions are never rewritten',()=>{
 const {root,before,after,first}=fixture();
 const hebrew=selection(before,2);
 assert.equal(recoverEquationSelection(root,hebrew),false);
 assert.equal(hebrew.anchorNode,before);
 assert.deepEqual(captureLogicalSelection(root,hebrew),{
  anchor:point(0,2),focus:point(0,2)
 });
 const english=selection(after,4);
 assert.equal(recoverEquationSelection(root,english),false);
 assert.equal(english.anchorNode,after);
 assert.deepEqual(captureLogicalSelection(root,english),{
  anchor:point(0,10),focus:point(0,10)
 });
 const list=selection(first,1);
 assert.equal(recoverEquationSelection(root,list),false);
});

test('TXT-063 Alt+Enter discovers only complete adjacent math atoms',()=>{
 const {root,formula,before,after,second,first}=fixture();
 assert.equal(adjacentEquationAtCaret(root,selection(before,5)),formula);
 assert.equal(adjacentEquationAtCaret(root,selection(first,2)),formula);
 assert.equal(adjacentEquationAtCaret(root,selection(after,0)),formula);
 assert.equal(adjacentEquationAtCaret(root,selection(before,2)),null);
 assert.equal(adjacentEquationAtCaret(root,selection(second,0)),null);
 assert.equal(adjacentEquationAtCaret(root,selection(before,5,after,0)),null,
  'Do not trigger equation editing with a selected range');
 assert.equal(adjacentEquationAtCaret(root,{rangeCount:0}),null);
});
