/* REA-009: independent structured textbook expression editor.
 * No eval, browser dialogs, React or NodeJS. Editable slots form a tree.
 * The mathematical expression is serialized only for the calculation engine.
 */
(function(global){'use strict';
const FIELDS={fraction:['numerator','denominator'],
 mixed:['integer','numerator','denominator'],
 power:['exponent'],squareRoot:['radicand'],
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
  case 'squareRoot':return 'sqrt('+get('radicand')+')';
  case 'cubeRoot':return 'cbrt('+get('radicand')+')';
  case 'nthRoot':return '(('+get('radicand')+')^(1/('+get('index')+')))';
 }
 throw Error('Unknown expression node '+node.type);
}
function serialize(editor,strict=false){return editor.root.map(node=>nodeText(node,strict)).join('')}
function insert(editor,text){
 if(!text)return;
 const seq=locate(editor);
 const nodes=Array.from(String(text),value=>({type:'char',value}));
 seq.splice(editor.offset,0,...nodes);
 editor.offset+=nodes.length;
}
function template(editor,type){
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
 seq.splice(position,0,node);
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
function navigate(editor,key){
 const seq=locate(editor);
 if(key==='LEFT'){
  if(editor.offset>0){editor.offset--;return true}
  return moveField(editor,-1);
 }
 if(key==='RIGHT'){
  if(editor.offset<seq.length){editor.offset++;return true}
  return moveField(editor,1);
 }
 if(!editor.path.length)return false;
 const step=editor.path[editor.path.length-1];
 const parent=editor.path.slice(0,-1);
 let sequence=editor.root;
 for(const ref of parent)sequence=sequence[ref.index].parts[ref.field];
 const node=sequence[step.index];
 if(node.type==='fraction'||node.type==='mixed'){
  if(key==='UP'){
   const field=node.type==='fraction'?'numerator':'numerator';
   setPosition(editor,[...parent,{index:step.index,field}],node.parts[field].length);
   return true;
  }
  if(key==='DOWN'){
   setPosition(editor,[...parent,{index:step.index,field:'denominator'}],
    node.parts.denominator.length);
   return true;
  }
 }
 if(node.type==='nthRoot'&&(key==='UP'||key==='DOWN')){
  const field=key==='UP'?'index':'radicand';
  setPosition(editor,[...parent,{index:step.index,field}],node.parts[field].length);
  return true;
 }
 return false;
}
function backspace(editor){
 const seq=locate(editor);
 if(editor.offset>0){seq.splice(editor.offset-1,1);editor.offset--;return}
 if(editor.path.length){
  const last=editor.path[editor.path.length-1],parent=editor.path.slice(0,-1);
  let p=editor.root;
  for(const step of parent)p=p[step.index].parts[step.field];
  const node=p[last.index];
  const filled=Object.values(node.parts).some(items=>items.length);
  if(!filled){
   p.splice(last.index,1);
   setPosition(editor,parent,last.index);
  }else moveField(editor,-1);
 }
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
