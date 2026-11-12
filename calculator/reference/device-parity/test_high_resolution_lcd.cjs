'use strict';
// Structural tests: doubled logical LCD pixels with a *new*, detailed
// 7x11 font, rather than CSS/enlargement of the former 3x5 characters.
const assert=require('node:assert/strict');
const LCD=require('../../js/display.js');
assert.equal(LCD.width,192);
assert.equal(LCD.height,62);
assert.equal(LCD.layoutWidth,96);
assert.equal(LCD.layoutHeight,31);
assert.equal(LCD.fontWidth,7);
assert.equal(LCD.fontHeight,11);
const render=(text)=>LCD.rasterize({power:true,mode:'COMP',screen:'edit',
 input:text,cursor:text.length,math:false});
const blank=render('');
assert.equal(blank.length,192*62);
const all=(array)=>Array.from(array).reduce((sum,bit)=>sum+bit,0);
assert.ok(all(render('M'))>all(blank),'font ink must be present');
for(const glyph of ['0','1','2','3','4','5','6','7','8','9','A','a','M','m','X','x','÷','π','√']){
 const image=render(glyph);
 assert.equal(image.length,192*62);
 assert.ok(all(image)>all(blank),glyph+' renders');
}
assert.notDeepEqual(Array.from(render('A')),Array.from(render('a')),'case is distinct');
assert.notDeepEqual(Array.from(render('0')),Array.from(render('8')),'digits are distinct');
// A purely doubled 3x5 image has constant 2x2 blocks. Real 7x11
// bitmaps must contain at least some distinct adjacent pixel pairs.
const output=render('Wm7');
let fineDetail=false;
for(let y=12;y<35;y++)for(let x=0;x<55;x+=2){
 if(output[y*192+x]!==output[y*192+x+1])fineDetail=true;
}
assert.ok(fineDetail,'font has independent fine-resolution pixels');
// Exactly one canvas refresh draws a 960x310 backing store; CSS controls
// its visible physical size, not its drawing precision.
let imageData=null;
const ctx={
 createImageData(width,height){assert.equal(width,960);assert.equal(height,310);
  return {width,height,data:new Uint8ClampedArray(width*height*4)};},
 putImageData(image){imageData=image;}
};
const canvas={width:0,height:0,getContext:()=>ctx};
LCD.draw(canvas,{power:true,mode:'COMP',screen:'result',input:'2+3',result:'5'});
assert.equal(canvas.width,960);
assert.equal(canvas.height,310);
assert.ok(imageData);
assert.equal(imageData.data.length,960*310*4);
console.log('192x62 LCD and 7x11 high-resolution font tests passed');
