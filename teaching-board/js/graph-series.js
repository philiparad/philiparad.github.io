import { compileExpression } from './expression.js?v=20261006-parametric';
export function validateSeries(rows){
 if(!Array.isArray(rows)||!rows.length||rows.length>8)throw new Error('Use 1–8 graph curves.');
 for(const row of rows){
  if(!row||typeof row.source!=='string'||row.source.length>400||!/^#[0-9a-f]{6}$/i.test(row.color)||typeof row.visible!=='boolean')throw new Error('Invalid graph expression, color or visibility.');
  if(row.kind!==undefined&&!['function','parametric'].includes(row.kind))throw new Error('Unknown graph curve type.');
  if(row.kind==='parametric'&&(typeof row.xSource!=='string'||row.xSource.length>400||![row.tmin,row.tmax].every(Number.isFinite)||row.tmin>=row.tmax||Math.abs(row.tmin)>100000||Math.abs(row.tmax)>100000))throw new Error('Use x(t), y(t) and valid t bounds: minimum smaller than maximum.');
 }
 return rows;
}
export function graphSeries(source){
 const rows=typeof source==='string'?[{source,color:'#147d92',visible:true}]:structuredClone(source);
 validateSeries(rows);for(const row of rows)compileSeries(row);
 if(!rows.some(r=>r.visible))throw new Error('Show at least one curve.');return rows;
}
export function compileSeries(row){
 const variable=row.kind==='parametric'?'t':'x',y=compileExpression(row.source,variable),x=row.kind==='parametric'?compileExpression(row.xSource,'t'):t=>t;
 const point=t=>{const a=x(t),b=y(t);return Number.isFinite(a)&&Number.isFinite(b)?[a,b]:[NaN,NaN];};
 return {x:t=>point(t)[0],y:t=>point(t)[1]};
}
export function seriesLabels(row){return row.kind==='parametric'?[`x(t) = ${row.xSource}; y(t) = ${row.source}`,`${row.tmin} ≤ t ≤ ${row.tmax}`]:['y = '+row.source];}
