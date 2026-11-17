/* PERF-009: incremental KeyLog DOM regression (Node.js, no browser dependency).
 * Run from calculator/: node tests/perf009-keylog-dom.cjs
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const from=source.indexOf('const keylogView={selected:new Set(),anchor:-1,size:19};');
const until=source.indexOf('function selectedKeyTrace(){',from);
assert.ok(from>=0&&until>from,'KeyLog rendering implementation missing');
class Element{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.dataset={};this.listeners={};
  this.style={setProperty(){}};this.attributes={};this.parent=null;this._text='';
 }
 get firstElementChild(){return this.children[0]||null}
 get lastElementChild(){return this.children.at(-1)||null}
 get textContent(){return this._text}
 set textContent(value){this._text=String(value);this.children=[]}
 append(child){
  if(child.tag==='fragment'){for(const entry of [...child.children])this.append(entry);return}
  this.children.push(child);child.parent=this;
 }
 remove(){
  if(!this.parent)return;
  const at=this.parent.children.indexOf(this);
  if(at>=0)this.parent.children.splice(at,1);
 }
 setAttribute(key,value){this.attributes[key]=String(value)}
 addEventListener(key,handler){this.listeners[key]=handler}
 click(modifiers={}){this.listeners.click?.({
  shiftKey:false,ctrlKey:false,metaKey:false,...modifiers
 })}
}
const elements={'keylog-list':new Element(),'keylog-count':new Element(),
 'record-keylog':new Element()};
const document={createElement:tag=>new Element(tag),
 createDocumentFragment:()=>new Element('fragment')};
const state={recording:true,keylog:[]};
const Teaching={formattedEntries(entries){
 return entries.map((entry,index)=>({index,display:entry.key}));
}};
const api=new Function('state','document','Teaching','maxEntries','$',
 source.slice(from,until)+'return {renderKeylog,keylogView};')(
 state,document,Teaching,300,id=>elements[id]);
const list=elements['keylog-list'];
function add(key){
 state.keylog.push({key:String(key)});
 if(state.keylog.length>300)state.keylog.shift();
 api.renderKeylog();
}
add(1);add(2);add(3);
const second=list.children[1],third=list.children[2];
second.firstElementChild.click();
assert.ok(api.keylogView.selected.has(1),'selection before shifting');
add(4);
assert.equal(list.children[1],second,'append retains prior node');
assert.equal(list.children[2],third,'append retains all existing nodes');
for(let key=5;key<=300;key++)add(key);
assert.equal(list.children.length,300);
assert.equal(list.children[1],second,'repeated appends retain node');
add(301);
assert.equal(list.children.length,300);
assert.equal(list.children[0],second,'eviction retains shifted nodes');
assert.equal(second.firstElementChild.dataset.index,'0');
assert.equal(second.firstElementChild.attributes['aria-label'],'Select key 1: 2');
second.firstElementChild.click();
assert.ok(api.keylogView.selected.has(0),'click uses shifted index');
const last=list.lastElementChild;
api.renderKeylog();
assert.equal(list.lastElementChild,last,'unchanged render preserves nodes');
state.keylog=[];api.renderKeylog();
assert.equal(list.children.length,0,'clear removes entries');
add('new');
assert.equal(list.children.length,1);
assert.equal(list.children[0].firstElementChild.textContent,'new');
console.log('PERF-009 PASS: append, eviction, selection, unchanged render and clear');
