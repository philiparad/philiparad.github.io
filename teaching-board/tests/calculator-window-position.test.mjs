import test from 'node:test';
import assert from 'node:assert/strict';
import {clampFloatingWindowPosition,initialFloatingWindowPosition,
 CALCULATOR_WINDOW_MARGIN} from '../js/calculator-window-position.js';

test('floating calculator starts near right edge and remains within viewport',()=>{
 assert.deepEqual(initialFloatingWindowPosition(374,812,1440,900),{x:1046,y:70});
 assert.deepEqual(initialFloatingWindowPosition(302,660,375,720),{x:53,y:52});
});
test('dragging calculator clamps to every viewport edge',()=>{
 const clamp=(x,y)=>clampFloatingWindowPosition(x,y,374,812,1440,900);
 assert.deepEqual(clamp(-500,-100),{x:8,y:8});
 assert.deepEqual(clamp(9999,9999),{x:1058,y:80});
 assert.deepEqual(clamp(420,25),{x:420,y:25});
 assert.equal(CALCULATOR_WINDOW_MARGIN,8);
});
test('calculator remains visible after viewport shrink and resize',()=>{
 const old={x:1046,y:70};
 const resized=clampFloatingWindowPosition(old.x,old.y,302,660,375,720);
 assert.deepEqual(resized,{x:65,y:52});
});

test('TXT-073 position preferences survive read/write and adapt to viewport size',async()=>{
 const {CALCULATOR_WINDOW_POSITION_KEY,readCalculatorWindowPosition,
  storeCalculatorWindowPosition,restoreCalculatorWindowPosition}=await import('../js/calculator-window-position.js');
 const values=new Map();
 const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const actual={x:430,y:45};
 assert.equal(storeCalculatorWindowPosition(storage,actual,374,812,1440,900),true);
 const raw=JSON.parse(values.get(CALCULATOR_WINDOW_POSITION_KEY));
 assert.equal(raw.v,1);
 assert(raw.x>0&&raw.x<1&&raw.y>0&&raw.y<1);
 const restored=readCalculatorWindowPosition(storage);
 const same=restoreCalculatorWindowPosition(restored,374,812,1440,900);
 assert(Math.abs(same.x-actual.x)<1e-6);
 assert(Math.abs(same.y-actual.y)<1e-6);
 const tablet=restoreCalculatorWindowPosition(restored,302,660,375,720);
 assert(tablet.x>=8&&tablet.x<=65&&tablet.y>=8&&tablet.y<=52);
 const back=restoreCalculatorWindowPosition(restored,374,812,1440,900);
 assert(Math.abs(back.x-actual.x)<1e-6);
 assert(Math.abs(back.y-actual.y)<1e-6);
});
test('TXT-073 malformed stored preferences are ignored',async()=>{
 const {readCalculatorWindowPosition,restoreCalculatorWindowPosition}=await import('../js/calculator-window-position.js');
 const storage={value:'',getItem(){return this.value;}};
 for(const value of ['not JSON','null','[]','{"v":0,"x":0.5,"y":0.3}',
  '{"v":1,"x":-0.2,"y":0.5}','{"v":1,"x":0.5,"y":3}',
  '{"v":1,"x":"0.5","y":0.3}','{"v":1,"x":null,"y":0.3}',
  '{"v":1,"x":0.2,"y":0.3}'.repeat(100)]){
  storage.value=value;
  assert.equal(readCalculatorWindowPosition(storage),null,value.slice(0,55));
 }
 storage.value='{"v":1,"x":0,"y":1}';
 assert.deepEqual(readCalculatorWindowPosition(storage),{x:0,y:1});
 assert.deepEqual(restoreCalculatorWindowPosition(null,374,812,1440,900),
  initialFloatingWindowPosition(374,812,1440,900));
});
test('TXT-073 denied local storage degrades gracefully',async()=>{
 const {readCalculatorWindowPosition,storeCalculatorWindowPosition,
  restoreCalculatorWindowPosition}=await import('../js/calculator-window-position.js');
 const blocked={
  getItem(){throw new Error('SecurityError');},
  setItem(){throw new Error('QuotaExceededError');}
 };
 assert.equal(readCalculatorWindowPosition(blocked),null);
 assert.equal(storeCalculatorWindowPosition(blocked,{x:100,y:20},374,812,1440,900),false);
 assert.equal(storeCalculatorWindowPosition(null,{x:100,y:20},374,812,1440,900),false);
 const tiny=restoreCalculatorWindowPosition({x:1,y:1},302,660,310,650);
 assert.deepEqual(tiny,{x:8,y:8});
});

test('TXT-074 reset clears only calculator position and restores default opening',async()=>{
 const {
  CALCULATOR_WINDOW_POSITION_KEY,
  readCalculatorWindowPosition,
  storeCalculatorWindowPosition,
  clearCalculatorWindowPosition,
  initialFloatingWindowPosition
 }=await import('../js/calculator-window-position.js');
 const values=new Map([['teaching-board-lesson','important lesson data']]);
 const storage={
  getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>values.delete(key)
 };
 assert.equal(storeCalculatorWindowPosition(storage,{x:430,y:45},374,812,1440,900),true);
 assert(readCalculatorWindowPosition(storage));
 assert.equal(clearCalculatorWindowPosition(storage),true);
 assert.equal(values.has(CALCULATOR_WINDOW_POSITION_KEY),false);
 assert.equal(values.get('teaching-board-lesson'),'important lesson data');
 assert.equal(readCalculatorWindowPosition(storage),null);
 assert.deepEqual(initialFloatingWindowPosition(374,812,1440,900),{x:1046,y:70});
 assert.equal(clearCalculatorWindowPosition(storage),true,'Repeated reset should be safe');
});
test('TXT-074 reset is safe when browser storage is disabled or unavailable',async()=>{
 const {clearCalculatorWindowPosition}=await import('../js/calculator-window-position.js');
 assert.equal(clearCalculatorWindowPosition(null),false);
 assert.equal(clearCalculatorWindowPosition(undefined),false);
 assert.equal(clearCalculatorWindowPosition({}),false);
 let calls=0;
 assert.equal(clearCalculatorWindowPosition({removeItem(){calls++;throw Error('SecurityError');}}),false);
 assert.equal(calls,1);
});
