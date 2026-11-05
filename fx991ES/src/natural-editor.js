/* Milestone 9: independently written Natural Display document editor.
 * Persistent node IDs, semantic slots, position anchors; no HTML parsing or eval.
 */
(function(global){'use strict';
let nextId=1;const id=()=>`nd${nextId++}`;
const seq=(children=[])=>({kind:'Sequence',id:id(),children});
const token=(value)=>({kind:'Token',id:id(),value:String(value)});
function create(){let root=seq();return {root,anchor:{sequenceId:root.id,offset:0}}}
function clone(doc){return {root:structuredClone(doc.root),anchor:{...doc.anchor}}}
function slots(node){if(node.kind==='Fraction')return [['numerator',node.numerator],['denominator',node.denominator]];
 if(node.kind==='Power')return [['exponent',node.exponent]];
 if(node.kind==='Root')return node.degree?[['degree',node.degree],['radicand',node.radicand]]:[['radicand',node.radicand]];
 if(node.kind==='Function')return [['argument',node.argument]];
 if(node.kind==='Group')return [['body',node.body]];
 return []}
function locate(root,sequenceId){function visit(s,parents=[]){if(s.id===sequenceId)return {sequence:s,parents};for(let i=0;i<s.children.length;i++){let child=s.children[i];for(let [slot,sub] of slots(child)){let found=visit(sub,[...parents,{sequence:s,index:i,node:child,slot}]);if(found)return found}}return null}return visit(root)}
function normalize(doc){if(!locate(doc.root,doc.anchor.sequenceId))doc.anchor={sequenceId:doc.root.id,offset:0};let found=locate(doc.root,doc.anchor.sequenceId);doc.anchor.offset=Math.max(0,Math.min(found.sequence.children.length,doc.anchor.offset));return doc}
function insertToken(original,value){let d=clone(original),f=locate(d.root,d.anchor.sequenceId);if(!f)throw Error('Invalid cursor anchor');for(let c of String(value)){f.sequence.children.splice(d.anchor.offset++,0,token(c))}return d}
function template(original,kind,name){let d=clone(original),f=locate(d.root,d.anchor.sequenceId),node,first;
 if(kind==='Fraction'){node={kind,id:id(),numerator:seq(),denominator:seq()};first=node.numerator}
 else if(kind==='Power'){node={kind,id:id(),exponent:seq()};first=node.exponent}
 else if(kind==='Root'){node={kind,id:id(),radicand:seq(),degree:name==='nth'?seq():null};first=node.degree||node.radicand}
 else if(kind==='Function'){node={kind,id:id(),name,argument:seq()};first=node.argument}
 else if(kind==='Group'){node={kind,id:id(),body:seq()};first=node.body}
 else throw Error('Unsupported template');
 f.sequence.children.splice(d.anchor.offset,0,node);d.anchor={sequenceId:first.id,offset:0};return d}
function move(original,direction){let d=clone(original),f=locate(d.root,d.anchor.sequenceId),at=d.anchor.offset,s=f.sequence;
 if(direction==='LEFT'){
  if(at>0){let prior=s.children[at-1],sub=slots(prior);if(sub.length){let last=sub[sub.length-1][1];d.anchor={sequenceId:last.id,offset:last.children.length}}else d.anchor.offset--}
  else if(f.parents.length){let p=f.parents[f.parents.length-1],ss=slots(p.node),ix=ss.findIndex(x=>x[0]===p.slot);if(ix>0){let prev=ss[ix-1][1];d.anchor={sequenceId:prev.id,offset:prev.children.length}}else d.anchor={sequenceId:p.sequence.id,offset:p.index}}
 }else if(direction==='RIGHT'){
  if(at<s.children.length){let child=s.children[at],sub=slots(child);if(sub.length)d.anchor={sequenceId:sub[0][1].id,offset:0};else d.anchor.offset++}
  else if(f.parents.length){let p=f.parents[f.parents.length-1],ss=slots(p.node),ix=ss.findIndex(x=>x[0]===p.slot);if(ix<ss.length-1)d.anchor={sequenceId:ss[ix+1][1].id,offset:0};else d.anchor={sequenceId:p.sequence.id,offset:p.index+1}}
 }else if(direction==='DOWN'||direction==='UP'){
  if(f.parents.length){let p=f.parents[f.parents.length-1],ss=slots(p.node),ix=ss.findIndex(x=>x[0]===p.slot),other=direction==='DOWN'?ix+1:ix-1;if(other>=0&&other<ss.length){let target=ss[other][1];d.anchor={sequenceId:target.id,offset:Math.min(at,target.children.length)}}}
 }
 return normalize(d)}
function exitSlot(original){
 let d=clone(original),f=locate(d.root,d.anchor.sequenceId);
 if(!f||!f.parents.length)return d;
 let p=f.parents[f.parents.length-1],ss=slots(p.node),idx=ss.findIndex(([slot])=>slot===p.slot);
 if(idx>=0&&idx<ss.length-1){d.anchor={sequenceId:ss[idx+1][1].id,offset:0};return d}
 d.anchor={sequenceId:p.sequence.id,offset:p.index+1};return d;
}
function del(original){let d=clone(original),f=locate(d.root,d.anchor.sequenceId),at=d.anchor.offset;
 if(at>0){f.sequence.children.splice(at-1,1);d.anchor.offset--;return d}
 if(!f.parents.length)return d;
 let p=f.parents[f.parents.length-1],ss=slots(p.node),ix=ss.findIndex(x=>x[0]===p.slot);
 if(ix>0){let earlier=ss[ix-1][1];d.anchor={sequenceId:earlier.id,offset:earlier.children.length};return d}
 // At the start of the first slot, remove the empty template as one unit.
 if(ss.every(([,s])=>s.children.length===0)){p.sequence.children.splice(p.index,1);d.anchor={sequenceId:p.sequence.id,offset:p.index}}
 else d.anchor={sequenceId:p.sequence.id,offset:p.index};
 return d}
function serializeNode(node){switch(node.kind){case 'Token':return node.value;case 'Sequence':return node.children.map(serializeNode).join('');case 'Fraction':return '('+serializeNode(node.numerator)+')/('+serializeNode(node.denominator)+')';case 'Power':return '^('+serializeNode(node.exponent)+')';case 'Root':return node.degree?'('+serializeNode(node.radicand)+')^(1/('+serializeNode(node.degree)+'))':'sqrt('+serializeNode(node.radicand)+')';case 'Function':return node.name+'('+serializeNode(node.argument)+')';case 'Group':return '('+serializeNode(node.body)+')';default:throw Error('Unsupported node '+node.kind)}}
function serialize(doc){return serializeNode(doc.root)}
function inspect(doc){
 let nodes=0,slotsCount=0,ids=new Set(),duplicate=false;
 function walk(n){nodes++;if(ids.has(n.id))duplicate=true;ids.add(n.id);for(const [,s] of slots(n)){slotsCount++;walk(s)}if(n.kind==='Sequence')for(const child of n.children)walk(child)}walk(doc.root);
 return {nodes,slots:slotsCount,duplicate,anchorValid:!!locate(doc.root,doc.anchor.sequenceId)};
}
function fromSource(text){let d=create();d.root.children=[...String(text)].map(token);d.anchor.offset=d.root.children.length;return d}
// Locate the closest valid structural cursor anchor for a parser source offset.
// All candidate positions are derived from the actual document tree, not from
// OCR, formatted HTML, or the calculator LCD's abbreviated display text.
function seekSource(original,position){
 const d=clone(original),source=serialize(d),target=Math.max(0,Math.min(source.length,Number.isFinite(position)?Math.floor(position):0));
 let best={sequenceId:d.root.id,offset:0},bestDistance=Infinity,bestDepth=-1;
 function walk(s,depth){
  for(let offset=0;offset<=s.children.length;offset++){
   d.anchor={sequenceId:s.id,offset};let mapped=sourceCursor(d),dist=Math.abs(target-mapped);
   if(dist<bestDistance||(dist===bestDistance&&depth>bestDepth)){
    best={sequenceId:s.id,offset};bestDistance=dist;bestDepth=depth;
   }
  }
  for(const node of s.children)for(const [,sub] of slots(node))walk(sub,depth+1);
 }
 walk(d.root,0);d.anchor=best;return normalize(d);
}
// The first incomplete template slot is an editable cursor location, not a
// textual pointer to the end of the expression.
function firstMissingAnchor(original){
 const missing=invalidSlots(original)[0];if(!missing)return null;
 const d=clone(original);let found=null;
 function visit(s){for(const node of s.children){if(node.id===missing.nodeId){found=slots(node).find(([name])=>name===missing.slot)?.[1];if(found)return}for(const [,sub] of slots(node)){visit(sub);if(found)return}}}
 visit(d.root);if(!found)return null;d.anchor={sequenceId:found.id,offset:0};return d;
}

function invalidSlots(doc){let missing=[];function walk(s){for(let ch of s.children){if(ch.kind==='Token')continue;for(let [name,sub] of slots(ch)){if(!sub.children.length)missing.push({nodeId:ch.id,slot:name});walk(sub)}}}walk(doc.root);return missing}
function renderHTML(doc){let cursor=doc.anchor;const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function renderSeq(s){let result='';for(let i=0;i<=s.children.length;i++){if(s.id===cursor.sequenceId&&i===cursor.offset)result+='<span class="nd-caret" aria-hidden="true"></span>';if(i<s.children.length)result+=renderNode(s.children[i])}return result||'<span class="nd-empty">□</span>'}
 function renderNode(n){switch(n.kind){case 'Token':return '<span class="nd-token">'+e(n.value)+'</span>';case 'Fraction':return '<span class="nd-frac"><span class="nd-num">'+renderSeq(n.numerator)+'</span><span class="nd-den">'+renderSeq(n.denominator)+'</span></span>';case 'Power':return '<sup class="nd-power">'+renderSeq(n.exponent)+'</sup>';case 'Root':return '<span class="nd-root">'+(n.degree?'<sup>'+renderSeq(n.degree)+'</sup>':'')+'√<span class="nd-radicand">'+renderSeq(n.radicand)+'</span></span>';case 'Function':return '<span class="nd-func">'+e(n.name)+'(</span>'+renderSeq(n.argument)+'<span>)</span>';case 'Group':return '<span>(</span>'+renderSeq(n.body)+'<span>)</span>';default:return ''}}
 return renderSeq(doc.root)}
function screenText(doc){function rec(n){if(n.kind==='Sequence')return n.children.map(rec).join('');if(n.kind==='Token')return n.value;if(n.kind==='Fraction')return rec(n.numerator)+'/'+rec(n.denominator);if(n.kind==='Power')return '^'+rec(n.exponent);if(n.kind==='Root')return '√'+rec(n.radicand);if(n.kind==='Function')return n.name+'('+rec(n.argument)+')';if(n.kind==='Group')return '('+rec(n.body)+')';return ''}return rec(doc.root)}
function sourceCursor(doc){let position=0,found=null;
 function visit(node){if(node.kind==='Token'){position+=node.value.length;return}if(node.kind==='Sequence'){for(let i=0;i<=node.children.length;i++){if(node.id===doc.anchor.sequenceId&&i===doc.anchor.offset)found=position;if(i<node.children.length)visit(node.children[i])}return}if(node.kind==='Fraction'){position++;visit(node.numerator);position+=3;visit(node.denominator);position++;return}if(node.kind==='Power'){position+=2;visit(node.exponent);position++;return}if(node.kind==='Root'){if(node.degree){position++;visit(node.radicand);position+=5;visit(node.degree);position+=2}else{position+=5;visit(node.radicand);position++}return}if(node.kind==='Function'){position+=node.name.length+1;visit(node.argument);position++;return}if(node.kind==='Group'){position++;visit(node.body);position++;return}}
 visit(doc.root);return found??position}
const api={create,clone,fromSource,seekSource,firstMissingAnchor,insertToken,template,move,del,serialize,serializeNode,renderHTML,screenText,sourceCursor,invalidSlots,locate,normalize,exitSlot,inspect};global.FX991_EDITOR=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
