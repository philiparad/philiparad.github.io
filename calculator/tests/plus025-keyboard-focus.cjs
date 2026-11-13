#!/usr/bin/env node
/* PLUS-025: focus-safe PC keyboard routing, modifiers, browser controls.
 * Source-level routing tests; browser/Playwright event and focus parity open.
 */
'use strict';
const A=require('node:assert/strict');
const K=require('../js/keyboard.js');
const state={mode:'COMP',screen:'edit',math:true};
let checks=0;
function target(kind){
 return {closest(selector){
  if(kind==='editor'&&selector.includes('input,'))return {};
  if(kind==='control'&&selector==='button:not([data-key])')return {};
  if(kind==='key'&&selector==='[data-key]')return {};
  if(kind==='face'&&selector==='#face')return {};
  return null;
 }};
}
function event(key,kind='face',extras={}){
 return {key,target:target(kind),preventDefault(){this.prevented=true},...extras};
}
function ignored(key,kind='document',extras={},context=state){
 A.equal(K.translate(event(key,kind,extras),context),null,key+' / '+kind);
 checks++;
}
function keys(key,expected,kind='face',extras={},context=state){
 const result=K.translate(event(key,kind,extras),context);
 A.ok(result,'missing '+key+' / '+kind);
 A.deepEqual(result.keys,expected,key+' / '+kind);checks++;
}
for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home',
 'F1','F2','F3','F4','Backspace','Delete','Escape','Enter','1','+',' '])
 ignored(key,'document');
for(const key of ['ArrowDown','Home','F3','Backspace','1',' '])
 ignored(key,'editor');
for(const key of ['F1','Home','ArrowDown','Backspace','Enter'])
 ignored(key,'control');
ignored('Enter','key');
ignored(' ','key');
ignored('Tab','face');
ignored('Tab','face',{shiftKey:true});
ignored('F3','face',{shiftKey:true});
ignored('ArrowUp','face',{shiftKey:true});
ignored('F4','face',{altKey:true});
ignored('F1','face',{ctrlKey:true});
ignored('Meta','face',{metaKey:true});
ignored('Process','face');
ignored('x','face',{isComposing:true});
keys('ArrowUp',['UP']);
keys('ArrowDown',['DOWN']);
keys('ArrowLeft',['LEFT']);
keys('ArrowRight',['RIGHT']);
keys('Home',['MODE']);
keys('F1',['SHIFT']);
keys('F2',['ALPHA']);
keys('F3',['MODE']);
keys('F4',['ON']);
keys('Backspace',['DEL']);
keys('Delete',['DEL']);
keys('Enter',['EQUAL']);
keys('NumpadEnter',['EQUAL']);
keys('Escape',['AC']);
keys(' ',['AC']);
keys('+',['ADD'],'face',{shiftKey:true});
keys('*',['MUL'],'face',{shiftKey:true});
keys('(',['LP'],'face',{shiftKey:true});
keys(')', ['RP'],'face',{shiftKey:true});
keys('1',['1']);
keys('a',['TEXT:A'],'face',{}, {mode:'BASE-N',screen:'edit',math:false});
keys('i',['TEXT:i'],'face',{}, {mode:'CMPLX',screen:'edit',math:true});
ignored('a','face',{},state);
ignored('F2','document',{shiftKey:true});
let count=0,prevented=0;
const send=(key,kind,extras={},context=state,capture)=>K.dispatch(
 event(key,kind,{...extras,preventDefault(){prevented++}}),context,
 ()=>{count++},capture);
A.equal(send('ArrowDown','document'),false);checks++;
A.equal(send('ArrowDown','face'),true);checks++;
A.equal(count,1);checks++;
A.equal(prevented,1);checks++;
A.equal(send('c','face',{ctrlKey:true},state,()=>false),false);checks++;
A.equal(send('c','face',{ctrlKey:true},state,()=>true),true);checks++;
A.equal(count,1);checks++;
A.equal(prevented,2);checks++;
A.equal(send('z','face',{ctrlKey:true}),true);checks++;
A.equal(count,2);checks++;
A.equal(send('z','document',{ctrlKey:true}),false);checks++;
A.equal(send('c','control',{ctrlKey:true}),false);checks++;
console.log('PLUS-025 PASS: '+checks+' keyboard focus, browser shortcut, modifier and dispatch contracts (unit-only)');
