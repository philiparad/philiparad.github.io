/* REA-009: independent structured textbook expression editor.
 * No eval, browser dialogs, React or NodeJS. Editable slots form a tree.
 * The mathematical expression is serialized only for the calculation engine.
 */
(function(global){'use strict';
const FIELDS={fraction:['numerator','denominator'],
 mixed:['integer','numerator','denominator'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],squareRoot:['radicand'],
 cubeRoot:['radicand'],nthRoot:['index','radicand']};
function create(){return {root:[],path:[],offset:0,version:1}}
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
  case 'mixed':return '(('+get('integer')+')+(('+get('numerator')+')/('+get('denominator')+')))';
  case 'power':return '^('+get('exponent')+')';
  case 'exp10':return 'E'+get('exponent');
  case 'recurring':return 'RPT('+get('period')+')';
  case 'squareRoot':return 'sqrt('+get('radicand')+')';
  case 'cubeRoot':return 'cbrt('+get('radicand')+')';
  case 'nthRoot':return '(('+get('radicand')+')^(1/('+get('index')+')))';
 }
 throw Error('Unknown expression node '+node.type);
}
function serialize(editor,strict=false){return editor.root.map(node=>nodeText(node,strict)).join('')}
function insert(editor,text,overwrite=false){
 if(!text)return;
 const seq=locate(editor);
 for(const value of Array.from(String(text))){
  const char={type:'char',value};
  // Overwrite only plain characters inside the current field. Never replace
  // a formula node: discarding it would silently erase nested input.
  if(overwrite&&seq[editor.offset]?.type==='char')seq[editor.offset]=char;
  else seq.splice(editor.offset,0,char);
  editor.offset++;
 }
}
function template(editor,type,overwrite=false){
 const fields=FIELDS[type];
 if(!fields)throw Error('Unknown template '+type);
 const seq=locate(editor);
 const node={type,parts:Object.fromEntries(fields.map(field=>[field,[]]))};
 const before=editor.offset;
 if(type==='fraction'&&before>0){
  let at=before;
  while(at>0&&seq[at-1].type==='char'&&/[\d.]/.test(seq[at-1].value))at--;
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
  }
  if(field){
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
   parentSeq.splice(last.index,1,...numerator);
   setPosition(editor,parent,last.index+numerator.length);
   return true;
  }
  if(fields&&fields.every(field=>node.parts[field].length===0)){
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
 types:Object.freeze(Object.keys(FIELDS))});
global.FreshStructured=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
