/* REA-065 — CASIO ES-family model-specific 96x31 LCD menu behavior.
 * Navigation: UP/DOWN between pages; number keys select local page items.
 * Reference: CASIO fx-991ES / ES PLUS / ES PLUS C printed manuals.
 */
(function(g){'use strict';
const RULES=Object.freeze({
 mode:Object.freeze({size:8,columns:2,title:'MODE'}),
 setup:Object.freeze({size:8,columns:2,title:'SETUP'}),
 'stat-type':Object.freeze({size:8,columns:2,title:'STAT'}),
 'dist-type':Object.freeze({size:4,columns:2,title:'DIST'}),
 'dist-input':Object.freeze({size:2,columns:2,title:'DIST'}),
 'stat-menu':Object.freeze({size:8,columns:2,title:'STAT'}),
 'stat-edit':Object.freeze({size:4,columns:2,title:'EDIT'}),
 'stat-sum':Object.freeze({size:8,columns:2,title:'SUM'}),
 'stat-var':Object.freeze({size:8,columns:2,title:'VAR'}),
 'stat-minmax':Object.freeze({size:8,columns:2,title:'MINMAX'}),
 'memory':Object.freeze({size:9,columns:3,title:'RCL'}),
 matrix:Object.freeze({size:8,columns:2,title:'MATRIX'}),
 vector:Object.freeze({size:8,columns:2,title:'VECTOR'}),
 'eqn-type':Object.freeze({size:4,columns:2,title:'EQN'}),
 'ineq-type':Object.freeze({size:2,columns:2,title:'INEQ'}),
 'ineq-relation':Object.freeze({size:4,columns:2,title:'INEQ'}),
 'verify-relations':Object.freeze({size:6,columns:2,title:'VERIFY'}),
 'dist-edit':Object.freeze({size:4,columns:2,title:'EDIT'})
});
const fallback=Object.freeze({size:6,columns:2,title:'MENU'});
function rule(kind){return RULES[kind]||fallback}
function modeEntries(model){
 const common=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR'];
 const extended=['INEQ','VERIF','DIST'];
 const labels=model==='fx-991es-plus-c'?[...common,...extended]:common;
 return labels.map((name,index)=>({number:String(index<8?index+1:index-7),label:name}));
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
 return RULES[kind]?.title||String(title||'MENU').replace(/[^A-Za-z0-9 +/ -]/g,'').slice(0,15);
}
function label(item){
 const txt=String(item.label||'').replace(/^\s*\d+\.\s*/,'');
 return txt.replace(/[^A-Za-z0-9 +*/∠θ►^=.-]/g,'').slice(0,10);
}
const API=Object.freeze({RULES,rule,modeEntries,page,navigate,displayTitle,label});
g.FreshMenuModel=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
