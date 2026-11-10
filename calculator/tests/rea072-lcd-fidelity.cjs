/* REA-072: source-renderer glyph, indicator, LCD menu and viewport regression.
 * Usage: node calculator/tests/rea072-lcd-fidelity.cjs
 * The 96x31 raster is a WEB baseline, not measured CASIO hardware geometry.
 */
'use strict';
const assert=require('node:assert/strict');
const LCD=require('../js/display.js');
const FLAGS=require('../js/lcd-indicators.js');
const VIEW=require('../js/lcd-viewport.js');
const SETUP=require('../js/setup.js');
const MENU=require('../js/menu-model.js');
let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++};
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++};
const base={power:true,mode:'COMP',model:'fx-991es-plus-c',
 screen:'edit',angle:'DEG',format:'Norm1',math:true,editor:null,
 input:'',cursor:0,result:'',info:'',viewport:{inputX:0,inputY:0,resultX:0,flowX:0},
 menu:[],menuEntries:[],outputLines:[],history:[],memory:{M:0}};
const pixels=(update={})=>LCD.rasterize({...base,...update});
const count=(p,x0=0,y0=0,x1=LCD.width,y1=LCD.height)=>{
 let sum=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)sum+=p[y*LCD.width+x];return sum;
};
const fingerprint=p=>Array.from(p).join('');
eq([LCD.width,LCD.height],[96,31],'web-owned LCD matrix');
ok(pixels().length===96*31,'bit count');
ok(count(pixels({power:false,input:'999',pendingMemory:'STO',screen:'menu'}))===0,'OFF clears every LCD dot');
for(const c of 'abcdefghijklmnopqrstuvwxyz'){
 const lower=LCD.FONT[c],upper=LCD.FONT[c.toUpperCase()];
 ok(Array.isArray(lower)&&lower.length===5&&lower.every(row=>/^[01]{3}$/.test(row)),
   'lowercase glyph defined '+c);
 ok(JSON.stringify(lower)!==JSON.stringify(upper),'lowercase differs from uppercase '+c);
}
for(const c of ['θ','∠','Σ','∫','√','×','≤','≥','≠','′','″','∂']){
 const glyph=LCD.FONT[c];
 ok(Array.isArray(glyph)&&glyph.length===5,'math glyph '+c);
}
const text=(input)=>pixels({screen:'edit',input,cursor:input.length});
ok(fingerprint(text('sin'))!==fingerprint(text('SIN')),'lowercase function is legible');
ok(fingerprint(text('e'))!==fingerprint(text('E')),'constant e distinguishable from register E');
const a=pixels({screen:'menu',menuKind:'mode',menuPage:0,menuPageSize:8,
 menuTitle:'MODE',menuEntries:MENU.modeEntries('fx-991es-plus-c'),
 menu:MENU.modeEntries('fx-991es-plus-c').slice(0,8).map(x=>({number:x.key,label:x.label}))});
const b=pixels({screen:'menu',menuKind:'mode',menuPage:1,menuPageSize:8,
 menuTitle:'MODE',menuEntries:MENU.modeEntries('fx-991es-plus-c'),
 menu:MENU.modeEntries('fx-991es-plus-c').slice(8).map(x=>({number:x.key,label:x.label}))});
ok(count(a,89,1,96,4)>0,'MODE page 1 right arrow');
ok(count(b,84,1,89,4)>0,'MODE page 2 left arrow');
ok(fingerprint(a)!==fingerprint(b),'MODE pages have distinct glyph content');
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 const menu=SETUP.entries(model);
 const grid=pixels({model,screen:'menu',menuKind:'setup',menuPage:1,menuPageSize:8,
  menuTitle:'SETUP',menuEntries:menu,
  menu:menu.slice(8).map(x=>({number:x.key,label:x.label}))});
 ok(count(grid)>0,'SETUP page 2 for '+model);
 const mem=pixels({model,pendingMemory:'STO'});
 ok(count(mem)>0,'STO LCD for '+model);
 const original=model==='fx-991es';
 const gridBottom=count(mem,0,23,96,31);
 ok(original?gridBottom<20:gridBottom>20,'E/F memory grid only for PLUS '+model);
}
eq(FLAGS.derive({...base,power:false}),{
 shift:'',alpha:'',memory:'',pending:'',mode:'',angle:'',format:'',math:'',replay:'',disp:''
},'OFF clears annunciators');
eq(FLAGS.derive({...base,shift:true,alpha:false,pendingMemory:'STO',memory:{M:4}}).memory,
 'M','M annunciator with nonzero independent memory');
eq(FLAGS.derive({...base,shift:true,alpha:false,pendingMemory:'STO',memory:{M:4}}).pending,
 'STO','STO annunciator');
eq(FLAGS.derive({...base,screen:'menu',menuPage:0,menuPageSize:8,
 menuEntries:MENU.modeEntries('fx-991es-plus-c')}).replay,'▼','MODE next-page indicator');
eq(FLAGS.derive({...base,screen:'menu',menuPage:1,menuPageSize:8,
 menuEntries:MENU.modeEntries('fx-991es-plus-c')}).replay,'▲','MODE previous-page indicator');
for(const s of ['', '1234', '1234567890123456789012345678901234567890']){
 const v=VIEW.linearWindow(s,s.length);
 ok(v.start>=0&&v.end>=v.start,'nonnegative viewport '+s.length);
 ok(v.end-v.start===23,'bounded text window '+s.length);
}
const w=VIEW.scrollLine(['012345678901234567890123456789','end'],0,5,23);
eq(w.lines[0],'56789012345678901234567','flow row horizontal scroll');
ok(w.left&&w.right,'flow overflow arrows');
console.log('REA-072 PASS '+checks+' renderer/glyph/annunciator/viewport checks. Hardware parity NOT tested.');
