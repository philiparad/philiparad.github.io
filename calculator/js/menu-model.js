/* REA-065 — CASIO ES-family model-specific 96x31 LCD menu behavior.
 * Navigation: UP/DOWN between pages; number keys select local page items.
 * Reference: CASIO fx-991ES / ES PLUS / ES PLUS C printed manuals.
 */
(function(g){'use strict';
const RULES=Object.freeze({
 mode:Object.freeze({size:8,columns:2,title:'MODE'}),
 setup:Object.freeze({size:8,columns:2,title:'SETUP'}),
 'stat-type':Object.freeze({size:8,columns:2,title:'STAT'}),
 'stat-menu':Object.freeze({size:8,columns:2,title:'STAT'}),
 'stat-edit':Object.freeze({size:4,columns:2,title:'EDIT'}),
 'stat-sum':Object.freeze({size:8,columns:2,title:'SUM'}),
 'stat-var':Object.freeze({size:8,columns:2,title:'VAR'}),
 'stat-minmax':Object.freeze({size:8,columns:2,title:'MINMAX'}),
 'memory':Object.freeze({size:9,columns:3,title:'RCL'}),
 matrix:Object.freeze({size:8,columns:2,title:'MATRIX'}),
 vector:Object.freeze({size:8,columns:2,title:'VECTOR'}),
 'eqn-type':Object.freeze({size:4,columns:2,title:'EQN'}),
});
const fallback=Object.freeze({size:6,columns:2,title:'MENU'});
function rule(kind){return RULES[kind]||fallback}
// REA-071: explicit page-local numbered MODE choices from the three guides.
const MODE_PAGE_1=Object.freeze(['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']
 .map((label,index)=>Object.freeze({key:String(index+1),number:String(index+1),label,page:0})));
const MODE_PAGES=Object.freeze({'fx-991es-plus':Object.freeze([MODE_PAGE_1])});
function modePages(model){return MODE_PAGES['fx-991es-plus']}
function modeEntries(model){return modePages(model).flat()}
function modeSelection(model,pageIndex,key){
 const page=modePages(model)[pageIndex];
 return page?page.find(entry=>entry.key===String(key))||null:null;
}
function page(items,index,size){
 const total=Math.max(1,Math.ceil(items.length/size));
 const i=Math.max(0,Math.min(total-1,index));
 return {index:i,total,above:i>0,below:i<total-1,
  entries:items.slice(i*size,(i+1)*size)};
}
function navigate(index,key,count,size){
 const last=Math.max(0,Math.ceil(count/size)-1);
 if(key==='DOWN')return Math.min(last,index+1);
 if(key==='UP')return Math.max(0,index-1);
 return index;
}
function displayTitle(kind,title){
 const name=String(title||'MENU');
 if(kind==='setup'&&name!=='SETUP')
  return name.replace(/^SETUP\s*/,'').replace(/[^A-Za-z0-9 +/ -]/g,'').slice(0,15);
 return RULES[kind]?.title||name.replace(/[^A-Za-z0-9 +/ -]/g,'').slice(0,15);
}
function promptTitle(title){
 const name=String(title||'');
 if(name.startsWith('SOLVE'))return 'SOLVE';
 if(name.startsWith('d/dx'))return 'd/dx';
 if(name.startsWith('∫'))return 'INTEGRAL';
 if(name.startsWith('Σ'))return 'SUM';
 if(name.startsWith('Π'))return 'PRODUCT';
 if(name.startsWith('CALC'))return 'CALC';

 if(name.startsWith('TABLE'))return name.replace(/[^A-Za-z0-9 (),]/g,'').slice(0,21);

 return name.replace(/[^A-Za-z0-9 /-]/g,'').slice(0,21);
}
function promptField(field){
 const names={expression:'EXPR',at:'X =',guess:'X?',a:'LOWER',b:'UPPER',
 lower:'LOWER',upper:'UPPER',sigma:'SIGMA',mu:'MU',p:'p',n:'N',x:'x',
 area:'AREA',step:'STEP',tol:'TOL',value:'VALUE'};
 return names[field.id]||String(field.label||field.id).replace(/[^A-Za-z0-9 +-]/g,'').slice(0,16);
}
function label(item){
 const txt=String(item.label||'').replace(/^\s*\d+\.\s*/,'');
 return txt.replace(/[^A-Za-z0-9 +*/∠θ►^=.-]/g,'').slice(0,10);
}
const API=Object.freeze({RULES,rule,MODE_PAGES,modePages,modeEntries,modeSelection,page,navigate,displayTitle,promptTitle,promptField,label});
g.FreshMenuModel=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
