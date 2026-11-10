/* REA-058 — true quadratic and cubic real inequality solution sets. */
(function(g){'use strict';
const OPS=['<','<=','>','>='];
function fail(message='Argument ERROR'){throw Error(message)}
function valid(v){const n=Number(v);if(String(v).trim()===''||!Number.isFinite(n)||Math.abs(n)>9.999999999e99)fail();return n}
function equal(x,y){return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<=1e-9*Math.max(1,Math.abs(x),Math.abs(y))}
function roots(coeff){
 const values=coeff.map(valid),degree=values.length-1;
 if((degree!==2&&degree!==3)||values[0]===0)fail('Math ERROR');
 const answer=degree===2?g.FreshEquation.quadratic(values):g.FreshEquation.cubic(values);
 const distinct=[];
 for(const x of answer.solutions.filter(s=>typeof s.value==='number').map(s=>s.value).sort((a,b)=>a-b)){
  if(!distinct.length||!equal(distinct[distinct.length-1],x))distinct.push(x);
 }
 const multiplicity=distinct.map(()=>1);
 if(degree===2&&distinct.length===1)multiplicity[0]=2;
 if(degree===3){
  if(distinct.length===1)multiplicity[0]=answer.nonRealCount===2?1:3;
  if(distinct.length===2){
   const [a,b,c]=values;
   const norm=x=>Math.max(1,Math.abs(3*a*x*x),Math.abs(2*b*x),Math.abs(c));
   const test=x=>Math.abs(3*a*x*x+2*b*x+c)/norm(x);
   multiplicity[test(distinct[0])<=test(distinct[1])?0:1]=2;
  }
 }
 return {degree,values,zeros:distinct,multiplicity};
}
function solve(coeff,operator){
 if(!OPS.includes(operator))fail();
 const poly=roots(coeff),{zeros,multiplicity}=poly;
 const inclusive=operator.includes('='),inside=sign=>operator[0]==='<'?sign<0:sign>0;
 const signs=Array(zeros.length+1);
 signs[zeros.length]=Math.sign(poly.values[0]);
 for(let i=zeros.length-1;i>=0;i--)signs[i]=signs[i+1]*(multiplicity[i]%2?-1:1);
 const raw=[];
 for(let i=0;i<=zeros.length;i++){
  if(inside(signs[i]))raw.push({lo:i?zeros[i-1]:-Infinity,hi:i<zeros.length?zeros[i]:Infinity,loClosed:false,hiClosed:false});
  if(i<zeros.length&&inclusive)raw.push({lo:zeros[i],hi:zeros[i],loClosed:true,hiClosed:true});
 }
 const intervals=[];
 for(const part of raw){
  const previous=intervals[intervals.length-1];
  if(previous&&equal(previous.hi,part.lo)&&(previous.hiClosed||part.loClosed)){
   previous.hi=part.hi;previous.hiClosed=part.hiClosed;
  }else intervals.push({...part});
 }
 return {...poly,operator,signs,intervals,empty:intervals.length===0,
  allReal:intervals.length===1&&intervals[0].lo===-Infinity&&intervals[0].hi===Infinity};
}
function num(value){return String(Number(value.toPrecision(12)))}
function interval(i){
 if(i.lo===-Infinity&&i.hi===Infinity)return 'All real X';
 if(i.lo===i.hi)return 'X = '+num(i.lo);
 if(i.lo===-Infinity)return 'X '+(i.hiClosed?'≤':'<')+' '+num(i.hi);
 if(i.hi===Infinity)return 'X '+(i.loClosed?'≥':'>')+' '+num(i.lo);
 return num(i.lo)+' '+(i.loClosed?'≤':'<')+' X '+(i.hiClosed?'≤':'<')+' '+num(i.hi);
}
function format(r){return r.empty?'No solution':r.intervals.map(interval).join(' OR ')}
function lines(r){
 if(r.empty||r.allReal)return [format(r)];
 return r.intervals.map(interval);
}
g.FreshInequality=Object.freeze({OPS,roots,solve,interval,format,lines});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshInequality;
})(typeof window!=='undefined'?window:globalThis);
