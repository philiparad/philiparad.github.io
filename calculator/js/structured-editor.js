/* REA-009: independent structured textbook expression editor.
 * No eval, browser dialogs, React or NodeJS. Editable slots form a tree.
 * The mathematical expression is serialized only for the calculation engine.
 */
(function(global){'use strict';
const FIELDS={fraction:['numerator','denominator'],
 mixed:['integer','numerator','denominator'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],squareRoot:['radicand'],
 cubeRoot:['radicand'],nthRoot:['index','radicand'],logBase:['base','argument']};
function create(){return {root:[],path:[],offset:0,version:1,undoStack:[]}}
const MAX_UNDO=40;
function snapshot(editor){
 if(!Array.isArray(editor.undoStack))editor.undoStack=[];
 editor.undoStack.push({root:JSON.parse(JSON.stringify(editor.root)),
  path:editor.path.map(step=>({...step})),offset:editor.offset});
 if(editor.undoStack.length>MAX_UNDO)editor.undoStack.shift();
}
function undo(editor){
 if(!editor.undoStack?.length)return false;
 const prior=editor.undoStack.pop();
 editor.root=prior.root;editor.path=prior.path;editor.offset=prior.offset;
 return true;
}
function locate(editor){
 let seq=editor.root;
 for(const step of editor.path){
  const node=seq[step.index];
  if(!node||!FIELDS[node.type]||!Object.prototype.hasOwnProperty.call(node.parts,step.field))throw Error('Invalid editor cursor');
  seq=node.parts[step.field];
 }
 return seq;
}
function setPosition(editor,path,offset){
 editor.path=path.map(x=>({...x}));
 editor.offset=Math.max(0,Math.min(locate(editor).length,offset));
}
function nodeText(node,strict){
 if(node.type==='char')return node.value;
 const get=field=>{
  const s=node.parts[field].map(x=>nodeText(x,strict)).join('');
  if(!s&&strict)throw Error('Syntax ERROR: missing '+field);
  return s||'?';
 };
 switch(node.type){
  case 'fraction':return '(('+get('numerator')+')/('+get('denominator')+'))';
  case 'mixed':{
   const integer=get('integer'),fraction='(('+get('numerator')+')/('+get('denominator')+'))';
   // A negative mixed number is -(whole + fraction), not -whole + fraction.
   return '(('+integer+')'+(integer.trim().startsWith('-')?'-':'+')+fraction+')';
  }
  case 'power':return '^('+get('exponent')+')';
  case 'exp10':return 'E'+get('exponent');
  case 'recurring':return 'RPT('+get('period')+')';
  case 'squareRoot':return 'sqrt('+get('radicand')+')';
  case 'cubeRoot':return 'cbrt('+get('radicand')+')';
  case 'nthRoot':return 'nthroot('+get('index')+','+get('radicand')+')';
  case 'logBase':return 'log('+get('base')+','+get('argument')+')';
 }
 throw Error('Unknown expression node '+node.type);
}
function serialize(editor,strict=false){return editor.root.map(node=>nodeText(node,strict)).join('')}
function insert(editor,text,overwrite=false){
 if(!text)return;
 const seq=locate(editor);
 snapshot(editor);
 for(const value of Array.from(String(text))){
  const char={type:'char',value};
  // Overwrite only plain characters inside the current field. Never replace
  // a formula node: discarding it would silently erase nested input.
  if(overwrite&&seq[editor.offset]?.type==='char')seq[editor.offset]=char;
  else seq.splice(editor.offset,0,char);
  editor.offset++;
 }
}
// REA-073: capture a complete preceding operand when a stacked fraction
// is inserted after it (e.g. 2^3, √4, or (1+2)). Do not absorb binary signs.
function captureOperandStart(seq,end){
 let at=end;
 while(at>0&&seq[at-1].type==='power')at--;
 if(at<=0)return end;
 const last=seq[at-1];
 if(last.type!=='char')return at-1;
 if(last.value===')'){
  let depth=0;
  for(let i=at-1;i>=0;i--){
   const n=seq[i];
   if(n.type!=='char')continue;
   if(n.value===')')depth++;
   if(n.value==='('){
    depth--;
    if(depth===0)return i;
   }
  }
  return end; // Leave unmatched parentheses as editable input.
 }
 if(/[0-9.]/.test(last.value)){
  while(at>0&&seq[at-1].type==='char'&&/[0-9.]/.test(seq[at-1].value))at--;
  return at;
 }
 if(/[A-Za-z]/.test(last.value)){
  // Identifiers (Ans, X, pi) are single operands in the editor.
  while(at>0&&seq[at-1].type==='char'&&/[A-Za-z]/.test(seq[at-1].value))at--;
  return at;
 }
 return end;
}
function template(editor,type,overwrite=false){
 const fields=FIELDS[type];
 if(!fields)throw Error('Unknown template '+type);
 const seq=locate(editor);
 snapshot(editor);
 const node={type,parts:Object.fromEntries(fields.map(field=>[field,[]]))};
 const before=editor.offset;
 if(type==='fraction'&&before>0){
  const at=captureOperandStart(seq,before);
  if(at!==before){
   node.parts.numerator=seq.splice(at,before-at);
   editor.offset=at;
  }
 }
 const parent=editor.path.map(x=>({...x}));
 const position=editor.offset;
 if(overwrite&&seq[position]?.type==='char')seq.splice(position,1,node);
 else seq.splice(position,0,node);
 const initial=type==='fraction'&&node.parts.numerator.length?'denominator':fields[0];
 setPosition(editor,[...parent,{index:position,field:initial}],0);
}
// REA-073: MathIO INS incorporates the complete operand to the right
// of the caret into a function. Original CASIO feature, source-modelled.
function captureFollowingEnd(seq,start){
 if(start>=seq.length)return start;
 const first=seq[start];
 if(first.type!=='char'){
  let end=start+1;
  while(end<seq.length&&seq[end].type==='power')end++;
  return end;
 }
 let end=start;
 if(first.value==='('){
  let depth=0;
  for(let i=start;i<seq.length;i++){
   const node=seq[i];if(node.type!=='char')continue;
   if(node.value==='(')depth++;
   if(node.value===')'){
    depth--;
    if(depth===0){end=i+1;break}
   }
  }
 }else if(/[0-9.]/.test(first.value)){
  while(end<seq.length&&seq[end].type==='char'&&/[0-9.]/.test(seq[end].value))end++;
 }else if(/[A-Za-z]/.test(first.value)){
  while(end<seq.length&&seq[end].type==='char'&&/[A-Za-z]/.test(seq[end].value))end++;
 }
 if(end>start)while(end<seq.length&&seq[end].type==='power')end++;
 return end;
}
function incorporate(editor,type){
 const targets={fraction:'numerator',squareRoot:'radicand',
  cubeRoot:'radicand',nthRoot:'radicand',logBase:'argument'};
 const target=targets[type];
 if(!target)return false;
 const seq=locate(editor),start=editor.offset,end=captureFollowingEnd(seq,start);
 if(end===start)return false;
 const fields=FIELDS[type];
 snapshot(editor);
 const nodes=seq.splice(start,end-start);
 const templateNode={type,parts:Object.fromEntries(fields.map(field=>[field,[]]))};
 templateNode.parts[target]=nodes;
 seq.splice(start,0,templateNode);
 const next=type==='fraction'?'denominator':
  type==='nthRoot'?'index':type==='logBase'?'base':target;
 setPosition(editor,[...editor.path,{index:start,field:next}],0);
 return true;
}
function moveField(editor,direction){
 const path=editor.path;
 if(!path.length)return false;
 const step=path[path.length-1],parent=path.slice(0,-1);
 let seq=editor.root;
 for(const entry of parent)seq=seq[entry.index].parts[entry.field];
 const node=seq[step.index],fields=FIELDS[node.type],pos=fields.indexOf(step.field);
 let to=pos+(direction>0?1:-1);
 if(to>=0&&to<fields.length){
  setPosition(editor,[...parent,{index:step.index,field:fields[to]}],
   direction>0?0:node.parts[fields[to]].length);
  return true;
 }
 setPosition(editor,parent,step.index+(direction>0?1:0));
 return true;
}
// Enter a neighboring formula only when its logical boundary is crossed.
function enter(editor,nodeIndex,direction){
 const seq=locate(editor),node=seq[nodeIndex];
 const fields=FIELDS[node?.type];
 if(!fields)return false;
 const field=direction>0?fields[0]:fields[fields.length-1];
 const path=[...editor.path,{index:nodeIndex,field}];
 const child=node.parts[field];
 setPosition(editor,path,direction>0?0:child.length);
 return true;
}
function navigate(editor,key){
 const seq=locate(editor);
 if(key==='LEFT'){
  if(editor.offset>0){
   const previous=editor.offset-1;
   if(enter(editor,previous,-1))return true;
   editor.offset--;return true;
  }
  return moveField(editor,-1);
 }
 if(key==='RIGHT'){
  if(editor.offset<seq.length){
   const next=editor.offset;
   if(enter(editor,next,1))return true;
   editor.offset++;return true;
  }
  return moveField(editor,1);
 }
 if(key!=='UP'&&key!=='DOWN')return false;
 // Seek the nearest ancestor with a vertical edit field, preserving all
 // siblings and deeper children while switching to numerator/denominator.
 for(let depth=editor.path.length-1;depth>=0;depth--){
  const step=editor.path[depth],parent=editor.path.slice(0,depth);
  let parentSeq=editor.root;
  for(const part of parent)parentSeq=parentSeq[part.index].parts[part.field];
  const node=parentSeq[step.index];
  let field=null;
  if(node.type==='fraction'||node.type==='mixed'){
   field=key==='UP'?'numerator':'denominator';
  }else if(node.type==='nthRoot'){
   field=key==='UP'?'index':'radicand';
  }else if(node.type==='logBase'){
   field=key==='UP'?'base':'argument';
  }
  if(field&&field!==step.field){
   const target=[...parent,{index:step.index,field}];
   setPosition(editor,target,Math.min(editor.offset,node.parts[field].length));
   return true;
  }
 }
 return false;
}
function backspace(editor){
 const seq=locate(editor);
 if(editor.offset>0){
  const index=editor.offset-1;
  if(seq[index].type==='char'){
   snapshot(editor);
   seq.splice(index,1);editor.offset--;return true;
  }
  // A full expression node cannot be erased with a single DEL: position the
  // caret inside it so the student can edit its child without losing content.
  return enter(editor,index,-1);
 }
 if(editor.path.length){
  const last=editor.path[editor.path.length-1],parent=editor.path.slice(0,-1);
  let parentSeq=editor.root;
  for(const step of parent)parentSeq=parentSeq[step.index].parts[step.field];
  const node=parentSeq[last.index],fields=FIELDS[node.type];
  if(node.type==='fraction'&&last.field==='denominator'&&
     node.parts.denominator.length===0&&node.parts.numerator.length>0){
   // A numerator captured by FRAC must survive if the user cancels the empty
   // denominator. Restore the exact original expression nodes.
   const numerator=node.parts.numerator;
   snapshot(editor);
   parentSeq.splice(last.index,1,...numerator);
   setPosition(editor,parent,last.index+numerator.length);
   return true;
  }
  if(fields&&fields.every(field=>node.parts[field].length===0)){
   snapshot(editor);
   parentSeq.splice(last.index,1);
   setPosition(editor,parent,last.index);
   return true;
  }
  return moveField(editor,-1);
 }
 return false;
}
function fromString(text){
 const ed=create();insert(ed,String(text||''));return ed;
}
function cursor(editor){return {path:editor.path.map(x=>({...x})),offset:editor.offset}}
function fieldText(editor){return locate(editor).map(node=>nodeText(node,false)).join('')}
function isComplete(editor){try{serialize(editor,true);return true}catch{return false}}
const api=Object.freeze({create,fromString,serialize,insert,template,navigate,backspace,cursor,fieldText,isComplete,
 undo,incorporate,types:Object.freeze(Object.keys(FIELDS))});
global.FreshStructured=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
