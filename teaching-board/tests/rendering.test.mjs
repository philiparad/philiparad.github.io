// Run with: node --test teaching-board/tests/rendering.test.mjs
// A small SVG DOM double lets the real editor/renderer run without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 hasAttribute(k){return k in this.attributes;}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes);}
 get isConnected(){return this.root||!!this.parentNode?.isConnected;}
 closest(selector){return selector==='[data-id]'&&this.hasAttribute('data-id')?this:this.parentNode?.closest(selector)||null;}
 focus(){}
 setPointerCapture(){}
}
let frameId=0;const frames=new Map();
globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function nextFrame(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const {Editor}=await import('../js/editor.js');
const {History}=await import('../js/history.js');
const {createBoard,validateBoard}=await import('../js/model.js');
const {sceneSVG}=await import('../js/scene.js');
function fixture(count=1){
 frames.clear();const e=Object.create(Editor.prototype);e.board=createBoard('Rendering regression');
 e.board.items=Array.from({length:count},(_,k)=>({id:'object-'+k,type:'rectangle',x:(k%50)*18,y:20+Math.floor(k/50)*25,w:50,h:40,lineWidth:3,stroke:'#123456',fill:'none'}));
 e.svg=new Element('svg');e.svg.root=true;e.area={clientWidth:1000,clientHeight:700};
 e.selected=new Set();e.tool='pen';e.stroke='#123456';e.strokeOpacity=1;e.fill='none';e.fillOpacity=1;e.lineWidth=3;e.lineStyle='solid';e.opacity=1;e.inkSmoothing=.65;e.guides=[];
 for(const key of ['shapeGallery','strokePalette','fillPalette','lineStyleMenu'])e[key]={update(){}};
 e.pages={update(){},paint(){}};e.geometry={paint(){},down(){return false;},up(){return false;},move(){return false;}};
 for(const key of ['zoomLabel','selectionLabel','undoButton','redoButton','paper','smoothingSelect'])e[key]={};
 e.point=event=>({x:event.clientX,y:event.clientY});e.screen=e.point;e.save=()=>{};
 e.history=new History(e.document());e.action=fn=>fn();e.paint();return e;
}
function pointer(e,x,y){return {button:0,pointerId:1,clientX:x,clientY:y,timeStamp:x,target:e.svg,preventDefault(){}};}
function walk(n){return [n,...n.children.flatMap(walk)];}
function object(e,id){return walk(e.svg).find(n=>n.getAttribute('data-id')===id);}
test('pen preview preserves 1,000 committed SVG nodes and records all samples',()=>{
 const e=fixture(1000);e.pointerDown(pointer(e,10,10));const old=e.board.items.map(i=>object(e,i.id)),root=e.svg.children[0];
 for(let x=11;x<70;x++)e.pointerMove(pointer(e,x,20+Math.sin(x)));
 assert.equal(e.draft.rawPoints.length,60);assert.equal(e.svg.children[0],root);
 e.board.items.forEach((i,k)=>assert.equal(object(e,i.id),old[k]));
 nextFrame();assert.equal(e.draftLayer.children.length,1);e.pointerUp(pointer(e,70,20));
 assert.equal(e.board.items.length,1001);assert.equal(e.draftLayer.children.length,0);validateBoard(e.board);
 e.undo();assert.equal(e.board.items.length,1000);e.redo();assert.equal(e.board.items.length,1001);
 assert.equal(walk(sceneSVG(e.board)).filter(n=>n.hasAttribute('data-id')).length,1001);
});
test('tap creates a dot and exports the committed ink',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));assert.ok(walk(e.draftLayer).some(n=>n.tagName==='circle'));
 e.pointerUp(pointer(e,10,10));assert.equal(e.board.items.at(-1).points.length,1);
 assert.ok(walk(sceneSVG(e.board)).some(n=>n.tagName==='circle'));
});
test('shape previews refresh snapping guides without replacing fixed objects',()=>{
 const e=fixture();e.tool='rectangle';e.board.snapMode='grid';e.pointerDown(pointer(e,5,5));const old=object(e,'object-0');
 e.pointerMove(pointer(e,63,95));assert.equal(e.draft.w,59);assert.equal(e.draft.h,91);
 nextFrame();assert.equal(e.guideLayer.children.length,2);assert.equal(object(e,'object-0'),old);
 e.pointerUp(pointer(e,63,95));assert.equal(e.guideLayer.children.length,0);assert.equal(e.board.items.length,2);
});
test('full redraws clear canceled previews and update viewport transforms',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));const abandoned=e.draftLayer;
 e.drag=null;e.draft=null;e.paint();assert.equal(abandoned.isConnected,false);assert.equal(e.draftLayer.children.length,0);
 e.board.viewport={x:40,y:30,zoom:2};e.paint();assert.equal(e.draftLayer.parentNode.getAttribute('transform'),'translate(40 30) scale(2)');
 e.pointerDown(pointer(e,20,20));e.pointerMove(pointer(e,30,30));assert.equal(e.draftLayer.parentNode.getAttribute('transform'),'translate(40 30) scale(2)');
});

test('many input events produce one preview frame without dropping samples',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));let paints=0;
 const draw=e.paintDraft.bind(e);e.paintDraft=()=>{paints++;draw();};
 for(let x=11;x<=110;x++)e.pointerMove(pointer(e,x,20));
 assert.equal(e.draft.rawPoints.length,101);assert.equal(paints,0);assert.equal(frames.size,1);
 nextFrame();assert.equal(paints,1);assert.equal(frames.size,0);
});
test('pointer release before the next frame commits final ink and cancels stale paint',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));e.pointerMove(pointer(e,30,20));
 assert.equal(frames.size,1);e.pointerUp(pointer(e,45,25));
 assert.equal(frames.size,0);assert.equal(e.board.items.length,2);
 assert.equal(e.board.items.at(-1).rawPoints.at(-1)[0],35);
 nextFrame();assert.equal(e.draftLayer.children.length,0);e.undo();assert.equal(e.board.items.length,1);
});
test('full redraw supersedes draft requests and canceled/disposed work cannot render',()=>{
 const e=fixture();let full=0,draft=0;
 const paint=e.paint.bind(e);e.paint=()=>{full++;paint();};e.paintDraft=()=>draft++;
 e.requestPaint(true);e.requestPaint();e.requestPaint(true);assert.equal(frames.size,1);
 nextFrame();assert.equal(full,1);assert.equal(draft,0);
 e.requestPaint(true);e.paint();assert.equal(frames.size,0);
 e.requestPaint(true);e.disposed=true;nextFrame();assert.equal(draft,0);
 e.requestPaint();assert.equal(frames.size,0);
});
test('finishing ink preserves the live stroke in board coordinates and keeps raw samples',()=>{
 const e=fixture();e.pointerDown(pointer(e,100,100));
 for(let x=101;x<=160;x++)e.pointerMove(pointer(e,x,110+Math.sin(x)*3));
 nextFrame();const live=e.draft.points.map(([x,y])=>[x+e.draft.x,y+e.draft.y]);
 const raw=structuredClone(e.draft.rawPoints);e.pointerUp(pointer(e,160,110+Math.sin(160)*3));
 const item=e.board.items.at(-1),saved=item.points.map(([x,y])=>[x+item.x,y+item.y]);
 assert.equal(saved.length,live.length);
 saved.forEach((p,i)=>p.forEach((v,k)=>assert.ok(Math.abs(v-live[i][k])<1e-8)));
 assert.equal(item.rawPoints.length,raw.length);validateBoard(e.board);
 e.undo();e.redo();assert.deepEqual(e.board.items.at(-1),item);
});

test('stylus pressure survives smoothing, history, duplication and export',async()=>{
 const {resmoothPressure}=await import('../js/pressure.js');
 const e=fixture();e.penDynamics='pressure';
 const pen=(x,y,p)=>({...pointer(e,x,y),pointerType:'pen',pressure:p});
 e.pointerDown(pen(100,100,.1));
 for(let x=101;x<=180;x++)e.pointerMove(pen(x,110+Math.sin(x/8)*15,(x-100)/80));
 e.pointerUp(pen(185,120,0));
 const item=e.board.items.at(-1);
 assert.equal(item.rawPressures.at(-1),1);assert.equal(item.rawPressures[0],.1);
 assert.equal(item.pressures.length,item.points.length);assert.equal(item.rawPressures.length,item.rawPoints.length);
 assert.ok(Math.max(...item.pressures)-Math.min(...item.pressures)>.8);validateBoard(e.board);
 const exported=walk(sceneSVG(e.board)).find(n=>n.hasAttribute('data-pressure-ink'));
 assert.ok(exported);assert.equal(exported.getAttribute('fill-rule'),'nonzero');
 assert.ok(!/NaN|Infinity/.test(exported.getAttribute('d')));
 e.undo();e.redo();assert.deepEqual(e.board.items.at(-1),item);
 e.selected=new Set([item.id]);e.duplicate();assert.deepEqual(e.board.items.at(-1).pressures,item.pressures);
 for(const strength of [0,.35,.65,.85]){resmoothPressure(item,strength);validateBoard(e.board);assert.equal(item.points.length,item.pressures.length);}
 const copy=JSON.parse(JSON.stringify(e.board));validateBoard(copy);
 copy.items.at(-1).pressures.pop();assert.throws(()=>validateBoard(copy),/pressure/);
});
test('pressure is opt-in for solid stylus ink, including taps',()=>{
 for(const [dynamics,pointerType,tool,lineStyle]of [['fixed','pen','pen','solid'],['pressure','mouse','pen','solid'],['pressure','touch','pen','solid'],['pressure','pen','highlighter','solid'],['pressure','pen','pen','dashed'],['pressure','pen','pen','solid']]){
  const e=fixture();e.penDynamics=dynamics;e.tool=tool;e.lineStyle=lineStyle;
  const event={...pointer(e,20,20),pointerType,pressure:.8};e.pointerDown(event);e.pointerUp({...event,pressure:0});
  const item=e.board.items.at(-1),enabled=dynamics==='pressure'&&pointerType==='pen'&&tool==='pen'&&lineStyle==='solid';
  assert.equal(!!item.pressures,enabled);assert.equal(walk(sceneSVG(e.board)).some(n=>n.hasAttribute('data-pressure-ink')),enabled);
  if(enabled){assert.deepEqual(item.pressures,[.8]);validateBoard(e.board);}
 }
});
test('pressure geometry handles coincident points and reversals without invalid paths',async()=>{
 const {pressurePathD,pressureRadius,penPressure}=await import('../js/pressure.js');
 assert.equal(pressureRadius(4,.5),2);assert.ok(pressureRadius(4,1)>pressureRadius(4,.1));
 assert.equal(penPressure({pressure:0},.7),.7);
 const d=pressurePathD([[0,0],[0,0],[1,0],[0,0],[0,50]],[0,1,.5,.8,.1],20);
 assert.ok(d.length>0);assert.ok(!/NaN|Infinity/.test(d));
});

test('speed ink integrates with coalesced input, resmoothing, backups and history',async()=>{
 const {serializeBackup,parseBackup}=await import('../js/model.js');
 const {resmoothPressure}=await import('../js/pressure.js');
 const e=fixture();e.penDynamics='speed';
 const event=(x,t)=>({...pointer(e,x,100),timeStamp:t,pointerType:'mouse',pressure:.5});
 e.pointerDown(event(100,0));
 const samples=[];
 for(let k=1;k<=20;k++)samples.push(event(100+k,k*20));
 for(let k=1;k<=20;k++)samples.push(event(120+k*20,400+k*10));
 e.pointerMove({...samples.at(-1),getCoalescedEvents:()=>samples});
 const live=[...e.draft.pressures];e.pointerUp(event(520,600));
 const item=e.board.items.at(-1);assert.deepEqual(item.pressures,live);
 assert.ok(item.rawPressures[20]>item.rawPressures.at(-1)+.2);
 assert.equal(item.rawPoints.length,41);validateBoard(e.board);
 e.undo();e.redo();assert.deepEqual(e.board.items.at(-1),item);
 const restored=parseBackup(serializeBackup(e.board));assert.deepEqual(restored.items.at(-1).pressures,item.pressures);
 for(const strength of [0,.35,.85]){resmoothPressure(item,strength);validateBoard({...e.board,items:[item]});}
 assert.ok(walk(sceneSVG({...e.board,items:[item]})).some(n=>n.hasAttribute('data-pressure-ink')));
});
test('speed mode supports mouse, touch and stylus taps but excludes patterned ink and highlighter',()=>{
 for(const pointerType of ['mouse','touch','pen']){
  const e=fixture();e.penDynamics='speed';const event={...pointer(e,20,20),pointerType};
  e.pointerDown(event);e.pointerUp(event);assert.deepEqual(e.board.items.at(-1).pressures,[.5]);
 }
 for(const [tool,lineStyle]of [['highlighter','solid'],['pen','dashed']]){
  const e=fixture();e.penDynamics='speed';e.tool=tool;e.lineStyle=lineStyle;
  e.pointerDown(pointer(e,20,20));e.pointerMove(pointer(e,100,50));e.pointerUp(pointer(e,100,50));
  assert.equal(e.board.items.at(-1).pressures,undefined);
 }
});

test('full redraw reuses 1,000 unchanged object nodes during pan, zoom and selection',()=>{
 const e=fixture(1000),before=e.board.items.map(i=>object(e,i.id));
 e.area={clientWidth:4000,clientHeight:2000};e.board.viewport={x:150,y:30,zoom:2};e.selected.add('object-2');e.paint();
 e.board.items.forEach((i,k)=>assert.equal(object(e,i.id),before[k]));
 assert.equal(e.renderCache.entries.size,1000);
 const changed=e.board.items[2];changed.stroke='#ff0000';e.paint();
 assert.notEqual(object(e,changed.id),before[2]);
 assert.equal(object(e,'object-3'),before[3]);
 const moved=object(e,changed.id),child=moved.children[0];changed.x=88;changed.rotation=30;changed.opacity=.4;e.paint();
 assert.equal(object(e,changed.id),moved);assert.equal(moved.children[0],child);
 assert.equal(moved.getAttribute('transform'),'translate(88 20) rotate(30 25 20)');
 assert.equal(moved.getAttribute('opacity'),'0.4');
});
test('cached rendering detects in-place geometry edits and keeps export independent',()=>{
 const e=fixture(0),curve={id:'curve-cache',type:'curve',x:0,y:0,w:100,h:100,points:[[0,0],[50,100],[100,0]],stroke:'#123456',lineWidth:3};
 e.board.items=[curve];e.paint();const original=object(e,curve.id),d=original.children[0].getAttribute('d');
 curve.points[1][1]=40;e.paint();const edited=object(e,curve.id);
 assert.notEqual(edited,original);assert.notEqual(edited.children[0].getAttribute('d'),d);
 const exported=walk(sceneSVG(e.board)).find(n=>n.getAttribute('data-id')===curve.id);
 assert.notEqual(exported,edited);assert.equal(exported.children[0].getAttribute('d'),edited.children[0].getAttribute('d'));
 e.commit();e.board.items=[];e.commit();assert.equal(e.renderCache.entries.size,0);
 e.undo();assert.ok(object(e,curve.id));e.redo();assert.equal(e.renderCache.entries.size,0);
});
test('cache avoids repeated pressure geometry generation and preserves stacking order',async()=>{
 const {RenderCache}=await import('../js/render-cache.js');const {drawItem}=await import('../js/scene.js');
 let calls=0;const cache=new RenderCache(item=>{calls++;return drawItem(item);});
 const item={id:'ink-cache',type:'path',x:0,y:0,w:100,h:10,points:[[0,0],[100,10]],pressures:[.2,.8],rawPoints:[[0,0],[100,10]],rawPressures:[.2,.8],lineWidth:8};
 const node=cache.draw(item);for(let k=0;k<50;k++){item.x=k;assert.equal(cache.draw(item),node);}assert.equal(calls,1);
 item.pressures[1]=.4;assert.notEqual(cache.draw(item),node);assert.equal(calls,2);
 const e=fixture(3);e.board.items.reverse();e.paint();assert.deepEqual(walk(e.svg).filter(n=>n.hasAttribute('data-id')).map(n=>n.getAttribute('data-id')),['object-2','object-1','object-0']);
 cache.clear();assert.equal(cache.entries.size,0);
});

test('viewport filtering omits offscreen SVG objects but preserves model and complete exports',async()=>{
 const {pageSVG}=await import('../js/pages.js');
 const e=fixture(1000);for(let k=1;k<1000;k++)e.board.items[k].x+=10000;
 e.paint();assert.equal(walk(e.svg).filter(n=>n.hasAttribute('data-id')).length,1);
 assert.equal(e.renderCache.entries.size,1);assert.equal(e.board.items.length,1000);
 assert.equal(walk(sceneSVG(e.board)).filter(n=>n.hasAttribute('data-id')).length,1000);
 assert.equal(walk(pageSVG(e.board,0)).filter(n=>n.hasAttribute('data-id')).length,1000);
 e.board.viewport.x=-10000;e.paint();assert.equal(walk(e.svg).filter(n=>n.hasAttribute('data-id')).length,999);
 assert.equal(e.renderCache.entries.size,999);assert.equal(object(e,'object-0'),undefined);
 e.board.viewport.x=0;e.paint();assert.ok(object(e,'object-0'));assert.equal(e.renderCache.entries.size,1);
});
test('offscreen edits, selection, resize and history restore the right visible objects',()=>{
 const e=fixture(2);e.board.items[1].x=1500;e.commit();assert.equal(object(e,'object-1'),undefined);
 e.selected.add('object-1');e.paint();assert.ok(object(e,'object-1'));
 e.selected.clear();e.board.items[1].stroke='#ff0000';e.commit();assert.equal(object(e,'object-1'),undefined);
 e.area.clientWidth=1800;e.paint();assert.equal(object(e,'object-1').children[0].getAttribute('stroke'),'#ff0000');
 e.undo();assert.equal(object(e,'object-1').children[0].getAttribute('stroke'),'#123456');
 e.redo();assert.equal(object(e,'object-1').children[0].getAttribute('stroke'),'#ff0000');
 e.area.clientWidth=1000;e.paint();assert.equal(object(e,'object-1'),undefined);
 e.board.items[1].x=100;e.commit();assert.ok(object(e,'object-1'));
 e.undo();assert.equal(object(e,'object-1'),undefined);e.redo();assert.ok(object(e,'object-1'));
});

test('group click, drag, shift-toggle and marquee select all members',()=>{
 const e=fixture(3);e.tool='select';e.selected=new Set(['object-0','object-1']);e.groupSelection();
 const group=e.board.items[0].groupId;assert.ok(group);assert.equal(e.board.items[1].groupId,group);
 e.selected.clear();e.paint();const hit={...pointer(e,10,25),target:object(e,'object-0')};
 e.pointerDown(hit);assert.deepEqual([...e.selected],['object-0','object-1']);
 e.pointerMove(pointer(e,50,65));e.pointerUp(pointer(e,50,65));
 assert.equal(e.board.items[0].x,40);assert.equal(e.board.items[1].x,58);assert.equal(e.board.items[2].x,36);
 e.pointerDown({...pointer(e,50,65),target:object(e,'object-0'),shiftKey:true});e.pointerUp(pointer(e,50,65));assert.equal(e.selected.size,0);
 e.pointerDown(pointer(e,35,55));e.pointerMove(pointer(e,95,105));e.pointerUp(pointer(e,95,105));
 assert.ok(e.selected.has('object-0')&&e.selected.has('object-1'));
});
test('group duplication, backup, ungrouping and undo preserve independent groups',async()=>{
 const {serializeBackup,parseBackup}=await import('../js/model.js');
 const e=fixture(2);e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();const id=e.board.items[0].groupId;
 e.duplicate();assert.equal(e.board.items.length,4);const copy=structuredClone(e.board.items.slice(2));
 assert.equal(copy[0].groupId,copy[1].groupId);assert.notEqual(copy[0].groupId,id);
 assert.equal(parseBackup(serializeBackup(e.board)).items[0].groupId,id);
 e.ungroupSelection();assert.equal(e.board.items[2].groupId,undefined);assert.equal(e.board.items[0].groupId,id);
 e.undo();assert.equal(e.board.items[2].groupId,copy[0].groupId);e.redo();assert.equal(e.board.items[2].groupId,undefined);
 const bad=structuredClone(e.board);bad.items[0].groupId={};assert.throws(()=>validateBoard(bad),/group/);
});
test('group resize, delete and erase apply to all members and retain undo',()=>{
 const e=fixture(2);e.tool='select';e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();
 const handle=walk(e.svg).find(n=>n.hasAttribute('data-resize'));
 e.pointerDown({...pointer(e,68,60),target:handle});e.pointerMove(pointer(e,136,100));e.pointerUp(pointer(e,136,100));
 assert.equal(e.board.items[0].w,100);assert.equal(e.board.items[1].x,36);assert.equal(e.board.items[0].h,80);
 e.remove();assert.equal(e.board.items.length,0);e.undo();assert.equal(e.board.items.length,2);
 e.eraseAt({x:10,y:30});e.commit();assert.equal(e.board.items.length,0);e.undo();assert.equal(e.board.items.length,2);
});
test('one locked member protects the complete group from move, deletion and erasing',()=>{
 const e=fixture(2);e.tool='select';e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();e.board.items[0].locked=true;e.commit();
 const before=e.board.items.map(i=>i.x);
 e.pointerDown({...pointer(e,20,30),target:object(e,'object-1')});e.pointerMove(pointer(e,80,90));e.pointerUp(pointer(e,80,90));
 assert.deepEqual(e.board.items.map(i=>i.x),before);e.remove();assert.equal(e.board.items.length,2);
 e.eraseAt({x:30,y:30});assert.equal(e.board.items.length,2);
});

test('group rotation uses a shared center and sizing preserves relative positions',()=>{
 const e=fixture(2);e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();
 e.rotateSelection(180);assert.ok(Math.abs(e.board.items[0].x-18)<1e-8);assert.ok(Math.abs(e.board.items[1].x)<1e-8);assert.equal(e.board.items[0].rotation,180);
 e.undo();e.selected=new Set(e.board.items.map(i=>i.id));e.scaleSelection(2,2,{x:0,y:20});
 assert.equal(e.board.items[0].w,100);assert.equal(e.board.items[1].x,36);
});

test('attached arrows update during object drag, restore through history and export',async()=>{
 const {parseBackup,serializeBackup}=await import('../js/model.js');
 const e=fixture(2);e.tool='select';e.board.items[1].x=300;e.selected=new Set(e.board.items.map(i=>i.id));e.connectSelection();
 const id=e.board.items.at(-1).id,before=structuredClone(e.board.items.at(-1));assert.equal(before.links.start,'object-0');
 e.selected.clear();e.paint();e.pointerDown({...pointer(e,10,30),target:object(e,'object-0')});e.pointerMove(pointer(e,110,80));nextFrame();
 assert.notDeepEqual(e.board.items.at(-1).points,before.points);e.pointerUp(pointer(e,110,80));const moved=structuredClone(e.board.items.at(-1));
 validateBoard(e.board);e.undo();assert.deepEqual(e.board.items.at(-1),before);e.redo();assert.deepEqual(e.board.items.at(-1),moved);
 assert.deepEqual(parseBackup(serializeBackup(e.board)).items.at(-1).links,moved.links);
 assert.ok(walk(sceneSVG(e.board)).some(n=>n.getAttribute('data-id')===id));
 e.selected=new Set([id]);e.detachSelection();assert.equal(e.board.items.at(-1).links,undefined);e.undo();assert.deepEqual(e.board.items.at(-1).links,moved.links);
});
test('connector target deletion and undo preserve the relation; invalid links are rejected',()=>{
 const e=fixture(2);e.board.items[1].x=300;e.selected=new Set(e.board.items.map(i=>i.id));e.connectSelection();
 e.selected=new Set(['object-0']);e.remove();assert.equal(e.board.items.at(-1).links.start,null);e.undo();assert.equal(e.board.items.at(-1).links.start,'object-0');
 const bad=structuredClone(e.board);bad.items.at(-1).links.start=bad.items.at(-1).id;assert.throws(()=>validateBoard(bad),/connector/);
 bad.items.at(-1).links={start:'object-0',end:'object-0'};assert.throws(()=>validateBoard(bad),/connector/);
});
test('group transforms move targets and keep the included connector attached',()=>{
 const e=fixture(2);e.board.items[1].x=300;e.selected=new Set(e.board.items.map(i=>i.id));e.connectSelection();
 e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();e.rotateSelection(90);validateBoard(e.board);
 const c=e.board.items.at(-1);assert.equal(c.rotation,0);assert.ok(Math.abs(c.points[0][0]-c.points[1][0])<1e-8);assert.ok(c.links);
 e.duplicate();const copies=e.board.items.slice(3);assert.equal(copies[2].links.start,copies[0].id);assert.equal(copies[2].links.end,copies[1].id);
});

test('inline text commits one undo step and retains connectors, copies and export',()=>{
 const e=fixture(1);e.fontSize=26;
 const item={id:'text',type:'text',x:200,y:100,w:360,h:130,fontSize:26,text:''};
 e.applyText(item,'First line\nשלום',160,false);assert.equal(e.history.past.length,1);assert.equal(e.board.items.length,2);
 e.selected=new Set(['object-0','text']);e.connectSelection();const arrow=e.board.items.at(-1),before=structuredClone(arrow.points);
 e.applyText(e.board.items.find(i=>i.id==='text'),'Updated\nMultiple\nLines',260,true);
 assert.notDeepEqual(arrow.points,before);assert.equal(e.board.items.find(i=>i.id==='text').h,260);
 e.undo();assert.equal(e.board.items.find(i=>i.id==='text').text,'First line\nשלום');
 e.redo();assert.equal(e.board.items.find(i=>i.id==='text').text,'Updated\nMultiple\nLines');
 e.selected=new Set(['text']);e.duplicate();assert.equal(e.board.items.at(-1).text,'Updated\nMultiple\nLines');
 assert.ok(walk(sceneSVG(e.board)).some(n=>n.tagName==='tspan'&&n.textContent==='Updated'));validateBoard(e.board);
 const count=e.history.past.length;e.applyText(e.board.items.at(-1),e.board.items.at(-1).text,500,true);assert.equal(e.history.past.length,count);
});

test('two text pointer clicks reopen editing despite redraws; dragging does not',()=>{
 const e=fixture(0);e.tool='select';e.board.items=[{id:'text-tap',type:'text',x:20,y:20,w:360,h:130,fontSize:26,text:'Edit me'}];e.paint();
 let edits=0;e.insertText=()=>{edits++;};
 const tap=(time)=>({...pointer(e,30,30),timeStamp:time,target:object(e,'text-tap')});
 e.pointerDown(tap(100));e.pointerUp(tap(120));e.pointerDown(tap(250));assert.equal(edits,1);assert.equal(e.drag,null);
 e.pointerDown(tap(1000));e.pointerMove({...pointer(e,70,80),timeStamp:1100});e.pointerUp(pointer(e,70,80));e.pointerDown(tap(1200));assert.equal(edits,1);
});

test('snippet insertion is one undoable change with fresh groups and editable connections',async()=>{
 const {createSnippet}=await import('../js/snippet-model.js');
 const e=fixture(2);e.center=()=>({x:500,y:350});e.setTool=tool=>{e.tool=tool;};
 e.selected=new Set(e.board.items.map(i=>i.id));e.connectSelection();e.selected=new Set(e.board.items.map(i=>i.id));e.groupSelection();
 const value=createSnippet('Reusable diagram',e.board.items),count=e.board.items.length,steps=e.history.past.length;
 e.insertSnippet(value);assert.equal(e.board.items.length,count*2);assert.equal(e.history.past.length,steps+1);assert.equal(e.selected.size,3);
 const inserted=e.board.items.slice(count);assert.equal(inserted[2].links.start,inserted[0].id);assert.notEqual(inserted[0].groupId,e.board.items[0].groupId);
 e.undo();assert.equal(e.board.items.length,count);e.redo();assert.equal(e.board.items.length,count*2);
 const {serializeBackup,parseBackup}=await import('../js/model.js');assert.equal(parseBackup(serializeBackup(e.board)).items.length,count*2);assert.equal(walk(sceneSVG(e.board)).filter(n=>n.hasAttribute('data-id')).length,count*2);
 const invalid=structuredClone(value);invalid.items[0].x=NaN;assert.throws(()=>e.insertSnippet(invalid));assert.equal(e.board.items.length,count*2);
});
