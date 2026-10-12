import { el, btn, field } from './ui.js?v=20261013-transparent-png';
import { bounds } from './scene.js?v=20261013-transparent-png';
import { visualBounds } from './visibility.js?v=20261013-transparent-png';

export function viewRegion(viewport,width,height){
 return {x:-viewport.x/viewport.zoom,y:-viewport.y/viewport.zoom,w:width/viewport.zoom,h:height/viewport.zoom};
}
export function validRegion(region){
 if(!region||!['x','y','w','h'].every(k=>Number.isFinite(region[k]))||Math.abs(region.x)>=1e7||Math.abs(region.y)>=1e7||region.w<=0||region.h<=0||region.w>100000||region.h>100000)throw new Error('Enter finite coordinates and a width and height greater than 0, up to 100,000.');
 return {...region};
}
export function resolveExport(board,options={scope:'all'}){
 const {scope='all'}=options;
 if(scope==='all')return {board,region:null};
 if(scope==='selection'){
  const ids=new Set(options.ids||[]),items=board.items.filter(i=>ids.has(i.id));
  if(!items.length)throw new Error('Select at least one object before exporting a selection.');
  const boxes=items.map(i=>visualBounds(i)||bounds(i)),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  const region={x:x-30,y:y-30,w:Math.max(...boxes.map(b=>b.x+b.w))-x+60,h:Math.max(...boxes.map(b=>b.y+b.h))-y+60};
  return {board:{...board,items},region};
 }
 if(scope==='view'||scope==='region')return {board,region:validRegion(options.region)};
 throw new Error('Choose a valid export area.');
}
export function exportScopeDialog(editor,format){
 const d=el('dialog',null,'form-dialog'),scope=el('select'),label=el('label','Export area'),error=el('p',null,'error'),actions=el('div',null,'actions'),custom=el('div');
 const paper=el('select'),paperLabel=el('label','PNG background');paper.setAttribute('aria-label','PNG background');for(const [value,text]of [['board','Board paper'],['transparent','Transparent']]){const option=el('option',text);option.value=value;paper.append(option);}paperLabel.append(paper);paperLabel.hidden=format!=='png';
 const ids=[...editor.selected],view=viewRegion(editor.board.viewport,editor.area.clientWidth,editor.area.clientHeight);let result=null;
 scope.setAttribute('aria-label','Export area');
 for(const [value,text]of [['all','Entire lesson'],['selection',`Selected objects (${ids.length})`],['view','Current canvas view'],['region','Custom rectangle']]){const o=el('option',text);o.value=value;o.disabled=value==='selection'&&!ids.length;scope.append(o);}
 const inputs={};for(const [key,text]of [['x','Left (canvas units)'],['y','Top (canvas units)'],['w','Width (canvas units)'],['h','Height (canvas units)']]){const f=field(text,Math.round(view[key]*100)/100,'number');f.input.step='any';inputs[key]=f.input;custom.append(f.wrap);}
 custom.hidden=true;scope.onchange=()=>{custom.hidden=scope.value!=='region';error.textContent='';};label.append(scope);
 actions.append(btn('Cancel',()=>d.close()),btn('Export',()=>{try{const region=scope.value==='region'?Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,input.value.trim()===''?NaN:Number(input.value)])):view;const choice={scope:scope.value,ids,region,transparent:format==='png'&&paper.value==='transparent'};resolveExport(editor.board,choice);result=choice;d.close();}catch(e){error.textContent=e.message;}},'primary'));
 d.append(el('h2',`Export ${format==='pdf'?'PDF':format.toUpperCase()}`),label,custom,paperLabel,...(format==='png'?[el('p','Transparent removes the canvas paper and grid. Object fills and backgrounds inside imported images or PDF pages remain.','muted')]:[]),el('p','Selection export includes only selected objects. View and rectangle exports crop all objects to the chosen area. Whole A4 lessons print one sheet per page; other areas print on one landscape page.','muted'),error,actions);document.body.append(d);
 return new Promise(resolve=>{d.onclose=()=>{d.remove();resolve(result);};d.showModal();scope.focus();});
}
