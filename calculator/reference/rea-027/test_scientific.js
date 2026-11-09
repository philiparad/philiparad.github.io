/* REA-027: scientific exponent entry and engineering notation regression. */
'use strict';
const assert=require('node:assert/strict');
const Rational=require('../../js/rational.js');
require('../../js/decimal-core.js');
const MathEngine=require('../../js/math-engine.js');
const Editor=require('../../js/structured-editor.js');
const View=require('../../js/lcd-viewport.js');
const LCD=require('../../js/display.js');
const Results=require('../../js/result-format.js');
let count=0;
const expected=[
 ['1.2E-3',0.0012],
 ['2E3',2000],
 ['7E+2',700],
 ['1.25E-8',1.25e-8],
 ['3E2+4',304],
 ['2*(1E3)',2000],
 ['1E-6/2',5e-7],
 ['3.5E2-50',300]
];
for(const [input,want] of expected){
 const actual=MathEngine.evaluate(input);
 assert.ok(Math.abs(actual-want)<=Math.max(1e-17,Math.abs(want)*1e-12),input);
 count++;
 const exact=Rational.evaluate(input);
 assert.ok(exact!==null,input+' exact parser');
 assert.ok(Math.abs(Rational.toNumber(exact)-want)<=Math.max(1e-17,Math.abs(want)*1e-12),input+' rational');
 count+=2;
}
const ed=Editor.create();
Editor.insert(ed,'1.2');
Editor.template(ed,'exp10');
assert.equal(Editor.serialize(ed,false),'1.2E?');count++;
assert.equal(ed.path[0].field,'exponent');count++;
assert.throws(()=>Editor.serialize(ed,true),/Syntax ERROR/);count++;
Editor.insert(ed,'-3');
assert.equal(Editor.serialize(ed,true),'1.2E-3');count++;
let location=View.follow(ed,{x:0,y:0});
assert.ok(location.frame.width>20&&location.frame.cursor.y<12);count++;
const inputPixels=LCD.rasterize({power:true,math:true,mode:'COMP',editor:ed,input:'1.2E-3',cursor:ed.offset,screen:'edit',result:'',viewport:{inputX:0,inputY:0,resultX:0},contrast:5,info:''});
assert.ok(inputPixels.reduce((a,b)=>a+b,0)>40);count++;
Editor.navigate(ed,'RIGHT');
assert.equal(ed.path.length,0);count++;
assert.equal(ed.offset,4);count++;
Editor.insert(ed,'+1');
assert.equal(Editor.serialize(ed,true),'1.2E-3+1');count++;
for(const [value,shift,want]of [
 [1234,0,'1.234×10^3'],
 [1234,-1,'1234×10^0'],
 [123,1,'0.123×10^3'],
 [123,2,'0.000123×10^6'],
 [123,3,'0.000000123×10^9'],
 [123,4,'0.000000000123×10^12'],
 [0,0,'0×10^0'],
 [-123,1,'-0.123×10^3'],
 [1.2e-5,2,'0.000012×10^0']
]){
 const result=Results.engineering(value,shift,{});
 assert.equal(result.text,want,value+' shift '+shift);
 assert.equal(result.exponent%3,0);
 assert.ok(Math.abs(result.mantissa*Math.pow(10,result.exponent)-value)<=Math.abs(value)*1e-12+1e-18);
 count+=3;
}
assert.equal(Results.engineering(123,60,null),null);count++;
assert.equal(Results.engineering(Infinity,0,{}),null);count++;
assert.equal(Results.engineering(123,1,{decimalSeparator:'comma'}).text,'0,123×10^3');count++;
console.log('REA-027: '+count+' exponent and engineering assertions passed');
