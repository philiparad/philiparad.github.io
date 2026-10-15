import {compileFunctions} from './named-functions.js?v=20261015-marker';
import {domainContains} from './graph-endpoints.js?v=20261015-marker';
import { compileExpression } from './expression.js?v=20261015-marker';
export const CURVE_STYLES=Object.freeze({solid:{label:'Solid',dash:0,pattern:''},dotted:{label:'Dotted',dash:1,pattern:'2 2'},dashed:{label:'Dashed',dash:3,pattern:'10 10'},'long-dashed':{label:'Long dashed',dash:4,pattern:'20 20'}});
export const CURVE_WIDTHS=Object.freeze([1,2,3,4,6,8]);
export function curveAppearance(row){return {strokeColor:row.color,strokeWidth:row.lineWidth??3,dash:CURVE_STYLES[row.lineStyle||'solid'].dash,lineCap:'butt'};}
export function validateSeries(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>8)throw new Error('Use 1–8 graph curves.');
 for(const row of rows){
  if(!row||typeof row.source!=='string'||row.source.length>400||!/^#[0-9a-f]{6}$/i.test(row.color)||typeof row.visible!=='boolean')throw new Error('Invalid graph expression, color or visibility.');
  if(row.lineStyle!==undefined&&(typeof row.lineStyle!=='string'||!Object.hasOwn(CURVE_STYLES,row.lineStyle)))throw new Error('Invalid graph line style.');
  if(row.lineWidth!==undefined&&!CURVE_WIDTHS.includes(row.lineWidth))throw new Error('Use a graph line width of 1, 2, 3, 4, 6 or 8 pixels.');
  for(const key of ['domainMin','domainMax'])if(row[key]!==undefined&&(!Number.isFinite(row[key])||Math.abs(row[key])>100000||['parametric','polar'].includes(row.kind)))throw new Error('Function domain bounds must be finite numbers between -100000 and 100000.');
  if(row.domainMin!==undefined&&row.domainMax!==undefined&&row.domainMin>=row.domainMax)throw new Error('Function domain minimum must be smaller than maximum.');
  for(const key of ['domainMinOpen','domainMaxOpen'])if(row[key]!==undefined&&(typeof row[key]!=='boolean'||['parametric','polar','piecewise'].includes(row.kind)))throw new Error('Invalid function endpoint setting.');
  if(row.kind!==undefined&&!['function','parametric','polar','piecewise'].includes(row.kind))throw new Error('Unknown graph curve type.');
  if(row.kind==='piecewise'){
   if(!Array.isArray(row.branches)||!row.branches.length||row.branches.length>8)throw new Error('Use 1–8 piecewise branches.');
   if(row.domainMin!==undefined||row.domainMax!==undefined)throw new Error('Set domains on each piecewise branch.');
   for(const branch of row.branches){if(!branch||typeof branch!=='object'||Array.isArray(branch))throw new Error('Invalid piecewise branch.');validateSeries([{source:branch.source,domainMin:branch.domainMin,domainMax:branch.domainMax,domainMinOpen:branch.domainMinOpen,domainMaxOpen:branch.domainMaxOpen,color:row.color,visible:true}]);}
   const ordered=[...row.branches].sort((a,b)=>(a.domainMin??-Infinity)-(b.domainMin??-Infinity));for(let k=1;k<ordered.length;k++){const left=ordered[k-1],right=ordered[k],hi=left.domainMax??Infinity,lo=right.domainMin??-Infinity;if(lo<hi||(lo===hi&&left.domainMaxOpen===false&&right.domainMinOpen!==true))throw new Error('Piecewise branch intervals must not overlap; shared endpoints can belong to only one branch.');}
  }
  if(row.kind==='polar'&&(![row.tmin,row.tmax].every(Number.isFinite)||row.tmin>=row.tmax||Math.abs(row.tmin)>100000||Math.abs(row.tmax)>100000))throw new Error('Use valid angle bounds: minimum smaller than maximum.');
  if(row.kind==='parametric'&&(typeof row.xSource!=='string'||row.xSource.length>400||![row.tmin,row.tmax].every(Number.isFinite)||row.tmin>=row.tmax||Math.abs(row.tmin)>100000||Math.abs(row.tmax)>100000))throw new Error('Use x(t), y(t) and valid t bounds: minimum smaller than maximum.');
 }
 return rows;
}
export function graphSeries(source,parameters=[],definitions=[]){
 validateParameters(parameters);const constants=Object.fromEntries(parameters.map(p=>[p.name,p.value]));
 const rows=typeof source==='string'?[{source,color:'#147d92',visible:true}]:structuredClone(source);
 const functions=compileFunctions(definitions,constants);validateSeries(rows);for(const row of rows)compileSeries(row,constants,functions);
 if(!rows.some(r=>r.visible))throw new Error('Show at least one curve.');return rows;
}
export function compileSeries(row,parameters={},functions={}){
 if(row.kind==='piecewise'){const pieces=piecewiseRows(row).map(r=>({row:r,fn:compileSeries(r,parameters,functions)}));const point=x=>{const piece=pieces.find(p=>domainContains(p.row,x));return piece?[piece.fn.x(x),piece.fn.y(x)]:[NaN,NaN];};return {x:t=>point(t)[0],y:t=>point(t)[1]};}
 if(row.kind==='polar'){const radius=compileExpression(row.source,'t',parameters,functions);const coordinate=(t,trig)=>{const r=radius(t);return Number.isFinite(r)?r*trig(t):NaN;};return {x:t=>coordinate(t,Math.cos),y:t=>coordinate(t,Math.sin)};}
 const variable=row.kind==='parametric'?'t':'x',y=compileExpression(row.source,variable,parameters,functions),x=row.kind==='parametric'?compileExpression(row.xSource,'t',parameters,functions):t=>t;
 const point=t=>{if(!domainContains(row,t))return [NaN,NaN];const a=x(t),b=y(t);return Number.isFinite(a)&&Number.isFinite(b)?[a,b]:[NaN,NaN];};
 return {x:t=>point(t)[0],y:t=>point(t)[1]};
}
export function seriesLabels(row){if(row.kind==='piecewise')return piecewiseRows(row).flatMap((branch,k)=>[`Branch ${k+1}: y = ${branch.source}`,...domainLabels(branch)]);return row.kind==='polar'?[`r(t) = ${row.source}`,`${row.tmin} ≤ t ≤ ${row.tmax} (radians)`]:row.kind==='parametric'?[`x(t) = ${row.xSource}; y(t) = ${row.source}`,`${row.tmin} ≤ t ≤ ${row.tmax}`]:[ 'y = '+row.source, ...domainLabels(row) ];}

export function validateParameters(parameters=[]){
 if(!Array.isArray(parameters)||parameters.length>3)throw new Error('Use up to three parameters: a, b and c.');
 const names=new Set();for(const p of parameters){if(!p||!['a','b','c'].includes(p.name)||names.has(p.name)||![p.value,p.min,p.max].every(Number.isFinite)||p.min>=p.max||p.value<p.min||p.value>p.max||Math.abs(p.min)>100000||Math.abs(p.max)>100000)throw new Error('Use unique parameters a, b, c with finite values inside increasing bounds.');names.add(p.name);}return parameters;
}

export function domainLabels(row){if(row.domainMin===undefined&&row.domainMax===undefined)return [];return [row.domainMin!==undefined&&row.domainMax!==undefined?`${row.domainMin} ${row.domainMinOpen?'<':'≤'} x ${row.domainMaxOpen?'<':'≤'} ${row.domainMax}`:row.domainMin!==undefined?`x ${row.domainMinOpen?'>':'≥'} ${row.domainMin}`:`x ${row.domainMaxOpen?'<':'≤'} ${row.domainMax}`];}
export function functionPlotBounds(row,range){const lo=Math.max(range[0],row.domainMin??-Infinity),hi=Math.min(range[2],row.domainMax??Infinity);return lo<hi?[lo,hi]:null;}

export function piecewiseRows(row){return row.kind==='piecewise'?row.branches.map(b=>({source:b.source,domainMin:b.domainMin,domainMax:b.domainMax,domainMinOpen:b.domainMinOpen??false,domainMaxOpen:b.domainMaxOpen??true,color:row.color,visible:row.visible,lineStyle:row.lineStyle,lineWidth:row.lineWidth})): [row];}
