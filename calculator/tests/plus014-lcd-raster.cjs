#!/usr/bin/env node
/* PLUS-014: deterministic LCD raster and annunciator contracts.
 * Golden device bitmaps are deliberately NOT claimed: no captured device
 * frames have been supplied for fx-991ES PLUS (2nd edition).
 */
'use strict';
const assert=require('node:assert/strict');
const LCD=require('../js/display.js');
const Indicators=require('../js/lcd-indicators.js');
const WIDTH=192,HEIGHT=62;
assert.equal(LCD.layoutWidth,96);
assert.equal(LCD.layoutHeight,31);
assert.equal(LCD.width,WIDTH);
assert.equal(LCD.height,HEIGHT);
assert.equal(LCD.fontWidth,7);
assert.equal(LCD.fontHeight,11);
const frame=s=>{
  const pixels=LCD.rasterize(s);
  assert.ok(pixels instanceof Uint8Array);
  assert.equal(pixels.length,WIDTH*HEIGHT);
  assert.ok(pixels.every(v=>v===0||v===1),'monochrome logical raster');
  assert.deepEqual(pixels,LCD.rasterize(s),'deterministic raster');
  return pixels;
};
const count=p=>p.reduce((n,v)=>n+v,0);
const blank=frame({power:false});
assert.equal(count(blank),0,'OFF must have no ink');
const ready=frame({power:true,mode:'COMP',screen:'edit',input:'',cursor:0});
assert.ok(count(ready)>0,'editing cursor must be visible');
const result=frame({power:true,mode:'COMP',screen:'result',input:'1+2',result:'3'});
assert.ok(count(result)>count(blank));
const overflow=frame({power:true,mode:'COMP',screen:'result',
  input:'1234567890'.repeat(10),result:'9'.repeat(80),viewport:{inputX:400,resultX:20}});
assert.equal(overflow.length,WIDTH*HEIGHT,'long text stays clipped to viewport');
for(const msg of ['Math ERROR','Syntax ERROR','Variable ERROR','Argument ERROR']){
  assert.ok(count(frame({power:true,mode:'COMP',screen:'error',error:msg}))>0);
}
for(const ch of ['0','1','A','a','π','√','θ','∑','∫','∞','≠','≤','≥','×','÷','↑','↓']){
  const glyph=LCD.highFont[ch]||LCD.FONT[ch];
  assert.ok(glyph,'glyph not defined: '+ch);
}
assert.notDeepEqual([...LCD.highFont.A],[...LCD.highFont.a],'glyph case must remain distinct');
const base={power:true,screen:'edit',mode:'COMP',angle:'DEG',math:true,
  format:'Norm',memory:{M:0},history:[],storedInputs:[]};
assert.equal(Indicators.derive({...base,power:false}).angle,'');
assert.equal(Indicators.derive({...base,shift:true}).shift,'S');
assert.equal(Indicators.derive({...base,alpha:true}).alpha,'A');
assert.equal(Indicators.derive({...base,memory:{M:7}}).memory,'M');
assert.equal(Indicators.derive({...base,angle:'RAD'}).angle,'R');
assert.equal(Indicators.derive({...base,angle:'GRA'}).angle,'G');
assert.equal(Indicators.derive({...base,format:'Fix'}).format,'FIX');
assert.equal(Indicators.derive({...base,format:'Sci'}).format,'SCI');
assert.equal(Indicators.derive({...base,mode:'MATRIX'}).mode,'MAT');
assert.equal(Indicators.derive({...base,mode:'VECTOR'}).mode,'VCT');
assert.equal(Indicators.derive({...base,mode:'STAT'}).math,'');
assert.equal(Indicators.derive({...base,screen:'intermediate'}).disp,'Disp');
const targets={};
const rendered=Indicators.render({...base,shift:true},id=>targets[id]||(targets[id]={textContent:''}));
assert.equal(targets['lcd-shift'].textContent,'S');
assert.deepEqual(rendered,Indicators.derive({...base,shift:true}));
console.log('PLUS-014 PASS: LCD dimensions, deterministic raster, glyphs, clipping and status indicators (simulation-only)');
