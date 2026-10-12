import { compileExpression } from './expression.js?v=20261012-page-navigation';
export const CURVE_STYLES=Object.freeze({solid:{label:'Solid',dash:0,pattern:''},dotted:{label:'Dotted',dash:1,pattern:'2 2'},dashed:{label:'Dashed',dash:3,pattern:'10 10'},'long-dashed':{label:'Long dashed',dash:4,pattern:'20 20'}});
export const CURVE_WIDTHS=Object.freeze([1,2,3,4,6,8]);
export function curveAppearance(row){return {strokeColor:row.color,strokeWidth:row.lineWidth??3,dash:CURVE_STYLES[row.lineStyle||'solid'].dash,lineCap:'butt'};}
export function validateSeries(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>8)throw new Error('Use 1–8 graph curves.');
 for(const row of rows){
  if(!row||typeof row.source!=='string'||row.source.length>400||!/^#[0-9a-f]{6}$/i.test(row.color)||typeof row.visible!=='boolean')throw new Error('Invalid graph expression, color or visibility.');
  if(row.lineStyle!==undefined&&(typeof row.lineStyle!=='string'||!Object.hasOwn(CURVE_STYLES,row.lineStyle)))throw new Error('Invalid graph line style.');
  if(row.lineWidth!==undefined&&!CURVE_WIDTHS.includes(row.lineWidth))throw new Error('Use a graph line width of 1, 2, 3, 4, 6 or 8 pixels.');
  if(row.kind!==undefined&&!['function','parametric','polar'].includes(row.kind))throw new Error('Unknown graph curve type.');
  if(row.kind==='polar'&&(![row.tmin,row.tmax].every(Number.isFinite)||row.tmin>=row.tmax||Math.abs(row.tmin)>100000||Math.abs(row.tmax)>100000))throw new Error('Use valid angle bounds: minimum smaller than maximum.');
  if(row.kind==='parametric'&&(typeof row.xSource!=='string'||row.xSource.length>400||![row.tmin,row.tmax].every(Number.isFinite)||row.tmin>=row.tmax||Math.abs(row.tmin)>100000||Math.abs(row.tmax)>100000))throw new Error('Use x(t), y(t) and valid t bounds: minimum smaller than maximum.');
 }
 return rows;
}
export function graphSeries(source,parameters=[]){
 validateParameters(parameters);const constants=Object.fromEntries(parameters.map(p=>[p.name,p.value]));
 const rows=typeof source==='string'?[{source,color:'#147d92',visible:true}]:structuredClone(source);
 validateSeries(rows);for(const row of rows)compileSeries(row,constants);
 if(!rows.some(r=>r.visible))throw new Error('Show at least one curve.');return rows;
}
export function compileSeries(row,parameters={}){
 if(row.kind==='polar'){const radius=compileExpression(row.source,'t',parameters);const coordinate=(t,trig)=>{const r=radius(t);return Number.isFinite(r)?r*trig(t):NaN;};return {x:t=>coordinate(t,Math.cos),y:t=>coordinate(t,Math.sin)};}
 const variable=row.kind==='parametric'?'t':'x',y=compileExpression(row.source,variable,parameters),x=row.kind==='parametric'?compileExpression(row.xSource,'t',parameters):t=>t;
 const point=t=>{const a=x(t),b=y(t);return Number.isFinite(a)&&Number.isFinite(b)?[a,b]:[NaN,NaN];};
 return {x:t=>point(t)[0],y:t=>point(t)[1]};
}
export function seriesLabels(row){return row.kind==='polar'?[`r(t) = ${row.source}`,`${row.tmin} ≤ t ≤ ${row.tmax} (radians)`]:row.kind==='parametric'?[`x(t) = ${row.xSource}; y(t) = ${row.source}`,`${row.tmin} ≤ t ≤ ${row.tmax}`]:['y = '+row.source];}

export function validateParameters(parameters=[]){
 if(!Array.isArray(parameters)||parameters.length>3)throw new Error('Use up to three parameters: a, b and c.');
 const names=new Set();for(const p of parameters){if(!p||!['a','b','c'].includes(p.name)||names.has(p.name)||![p.value,p.min,p.max].every(Number.isFinite)||p.min>=p.max||p.value<p.min||p.value>p.max||Math.abs(p.min)>100000||Math.abs(p.max)>100000)throw new Error('Use unique parameters a, b, c with finite values inside increasing bounds.');names.add(p.name);}return parameters;
}
