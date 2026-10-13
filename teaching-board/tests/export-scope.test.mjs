import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveExport,viewRegion,validRegion,exportScopeDialog,exportPadding,rasterSize} from '../js/export-scope.js';
import {sceneSVG} from '../js/scene.js';
class Element{constructor(tag){this.tagName=tag;this.children=[];this.attributes={};}set value(v){this._value=String(v);}get value(){return this._value;}setAttribute(k,v){this.attributes[k]=String(v);}append(...nodes){this.children.push(...nodes);}focus(){}showModal(){}close(){this.onclose();}remove(){}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag),body:new Element('body')};
const board={background:'grid',layout:'a4',pageCount:2,items:[{id:'keep',type:'rectangle',x:100,y:200,w:200,h:100,rotation:45,locked:true},{id:'omit',type:'rectangle',x:5000,y:0,w:100,h:100}]};
const walk=n=>[n,...n.children.flatMap(walk)];
test('selection export preserves order and locked objects while excluding unselected objects',()=>{
 const original=structuredClone(board),resolved=resolveExport(board,{scope:'selection',ids:['keep','missing']});assert.deepEqual(resolved.board.items.map(i=>i.id),['keep']);assert.ok(resolved.region.x<100&&resolved.region.y<200);
 const svg=sceneSVG(resolved.board,30,resolved.region);assert.deepEqual(walk(svg).filter(n=>n.attributes['data-id']).map(n=>n.attributes['data-id']),['keep']);assert.deepEqual(board,original);
 assert.throws(()=>resolveExport(board,{scope:'selection',ids:[]}),/Select at least/);
});
test('viewport export translates pan and zoom and region SVG clips without extra margins',()=>{
 const region=viewRegion({x:120,y:-80,zoom:2},800,600);assert.deepEqual(region,{x:-60,y:40,w:400,h:300});
 const resolved=resolveExport(board,{scope:'view',region}),svg=sceneSVG(resolved.board,30,resolved.region);assert.equal(svg.attributes.viewBox,'0 0 400 300');assert.equal(svg.attributes.overflow,'hidden');assert.equal(svg.children.at(-1).attributes.transform,'translate(60 -40)');assert.equal(resolved.board.items.length,2);
});
test('custom rectangle validation rejects unsafe dimensions and leaves whole-lesson export unchanged',()=>{
 for(const region of [null,{x:0,y:0,w:0,h:100},{x:NaN,y:0,w:1,h:1},{x:0,y:0,w:Infinity,h:1},{x:0,y:0,w:100001,h:1}])assert.throws(()=>validRegion(region),/finite/);
 assert.deepEqual(resolveExport(board),{board,region:null});assert.throws(()=>resolveExport(board,{scope:'invalid'}),/valid export/);
 assert.deepEqual(resolveExport(board,{scope:'region',region:{x:-100,y:-200,w:50,h:60}}).region,{x:-100,y:-200,w:50,h:60});
});
test('export dialog cancel and invalid rectangle do not change lesson or selection',async()=>{
 const e={board:structuredClone(board),selected:new Set(),area:{clientWidth:800,clientHeight:600}};e.board.viewport={x:0,y:0,zoom:1};const before=structuredClone(e.board);
 const pending=exportScopeDialog(e,'png'),dialog=document.body.children.at(-1),nodes=walk(dialog),scope=nodes.find(n=>n.tagName==='select');assert.equal(scope.children.find(n=>n.value==='selection').disabled,true);
 scope.value='region';scope.onchange();const width=nodes.filter(n=>n.tagName==='input')[2];width.value='';await nodes.find(n=>n.textContent==='Export'&&n.tagName==='button').onclick();assert.match(nodes.find(n=>n.className==='error').textContent,/finite/);
 await nodes.find(n=>n.textContent==='Cancel').onclick();assert.equal(await pending,null);assert.deepEqual(e.board,before);assert.equal(e.selected.size,0);
});
test('transparent scene omits paper for every background but preserves object fills and opacity',()=>{
 for(const background of ['grid','plain','dark','ruled','dots']){
  const b={...board,background,items:[{...board.items[0],fill:'#00ff00',opacity:.5}]},before=structuredClone(b);
  const svg=sceneSVG(b,30,null,{transparent:true});assert.equal(svg.children.length,1);assert.equal(svg.children[0].tagName,'g');
  const object=walk(svg).find(n=>n.attributes['data-id']==='keep');assert.equal(object.attributes.opacity,'0.5');assert.equal(object.children[0].attributes.fill,'#00ff00');assert.deepEqual(b,before);
  assert.ok(sceneSVG(b).children.some(n=>n.tagName==='defs'));
 }
});
test('PNG transparency is opt-in and stays unavailable for SVG and PDF',async()=>{
 const e={board:{...board,viewport:{x:0,y:0,zoom:1}},selected:new Set(['keep']),area:{clientWidth:800,clientHeight:600}};
 for(const format of ['png','svg','pdf']){
  const pending=exportScopeDialog(e,format),nodes=walk(document.body.children.at(-1)),paper=nodes.find(n=>n.attributes['aria-label']==='PNG background'),scope=nodes.find(n=>n.attributes['aria-label']==='Export area');
  assert.equal(nodes.find(n=>n.children.includes(paper)).hidden,format!=='png');assert.equal(paper.children[0].value,'board');
  scope.value='selection';paper.value='transparent';await nodes.find(n=>n.textContent==='Export'&&n.tagName==='button').onclick();const result=await pending;assert.equal(result.transparent,format==='png');assert.equal(result.scope,'selection');
 }
});

test('padding changes selection bounds symmetrically and retains exact crop bounds',()=>{
 const zero=resolveExport(board,{scope:'selection',ids:['keep'],padding:0}),padded=resolveExport(board,{scope:'selection',ids:['keep'],padding:50});
 assert.equal(padded.region.x,zero.region.x-50);assert.equal(padded.region.y,zero.region.y-50);assert.equal(padded.region.w,zero.region.w+100);assert.equal(padded.region.h,zero.region.h+100);
 const region={x:10,y:20,w:300,h:200};assert.deepEqual(resolveExport(board,{scope:'region',region,padding:50}).region,region);
 for(const n of [-1,1001,NaN,Infinity])assert.throws(()=>exportPadding(n),/padding/);assert.equal(exportPadding(),30);
});
test('PNG size controls preserve resolution choices while enforcing both memory limits',()=>{
 for(const scale of [1,2,3,4])assert.deepEqual(rasterSize(400,200,scale),{width:400*scale,height:200*scale,limited:false});
 for(const [w,h]of [[10000,10000],[100000,1],[1,100000],[9000,3000]]){const size=rasterSize(w,h,4);assert.ok(size.width<=8000&&size.height<=8000);assert.ok(size.width*size.height<=24000000);assert.equal(size.limited,true);}
 assert.throws(()=>rasterSize(400,200,0),/resolution/);assert.throws(()=>rasterSize(400,200,Infinity),/resolution/);
});
test('export dialog updates dimensions and hides padding for exact crops and A4 printing',async()=>{
 const e={board:{...board,viewport:{x:0,y:0,zoom:1}},selected:new Set(['keep']),area:{clientWidth:800,clientHeight:600}};
 for(const format of ['png','pdf']){
  const pending=exportScopeDialog(e,format),nodes=walk(document.body.children.at(-1)),scope=nodes.find(n=>n.attributes['aria-label']==='Export area'),resolution=nodes.find(n=>n.attributes['aria-label']==='PNG resolution'),paddingLabel=nodes.find(n=>n.textContent==='Padding (canvas units)');
  assert.equal(paddingLabel.hidden,format==='pdf');scope.value='view';scope.onchange();assert.equal(paddingLabel.hidden,true);
  if(format==='png'){resolution.value='3';resolution.onchange();assert.ok(nodes.some(n=>n.textContent==='PNG: 2400 × 1800 pixels'));}
  scope.value='selection';scope.onchange();assert.equal(paddingLabel.hidden,false);paddingLabel.children[0].value='75';paddingLabel.children[0].oninput();
  await nodes.find(n=>n.textContent==='Export'&&n.tagName==='button').onclick();const result=await pending;assert.equal(result.padding,75);assert.equal(result.scale,format==='png'?3:2);
 }
});
test('A4 PDF dialog validates page selection while image export has no page-range option',async()=>{
 const e={board:{...board,viewport:{x:0,y:0,zoom:1}},selected:new Set(),area:{clientWidth:800,clientHeight:600}};
 let pending=exportScopeDialog(e,'pdf'),nodes=walk(document.body.children.at(-1)),scope=nodes.find(n=>n.attributes['aria-label']==='Export area'),range=nodes.find(n=>n.textContent==='A4 pages to export').children[0];
 assert.ok(scope.children.some(n=>n.value==='pages'));scope.value='pages';scope.onchange();range.value='3';await nodes.find(n=>n.textContent==='Export'&&n.tagName==='button').onclick();assert.match(nodes.find(n=>n.className==='error').textContent,/1 to 2/);
 range.value='2,2';range.oninput();assert.ok(nodes.some(n=>n.textContent==='1 of 2 A4 pages. Exported once each in document order.'));await nodes.find(n=>n.textContent==='Export'&&n.tagName==='button').onclick();assert.deepEqual(resolveExport(e.board,await pending).pages,[1]);
 pending=exportScopeDialog(e,'png');nodes=walk(document.body.children.at(-1));scope=nodes.find(n=>n.attributes['aria-label']==='Export area');assert.equal(scope.children.some(n=>n.value==='pages'),false);await nodes.find(n=>n.textContent==='Cancel').onclick();assert.equal(await pending,null);
});
