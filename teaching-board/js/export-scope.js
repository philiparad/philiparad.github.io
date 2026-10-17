import { printPageIndexes } from './print-page-selection.js?v=20261017-history-patches';
import { el, btn, field } from './ui.js?v=20261017-history-patches';
import { bounds, union } from './scene.js?v=20261017-history-patches';
import { visualBounds } from './visibility.js?v=20261017-history-patches';

export function viewRegion(viewport,width,height){
 return {x:-viewport.x/viewport.zoom,y:-viewport.y/viewport.zoom,w:width/viewport.zoom,h:height/viewport.zoom};
}
export function validRegion(region){
 if(!region||!['x','y','w','h'].every(k=>Number.isFinite(region[k]))||Math.abs(region.x)>=1e7||Math.abs(region.y)>=1e7||region.w<=0||region.h<=0||region.w>100000||region.h>100000)throw new Error('Enter finite coordinates and a width and height greater than 0, up to 100,000.');
 return {...region};
}
export function exportPadding(value=30){if(!Number.isFinite(value)||value<0||value>1000)throw new Error('Use padding from 0 to 1,000 canvas units.');return value;}
export function rasterSize(width,height,scale=2){
 if(![width,height,scale].every(Number.isFinite)||width<=0||height<=0||![1,2,3,4].includes(scale))throw new Error('Choose a PNG resolution from 1× to 4×.');
 const actual=Math.min(scale,8000/Math.max(width,height),Math.sqrt(24000000/(width*height)));
 return {width:Math.max(1,Math.floor(width*actual)),height:Math.max(1,Math.floor(height*actual)),limited:actual<scale};
}
export function resolveExport(board,options={scope:'all'}){
 const {scope='all'}=options,padding=exportPadding(options.padding);
 if(scope==='all')return {board,region:null};
 if(scope==='pages')return {board,region:null,pages:printPageIndexes(board,options.pageRange)};
 if(scope==='selection'){
  const ids=new Set(options.ids||[]),items=board.items.filter(i=>ids.has(i.id));
  if(!items.length)throw new Error('Select at least one object before exporting a selection.');
  const boxes=items.map(i=>visualBounds(i)||bounds(i)),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  const region={x:x-padding,y:y-padding,w:Math.max(...boxes.map(b=>b.x+b.w))-x+2*padding,h:Math.max(...boxes.map(b=>b.y+b.h))-y+2*padding};
  return {board:{...board,items},region};
 }
 if(scope==='view'||scope==='region')return {board,region:validRegion(options.region)};
 throw new Error('Choose a valid export area.');
}
export function exportScopeDialog(editor,format){
 const d=el('dialog',null,'form-dialog'),scope=el('select'),label=el('label','Export area'),error=el('p',null,'error'),actions=el('div',null,'actions'),custom=el('div');
 const paper=el('select'),paperLabel=el('label','PNG background');paper.setAttribute('aria-label','PNG background');for(const [value,text]of [['board','Board paper'],['transparent','Transparent']]){const option=el('option',text);option.value=value;paper.append(option);}paperLabel.append(paper);paperLabel.hidden=format!=='png';
 const paddingField=field('Padding (canvas units)',30,'number');paddingField.input.min=0;paddingField.input.max=1000;const resolution=el('select'),resolutionLabel=el('label','PNG resolution'),sizeLabel=el('p',null,'muted');resolution.setAttribute('aria-label','PNG resolution');for(const value of [1,2,3,4]){const option=el('option',`${value}×`);option.value=value;resolution.append(option);}resolution.value='2';resolutionLabel.append(resolution);resolutionLabel.hidden=format!=='png';
 const pageRange=field('A4 pages to export',editor.board.pageCount>1?`1-${editor.board.pageCount}`:'1'),pageHint=el('p',null,'muted');pageRange.input.placeholder='1, 3-5';
 const ids=[...editor.selected],view=viewRegion(editor.board.viewport,editor.area.clientWidth,editor.area.clientHeight);let result=null;
 scope.setAttribute('aria-label','Export area');
 for(const [value,text]of [['all','Entire lesson'],['selection',`Selected objects (${ids.length})`],['view','Current canvas view'],['region','Custom rectangle']]){const o=el('option',text);o.value=value;o.disabled=value==='selection'&&!ids.length;scope.append(o);}
 if(format==='pdf'&&editor.board.layout==='a4'){const o=el('option','Selected A4 pages');o.value='pages';scope.append(o);}
 const inputs={};for(const [key,text]of [['x','Left (canvas units)'],['y','Top (canvas units)'],['w','Width (canvas units)'],['h','Height (canvas units)']]){const f=field(text,Math.round(view[key]*100)/100,'number');f.input.step='any';inputs[key]=f.input;custom.append(f.wrap);}
 function choice(){const region=scope.value==='region'?Object.fromEntries(Object.entries(inputs).map(([k,input])=>[k,input.value.trim()===''?NaN:Number(input.value)])):view;const fixed=scope.value==='pages'||scope.value==='region'||scope.value==='view'||format==='pdf'&&editor.board.layout==='a4'&&scope.value==='all';return {scope:scope.value,ids,region,...(scope.value==='pages'?{pageRange:pageRange.input.value}:{}),transparent:format==='png'&&paper.value==='transparent',padding:fixed?30:paddingField.input.value.trim()===''?NaN:Number(paddingField.input.value),scale:format==='png'?Number(resolution.value):2};}
 function update(){custom.hidden=scope.value!=='region';pageRange.wrap.hidden=pageHint.hidden=scope.value!=='pages';paddingField.wrap.hidden=['view','region','pages'].includes(scope.value)||format==='pdf'&&editor.board.layout==='a4'&&scope.value==='all';error.textContent='';sizeLabel.textContent='';if(scope.value==='pages'){try{const pages=printPageIndexes(editor.board,pageRange.input.value);pageHint.textContent=`${pages.length} of ${editor.board.pageCount||1} A4 pages. Exported once each in document order.`;}catch(e){pageHint.textContent=e.message;}}if(format!=='png')return;try{const value=choice(),resolved=resolveExport(editor.board,value),b=resolved.region||union(resolved.board.items),extra=resolved.region?0:2*value.padding,size=rasterSize(Math.ceil(b.w+extra),Math.ceil(b.h+extra),value.scale);sizeLabel.textContent=`PNG: ${size.width} × ${size.height} pixels${size.limited?' (reduced to the 8,000-pixel / 24-megapixel limit)':''}`;}catch(e){sizeLabel.textContent=e.message;}}
 pageRange.input.oninput=update;scope.onchange=update;resolution.onchange=update;paddingField.input.oninput=update;for(const input of Object.values(inputs))input.oninput=update;label.append(scope);
 actions.append(btn('Cancel',()=>d.close()),btn('Export',()=>{try{const value=choice();resolveExport(editor.board,value);if(format==='png')rasterSize(1,1,value.scale);result=value;d.close();}catch(e){error.textContent=e.message;}},'primary'));
 scope.value='all';update();
 d.append(el('h2',`Export ${format==='pdf'?'PDF':format.toUpperCase()}`),label,pageRange.wrap,pageHint,custom,paddingField.wrap,resolutionLabel,sizeLabel,paperLabel,...(format==='png'?[el('p','Transparent removes the canvas paper and grid. Object fills and backgrounds inside imported images or PDF pages remain.','muted')]:[]),el('p','Selection export includes only selected objects. View and rectangle exports crop all objects to the chosen area. Whole A4 lessons print one sheet per page; other areas print on one landscape page.','muted'),error,actions);document.body.append(d);
 return new Promise(resolve=>{d.onclose=()=>{d.remove();resolve(result);};d.showModal();scope.focus();});
}
