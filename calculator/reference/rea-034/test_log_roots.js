/* REA-034: log-base, nth-root and cube-root structured input regression. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
const E=require('../../js/structured-editor.js');
const V=require('../../js/lcd-viewport.js');
const LCD=require('../../js/display.js');
let checked=0;
function near(actual,want,label){assert.ok(Math.abs(actual-want)<=1e-10*Math.max(1,Math.abs(want)),label+': '+actual+' != '+want);checked++}
for(const [source,want]of [
 ['log(2,8)',3],['log(10,100)',2],['log(100,10000)',2],
 ['log(.5,8)',-3],['log(2,1)',0],['log(8,2)',1/3],
 ['log(2,8)+log(3,9)',5],['log(4,2^5)',2.5],
 ['log(100)',2],['ln(1)',0],
 ['nthroot(3,27)',3],['nthroot(3,-27)',-3],['nthroot(5,-32)',-2],
 ['nthroot(2,16)',4],['nthroot(2,0)',0],
 ['nthroot(3,0)',0],['nthroot(-3,-8)',-.5],['nthroot(-2,16)',.25],
 ['nthroot(3,125)+2',7],['nthroot(3,nthroot(3,512))',2],
 ['cbrt(27)',3],['cbrt(-8)',-2],['cbrt(0)',0],['cbrt(1/8)',.5],
 ['sqrt(81)',9],['sqrt(0)',0]
])near(M.evaluate(source),want,source);
for(const source of [
 'log(1,8)','log(0,8)','log(-2,8)','log(2,-8)',
 'log(2,0)','log(1,1)','ln(-1)','log(-1)',
 'nthroot(0,8)','nthroot(2,-16)','nthroot(4,-16)',
 'nthroot(2.5,-32)','nthroot(-2,0)','sqrt(-1)'
]){
 assert.throws(()=>M.evaluate(source),/Math ERROR/,source);checked++;
}
const cfg={
 logBase:{first:'2',second:'8',source:'log(2,8)',firstField:'base',secondField:'argument',value:3},
 nthRoot:{first:'3',second:'-27',source:'nthroot(3,-27)',firstField:'index',secondField:'radicand',value:-3}
};
for(const [type,spec]of Object.entries(cfg)){
 const editor=E.create();E.template(editor,type);
 assert.equal(editor.path[0].field,spec.firstField);checked++;
 assert.equal(E.isComplete(editor),false);checked++;
 E.insert(editor,spec.first);
 assert.equal(E.navigate(editor,'RIGHT'),true);checked++;
 assert.equal(editor.path[0].field,spec.secondField);checked++;
 E.insert(editor,spec.second);
 assert.equal(E.serialize(editor,true),spec.source);checked++;
 near(M.evaluate(E.serialize(editor,true)),spec.value,type+' computed');
 const frame=V.layout(editor);
 assert.ok(frame.width>15&&frame.maxY>frame.minY);checked++;
 const pixels=LCD.rasterize({power:true,screen:'edit',math:true,mode:'COMP',editor,input:E.serialize(editor),viewport:{inputX:0,inputY:0,resultX:0},contrast:5});
 assert.ok(pixels.reduce((a,b)=>a+b,0)>30,type+' visible');checked++;
 assert.equal(E.navigate(editor,'UP'),true);checked++;
 assert.equal(editor.path[0].field,spec.firstField);checked++;
 assert.equal(E.navigate(editor,'DOWN'),true);checked++;
 assert.equal(editor.path[0].field,spec.secondField);checked++;
 for(let steps=0;editor.path.length&&steps<20;steps++)E.navigate(editor,'RIGHT');
 assert.equal(editor.path.length,0);checked++;
}
const c=E.create();E.template(c,'cubeRoot');
assert.equal(c.path[0].field,'radicand');checked++;
E.insert(c,'-8');assert.equal(E.serialize(c,true),'cbrt(-8)');checked++;
near(M.evaluate(E.serialize(c,true)),-2,'cube root template');
const cpx=LCD.rasterize({power:true,screen:'edit',math:true,mode:'COMP',editor:c,input:E.serialize(c),viewport:{inputX:0,inputY:0,resultX:0},contrast:5});
assert.ok(cpx.reduce((a,b)=>a+b,0)>20);checked++;
console.log('REA-034: '+checked+' log-root/template assertions passed');
