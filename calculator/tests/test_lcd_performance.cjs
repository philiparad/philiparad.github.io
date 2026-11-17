/* CAL-016: deterministic cache invalidation and LCD redraw regression.
 * This verifies reuse of the 960x310 RGBA allocation, and preserves exact
 * image bytes after text-only updates, geometry updates, contrast and resize.
 */
'use strict';
const assert=require('node:assert/strict');
const lcd=require('../js/display.js');
const enhanced=require('../js/lcd-enhanced.js');
function canvas(){
 const operations={allocations:0,uploads:0,history:[]};
 const ctx={
  createImageData(width,height){
   operations.allocations++;
   return {width,height,data:new Uint8ClampedArray(width*height*4)};
  },
  putImageData(image){
   operations.uploads++;
   operations.history.push(new Uint8ClampedArray(image.data));
  },
  save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},
  moveTo(){},lineTo(){},stroke(){},strokeRect(){},fillRect(){},
  bezierCurveTo(){},fillText(){},measureText(text){
   return {width:String(text).length*3.7};
  }
 };
 return {width:960,height:310,getContext(){return ctx},operations};
}
const state=(overrides={})=>({
 power:true,screen:'edit',mode:'COMP',math:true,contrast:5,
 input:'Ans',cursor:3,editor:{root:[],path:[],offset:0},
 viewport:{inputX:0,inputY:0,resultX:0},result:'',...overrides
});
const equalLast=(a,b)=>assert.deepEqual(Array.from(a),Array.from(b));
const surface=canvas();
const first=state();
const runs1={textRuns:[],vectorText:true};
lcd.draw(surface,first,runs1);
assert.ok(runs1.textRuns.some(run=>run.c==='A'));
assert.equal(surface.operations.allocations,1);
assert.equal(surface.operations.uploads,1);
const image1=surface.operations.history.at(-1);
// Text-only change: bitmap letters intentionally absent in vector mode.
const second=state({input:'8888',cursor:3});
const runs2={textRuns:[],vectorText:true};
lcd.draw(surface,second,runs2);
assert.equal(surface.operations.allocations,1,'same canvas reuses RGBA allocation');
assert.equal(surface.operations.uploads,2,'background restored on every repaint');
equalLast(image1,surface.operations.history.at(-1));
assert.ok(runs2.textRuns.some(run=>run.c==='8'),
 'fresh glyph layout is still recalculated when image is cached');
// A changed cursor/geometry must not reuse stale base pixels.
const changed=state({input:'8888',cursor:0});
lcd.draw(surface,changed,{textRuns:[],vectorText:true});
assert.equal(surface.operations.allocations,1);
assert.notDeepEqual(Array.from(surface.operations.history.at(-1)),Array.from(image1),
 'cursor geometry forces fresh image pixels');
// Contrast affects ink even if geometry is the same.
lcd.draw(surface,state({contrast:0}),{textRuns:[],vectorText:true});
assert.equal(surface.operations.allocations,1);
const contrastPixels=surface.operations.history.at(-1);
assert.notDeepEqual(Array.from(contrastPixels),Array.from(image1));
lcd.draw(surface,first,{textRuns:[],vectorText:true});
equalLast(surface.operations.history.at(-1),image1);
// Distinct canvases must not share mutable background buffers.
const independent=canvas();
lcd.draw(independent,first,{textRuns:[],vectorText:true});
assert.equal(independent.operations.allocations,1);
equalLast(independent.operations.history.at(-1),image1);
// Resize invalidates prior backing image even if the logical pixels match.
surface.width=700;
lcd.draw(surface,first,{textRuns:[],vectorText:true});
assert.equal(surface.width,960);
assert.equal(surface.operations.allocations,2);
equalLast(surface.operations.history.at(-1),image1);
// Full authentic bitmap renders use the same optimization without changing it.
const authenticCanvas=canvas();
lcd.draw(authenticCanvas,first);
lcd.draw(authenticCanvas,first);
assert.equal(authenticCanvas.operations.allocations,1);
assert.equal(authenticCanvas.operations.uploads,1,
 'unchanged authentic pixels skip redundant uploads');
// Moving the bitmap cursor uploads only the changed LCD rectangle.
const partialCanvas=canvas();
const partialUploads=[];
const partialCtx=partialCanvas.getContext();
partialCtx.putImageData=(image,x,y,sx=0,sy=0,sw=image.width,sh=image.height)=>{
 partialUploads.push({sx,sy,sw,sh});
};
lcd.draw(partialCanvas,first);
lcd.draw(partialCanvas,changed);
assert.equal(partialUploads.length,2);
assert.ok(partialUploads[1].sw<960||partialUploads[1].sh<310,
 'cursor updates use a dirty rectangle rather than the full frame');
lcd.draw(partialCanvas,changed);
assert.equal(partialUploads.length,2,'identical bitmap skips a third upload');
// Switching from vector to authentic mode restores any previous overlay ink.
lcd.draw(partialCanvas,first,{textRuns:[],vectorText:true});
const beforeReturn=partialUploads.length;
lcd.draw(partialCanvas,first);
assert.equal(partialUploads.length,beforeReturn+1);
assert.equal(partialUploads.at(-1).sw,960,
 'vector to authentic transition restores the complete background');
// Enhanced caller must still paint vector text on each new keypress.
const enhancedCanvas=canvas();
const drawing=enhancedCanvas.getContext();
let texts=0;
drawing.fillText=()=>{texts++};
assert.equal(enhanced.draw(enhancedCanvas,first),'enhanced');
const count=texts;
assert.ok(count>0);
assert.equal(enhanced.draw(enhancedCanvas,second),'enhanced');
assert.ok(texts>count,'vector text repaint must not be skipped with cached raster');
assert.equal(enhancedCanvas.operations.allocations,1);
// Observe the actual RGBA writes, not elapsed time (which varies by runner).
// A cursor-only change should update a tiny subset of the full 960x310 frame.
const measured=canvas();
const measuredContext=measured.getContext();
const originalCreate=measuredContext.createImageData;
let writes=0;
measuredContext.createImageData=(width,height)=>{
 const image=originalCreate(width,height);
 image.data=new Proxy(image.data,{
  set(target,key,value){writes++;return Reflect.set(target,key,value)}
 });
 return image;
};
measuredContext.putImageData=()=>{};
lcd.draw(measured,first,{textRuns:[],vectorText:true});
const fullWrites=writes;
assert.ok(fullWrites>=960*310*4,'initial LCD frame is fully rasterized');
writes=0;
lcd.draw(measured,changed,{textRuns:[],vectorText:true});
assert.ok(writes>0,'cursor movement updates changed pixels');
assert.ok(writes<fullWrites/5,
 'cursor changes must modify less than 20% of the full RGBA buffer');
writes=0;
lcd.draw(measured,changed,{textRuns:[],vectorText:true});
assert.equal(writes,0,'no geometry change causes zero RGBA buffer writes');
console.log('PASS: CAL-016 bitmap cache, contrast, cursor, resize, canvas isolation and live text updates');
