/* REA-040 — Ans, PreAns, chaining and unified result transition tests. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../../fx991_fresh_standalone.html'),'utf8');
const element=()=>({
 hidden:true,value:'',textContent:'',
 classList:{toggle(){},add(){},remove(){}},
 setAttribute(){},getAttribute(){return null},addEventListener(){},
 appendChild(){},append(){},querySelector:()=>({dataset:{key:'1'}}),
 querySelectorAll:()=>[],
 getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData(){},drawImage(){}}),
 dataset:{key:'1'},style:{setProperty(){}},width:768,height:248
});
const elements={},get=id=>elements[id]||(elements[id]=element());
const document={getElementById:get,querySelector:()=>element(),querySelectorAll:()=>[],
 addEventListener(){},createElement:()=>element(),createDocumentFragment:()=>element()};
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
let checks=0;
function eq(actual,expected,label){assert.equal(actual,expected,label);checks++}
function near(actual,expected,label){
 assert.ok(Math.abs(actual-expected)<=1e-10*Math.max(1,Math.abs(expected)),label+': '+actual+' != '+expected);checks++;
}
function yes(condition,label){assert.ok(condition,label);checks++}
const state=()=>C.getState(),press=(...keys)=>keys.forEach(key=>C.press(key));
const calc=source=>{C.loadExpression(source);press('EQUAL');return state()};
const clear=()=>press('AC');
function flow(keys,values){
 press('AC',...keys);
 for(const value of values)press('TEXT:'+value,'EQUAL');
 return state();
}
eq(scripts.length,21,'standalone script count');
eq(state().ans,0,'initial Ans');
eq(state().preAns,0,'initial PreAns');
eq(calc('1').ans,1,'T1');
eq(calc('1').preAns,1,'T2 moves Ans to PreAns');
clear();press('ANS','ADD','ALPHA','ANS');
eq(state().input,'Ans+PreAns','physical PreAns mapping');
press('EQUAL');
eq(state().ans,2,'T3');
eq(state().preAns,1,'T3 preceding Ans');
press('EQUAL');
eq(state().ans,3,'T4 repeat expression with new memories');
eq(state().preAns,2,'T4 previous');
press('EQUAL');
eq(state().ans,5,'T5 repeat expression with new memories');
eq(state().preAns,3,'T5 previous');
eq(calc('3*4').ans,12,'start chaining example');
for(const [key,operator] of [['DIV','/'],['ADD','+'],['SUB','-'],['MUL','*']]){
 calc('12');
 const previous=state().ans;
 press(key);
 eq(state().input,'Ans'+operator,'operator '+key+' automatically inserts Ans');
 press('AC');
 eq(state().ans,previous,'AC keeps Ans after operator '+key);
}
calc('3*4');
press('DIV','3','0','EQUAL');
near(state().ans,0.4,'Ans÷30');
eq(state().preAns,12,'chained PreAns');
eq(state().input,'Ans/30','chained expression');
eq(calc('7').preAns,.4,'new expression updates PreAns');
eq(calc('1/0').screen,'error','error screen');
eq(state().ans,7,'error preserves Ans');
eq(state().preAns,.4,'error preserves PreAns');
press('AC');
eq(state().ans,7,'AC preserves Ans');
eq(state().preAns,.4,'AC preserves PreAns');
press('SHIFT','AC');
eq(state().power,false,'OFF state');
press('ON');
eq(state().ans,7,'power retained Ans');
eq(state().preAns,.4,'power retained PreAns');
const history=state().history.length;
eq(flow(['SHIFT','LOGBASE'],['X+1','1','5']).ans,20,'SUM -> Ans');
eq(state().preAns,7,'SUM -> PreAns');
eq(state().history.length,history+1,'SUM history');
near(flow(['SHIFT','INTEGRAL'],['3*X^2-5*X+2','2','1E-12']).ans,7,'derivative updates Ans');
eq(state().preAns,20,'derivative updates PreAns');
near(flow(['INTEGRAL'],['X','0','2','1E-7']).ans,2,'integral updates Ans');
near(state().preAns,7,'integral updates PreAns');
near(flow(['SHIFT','CALC'],['X^2=2','1']).ans,Math.SQRT2,'SOLVE updates Ans');
near(state().preAns,2,'SOLVE updates PreAns');
const beforeBad={ans:state().ans,preAns:state().preAns,history:state().history.length};
const bad=flow(['SHIFT','LOGBASE'],['X+1','5','1']);
eq(bad.screen,'prompt','failed flow remains editable');
eq(state().ans,beforeBad.ans,'failed flow leaves Ans intact');
eq(state().preAns,beforeBad.preAns,'failed flow leaves PreAns intact');
eq(state().history.length,beforeBad.history,'failed flow adds no history');
eq(calc('12').ans,12,'seed CALC');
clear();C.loadExpression('X^2+1');press('CALC','TEXT:X','EQUAL','TEXT:3','EQUAL');
eq(state().memory.X,3,'CALC stores X');
eq(state().ans,10,'CALC -> Ans');
eq(state().preAns,12,'CALC -> PreAns');
const old={ans:state().ans,preAns:state().preAns,X:state().memory.X};
clear();C.loadExpression('1/(X-2)');press('CALC','TEXT:X','EQUAL','TEXT:2','EQUAL');
eq(state().screen,'prompt','invalid CALC stays prompt');
eq(state().ans,old.ans,'invalid CALC preserves Ans');
eq(state().preAns,old.preAns,'invalid CALC preserves PreAns');
eq(state().memory.X,old.X,'invalid CALC does not commit X');
clear();
eq(calc('5').ans,5,'STO source');
press('SHIFT','RCL','NEG');
eq(state().memory.A,5,'STO A');
eq(state().ans,5,'STO not a second result');
eq(state().preAns,10,'STO does not shift PreAns twice');
press('AC','RCL','NEG');
eq(state().ans,5,'RCL A updates Ans');
eq(state().preAns,5,'RCL shifts previous Ans');
calc('3');press('MPLUS');
eq(state().memory.M,3,'M+ uses operand');
eq(state().ans,3,'M+ updates Ans');
eq(state().preAns,5,'M+ updates PreAns');
const fraction=calc('1/3'),prior=fraction.preAns;
press('SD');
eq(state().ans,fraction.ans,'S⇔D unchanged Ans');
eq(state().preAns,prior,'S⇔D unchanged PreAns');
press('AC');
eq(state().ans,fraction.ans,'AC still retains last');
press('MODE','2');
eq(state().mode,'CMPLX','switch away from COMP');
eq(state().preAns,0,'PreAns cleared leaving COMP');
eq(state().ans,fraction.ans,'Ans retained when leaving COMP');
press('AC','MODE','1');
eq(state().mode,'COMP','return to COMP');
eq(state().preAns,0,'PreAns not restored by reentering COMP');
calc('42');
const stats=flow(['MODE','3'],['1,2,3']);
eq(state().mode,'STAT','STAT mode selected');
eq(stats.ans,2,'STAT mean updates Ans');
eq(stats.preAns,0,'PreAns remains cleared outside COMP');
yes(stats.history.length>0,'advanced mode logs history');
console.log('REA-040: '+checks+' Ans/PreAns and chaining assertions passed');
