/* REA-039: memory/register workflow and persistence regression (Node, no browser required). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'fx991_fresh_standalone.html'),'utf8');
const fakeElement=()=>({
 hidden:true,value:'',textContent:'',classList:{toggle(){},add(){},remove(){}},
 setAttribute(){},getAttribute(){return null},addEventListener(){},appendChild(){},append(){},
 querySelector:()=>({dataset:{key:'1'}}),querySelectorAll:()=>[],
 getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},drawImage(){}}),
 dataset:{key:'1'},style:{setProperty(){}},width:768,height:248
});
const elements={};
const get=id=>elements[id]||(elements[id]=fakeElement());
const document={
 getElementById:get,querySelector:()=>fakeElement(),querySelectorAll:()=>[],
 addEventListener(){},createElement:()=>fakeElement(),createDocumentFragment:()=>fakeElement()
};
const window={document,location:{search:''},navigator:{}};
const context=vm.createContext({window,document,location:window.location,navigator:window.navigator,
 URLSearchParams,structuredClone,Uint8ClampedArray,BigInt});
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .filter(m=>!m[0].slice(0,m[0].indexOf('>')+1).includes('application/json'));
for(const script of scripts){
 vm.runInContext(script[1],context);
 if(window.FreshKeypad&&!window.FreshKeypad.__mock){
  window.FreshKeypad=Object.freeze({...window.FreshKeypad,mount(){},__mock:true});
 }
}
const C=window.FreshCalculator;
assert.ok(C,'calculator exists');
let n=0;
const eq=(actual,want,message)=>{assert.equal(actual,want,message);n++};
const ok=(condition,message)=>{assert.ok(condition,message);n++};
const state=()=>C.getState();
const press=(...keys)=>keys.forEach(k=>C.press(k));
const load=expression=>C.loadExpression(expression);
const calc=expression=>{load(expression);press('EQUAL');return state()};
const clearInput=()=>press('AC');
eq(scripts.length,21,'all scripts loaded');
load('3+5');press('SHIFT','RCL');
eq(state().pendingMemory,'STO','STO pending');
eq(window.FreshIndicators.derive(state()).pending,'STO','STO visible on LCD');
press('NEG');
eq(state().memory.A,8,'store expression to A');
eq(state().ans,8,'STO calculation updates Ans');
eq(state().screen,'result','STO result shown');
clearInput();press('RCL');eq(state().pendingMemory,'RCL','RCL pending');
eq(window.FreshIndicators.derive(state()).pending,'RCL','RCL annunciator');
press('NEG');
eq(state().raw,8,'recall A');
eq(state().ans,8,'recall updates Ans');
eq(calc('A*10').raw,80,'stored A used in expression');
clearInput();load('10*5');press('MPLUS');
eq(state().memory.M,50,'M+ evaluates current expression');
eq(state().ans,50,'M+ result becomes Ans');
eq(window.FreshIndicators.derive(state()).memory,'M','nonzero M flag');
load('10+5');press('SHIFT','MPLUS');
eq(state().memory.M,35,'M− evaluates pending expression');
eq(state().ans,15,'M− displays operand');
clearInput();press('RCL','MPLUS');
eq(state().raw,35,'recall M');
eq(calc('M+5').raw,40,'M register usable in expressions');
clearInput();load('0');press('SHIFT','RCL','MPLUS');
eq(state().memory.M,0,'STO 0 clears M');
eq(window.FreshIndicators.derive(state()).memory,'','zero clears M annunciator');
for(const [key,variable,value]of [
 ['NEG','A',3],['DMS','B',4],['HYP','C',5],['SIN','D',6],
 ['COS','E',7],['TAN','F',8],['LP','X',9],['RP','Y',10],['MPLUS','M',11]
]){
 load(String(value));press('SHIFT','RCL',key);
 eq(state().memory[variable],value,'STO '+variable);
 clearInput();press('RCL',key);
 eq(state().raw,value,'RCL '+variable);
}
clearInput();press('RCL');press('AC');
eq(state().pendingMemory,null,'AC cancels standby');
clearInput();press('SHIFT','RCL','AC');
eq(state().pendingMemory,null,'AC cancels STO');
eq(state().memory.A,3,'cancel leaves register intact');
clearInput();load('1/0');press('SHIFT','RCL','NEG');
eq(state().screen,'error','invalid STO displays error');
eq(state().memory.A,3,'invalid STO cannot overwrite A');
press('AC');
calc('123');
const beforeAC={...state().memory};
const ans=state().ans,preAns=state().preAns;
press('AC');
eq(state().ans,ans,'Ans retained by AC');
eq(state().preAns,preAns,'PreAns retained by AC');
for(const k of Object.keys(beforeAC))eq(state().memory[k],beforeAC[k],'AC retains '+k);
press('SHIFT','AC');eq(state().power,false,'SHIFT+AC turns off');
press('ON');eq(state().power,true,'ON turns on');
eq(state().memory.B,beforeAC.B,'power-off retains register B');
eq(state().ans,ans,'power-off retains Ans');
calc('222');eq(state().preAns,123,'PreAns previous result before mode change');
press('MODE');eq(state().screen,'menu','MODE menu');
press('2');eq(state().mode,'CMPLX','changed away from COMP');
eq(state().preAns,0,'leaving COMP clears PreAns');
eq(state().memory.A,3,'mode change retains A');
eq(state().ans,222,'mode change retains Ans');
press('AC','SHIFT','9','2');eq(state().menuTitle,'Clear Memory? = Yes, AC No','CLR Memory confirm');
press('AC');eq(state().memory.A,3,'CLR cancel preserves A');
press('SHIFT','9','2','EQUAL');
eq(state().memory.A,0,'confirmed CLR clears A');
eq(state().memory.M,0,'confirmed CLR clears M');
eq(state().ans,0,'confirmed CLR clears Ans');
eq(state().preAns,0,'confirmed CLR clears PreAns');
eq(state().screen,'edit','CLR exits menu');
eq(state().mode,'CMPLX','Memory clear preserves calculation mode');
press('MODE','1');eq(state().mode,'COMP','return to COMP');
calc('55');press('SHIFT','9','3');eq(state().menuTitle,'Clear All? = Yes, AC No','CLR All confirm');
press('EQUAL');eq(state().ans,0,'CLR All clears Ans');
eq(state().mode,'COMP','CLR All resets mode');
console.log('REA-039: '+n+' memory and register assertions passed');
