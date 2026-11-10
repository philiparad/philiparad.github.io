/* REA-051 — EQN quadratic/cubic and 2x2/3x3 linear systems, real outputs. */
(function(g){'use strict';
const TYPES=Object.freeze([
 {id:'LINEAR2',label:'2 unknowns',fields:['a1','b1','c1','a2','b2','c2']},
 {id:'LINEAR3',label:'3 unknowns',fields:['a1','b1','c1','d1','a2','b2','c2','d2','a3','b3','c3','d3']},
 {id:'QUAD',label:'Quadratic',fields:['a','b','c']},
 {id:'CUBIC',label:'Cubic',fields:['a','b','c','d']}
]);
const fail=(message='Math ERROR')=>{throw Error(message)};
const val=v=>{const n=Number(v);if(!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fail('Argument ERROR');return n};
const round=v=>{if(!Number.isFinite(v)||Math.abs(v)>9.999999999e99)fail();return Math.abs(v)<1e-13?0:v};
const format=n=>String(Number(round(n).toPrecision(12)));
function record(type,pairs,status='ok',nonRealCount=0){
 return {type,status,nonRealCount,solutions:pairs.map(([label,value])=>({label,value:round(value),text:label+' = '+format(value)}))};
}
function systems(rows){
 const n=rows.length;if(![2,3].includes(n)||rows.some(r=>r.length!==n+1))fail('Argument ERROR');
 const m=rows.map(r=>r.map(val)),original=m.map(r=>r.slice());
 const scale=Math.max(1,...m.flat().map(Math.abs));
 const cols=[];let rank=0;
 for(let c=0;c<n;c++){
  let pivot=rank;for(let k=rank+1;k<n;k++)if(Math.abs(m[k][c])>Math.abs(m[pivot][c]))pivot=k;
  if(Math.abs(m[pivot][c])<=scale*1e-12)continue;
  [m[rank],m[pivot]]=[m[pivot],m[rank]];
  const div=m[rank][c];for(let j=c;j<=n;j++)m[rank][j]/=div;
  for(let k=0;k<n;k++)if(k!==rank){const f=m[k][c];for(let j=c;j<=n;j++)m[k][j]-=f*m[rank][j]}
  cols.push(c);rank++;
 }
 for(let i=rank;i<n;i++)if(Math.abs(m[i][n])>1e-9)return record('LINEAR'+n,[],'No Solution');
 if(rank<n)return record('LINEAR'+n,[],'Infinite Solutions');
 const roots=Array(n).fill(0);cols.forEach((col,r)=>roots[col]=round(m[r][n]));
 for(const r of original){
  const error=r.slice(0,n).reduce((sum,k,i)=>sum+k*roots[i],-r[n]);
  if(Math.abs(error)>1e-8*Math.max(1,...r.map(Math.abs)))fail();
 }
 return record('LINEAR'+n,roots.map((v,i)=>[['X','Y','Z'][i],v]));
}
function quadratic(coeff){
 if(coeff.length!==3)fail('Argument ERROR');
 const [a,b,c]=coeff.map(val);if(a===0)fail();
 const d=b*b-4*a*c;if(!Number.isFinite(d))fail();
 const tol=1e-13*Math.max(1,Math.abs(b*b),Math.abs(4*a*c));
 if(d< -tol)return record('QUAD',[],'No Real Roots',2);
 let roots;
 if(Math.abs(d)<=tol)roots=[-b/(2*a)];
 else{const root=Math.sqrt(Math.max(0,d)),q=-.5*(b+Math.sign(b||1)*root);roots=q===0?[-b/(2*a)]:[q/a,c/q]}
 roots.sort((x,y)=>x-y);
 return record('QUAD',roots.map((x,i)=>[roots.length===1?'X':'X'+(i+1),x]));
}
function cubic(coeff){
 if(coeff.length!==4)fail('Argument ERROR');
 const [a,b,c,d]=coeff.map(val);if(!a)fail();
 const A=b/a,B=c/a,C=d/a,p=B-A*A/3,q=2*A*A*A/27-A*B/3+C;
 const delta=q*q/4+p*p*p/27;if(!Number.isFinite(delta))fail();
 const tol=1e-13*Math.max(1,Math.abs(q*q/4),Math.abs(p*p*p/27));
 let roots,nonReal=0;
 if(delta>tol){const root=Math.sqrt(delta);roots=[Math.cbrt(-q/2+root)+Math.cbrt(-q/2-root)-A/3];nonReal=2}
 else if(delta< -tol){
  const magnitude=2*Math.sqrt(-p/3),angle=Math.acos(Math.max(-1,Math.min(1,-q/(2*Math.sqrt(-(p*p*p)/27)))));
  roots=[0,1,2].map(k=>magnitude*Math.cos((angle-2*Math.PI*k)/3)-A/3).sort((x,y)=>x-y);
 }else{const u=Math.cbrt(-q/2);roots=[2*u-A/3,-u-A/3,-u-A/3].sort((x,y)=>x-y)}
 return record('CUBIC',roots.map((x,i)=>['X'+(i+1),x]),nonReal?'1 Real Root':'ok',nonReal);
}
function solve(type,values){
 const t=TYPES.find(item=>item.id===type);if(!t)fail('Argument ERROR');
 const nums=t.fields.map(key=>val(values[key]));
 if(type==='QUAD')return quadratic(nums);
 if(type==='CUBIC')return cubic(nums);
 const width=type==='LINEAR3'?4:3,rows=[];
 for(let i=0;i<nums.length;i+=width)rows.push(nums.slice(i,i+width));
 return systems(rows);
}
g.FreshEquation=Object.freeze({TYPES,solve,systems,quadratic,cubic,format});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshEquation;
})(typeof window!=='undefined'?window:globalThis);
