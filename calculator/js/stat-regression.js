/* REA-048: independent weighted STAT regression models; no firmware or eval. */
(function(g){'use strict';
const TYPES=Object.freeze([['1VAR','1-VAR'],['LIN','A+BX'],['QUAD','_+CX2'],['LOG','ln X'],['EXP','e^X'],['ABEXP','A*B^X'],['POWER','A*X^B'],['INV','1/X']].map(([id,label],i)=>Object.freeze({id,label,paired:i>0})));
const fail=(reason='Math ERROR')=>{throw Error(reason)};
const finite=v=>{if(!Number.isFinite(v)||Math.abs(v)>9.999999999e99)fail();return v};
function observations(t){
 if(!t||!Array.isArray(t.rows))fail('Argument ERROR');
 let n=0;const rows=[];
 for(const r of t.rows){
  if(r.X===null){if(t.paired&&r.Y!==null)fail('Argument ERROR');continue}
  if(!Number.isFinite(r.X)||t.paired&&!Number.isFinite(r.Y))fail('Argument ERROR');
  const w=t.frequency?r.FREQ:1;
  if(!Number.isInteger(w)||w<0||w>100000)fail('Argument ERROR');
  if(!w)continue;n+=w;if(n>100000)fail('Data Full');
  rows.push({x:finite(r.X),y:t.paired?finite(r.Y):0,w});
 }
 if(!n)fail('Argument ERROR');
 return {rows,n};
}
// REA-106: a 1-VAR standard deviation can be representable even when
// ΣX² and Σ(X-mean)² exceed the calculator's displayable number range.
// Use scaled, weighted residuals to compute σ without squaring huge X.
// Keep aggregate sums as raw numbers: REG.format() enforces range if a
// user explicitly requests an unavailable Sum X / Sum X2 value.
function oneVarSummary(rows,n){
 const sumX=rows.reduce((sum,r)=>sum+r.w*r.x,0);
 const sumX2=rows.reduce((sum,r)=>sum+r.w*r.x*r.x,0);
 // Use folds; spreading a large STAT table into Math.max overflows
 // the JavaScript argument stack on some engines.
 const maxX=rows.reduce((max,r)=>Math.max(max,Math.abs(r.x)),0);
 const scaledMean=maxX===0?0:rows.reduce(
  (sum,r)=>sum+r.w*(r.x/maxX),0)/n*maxX;
 const meanX=finite(
  Number.isFinite(sumX)&&Math.abs(sumX)<=9.999999999e99?
   sumX/n:scaledMean);
 const maxDelta=rows.reduce((max,r)=>Math.max(max,Math.abs(r.x-meanX)),0);
 const scaledVariance=maxDelta===0?0:rows.reduce((sum,r)=>{
  const d=(r.x-meanX)/maxDelta;
  return sum+r.w*d*d;
 },0)/n;
 const sdX=finite(maxDelta*Math.sqrt(scaledVariance));
 // A sample σ can exceed the LCD range even when the population σ is
 // valid. Preserve it internally; parameter selection enforces the limit.
 const sampleSDX=n>1?sdX*Math.sqrt(n/(n-1)):null;
 return {n,sumX,sumX2,meanX,varianceX:sdX*sdX,sdX,sampleSDX,
  minX:rows.reduce((min,r)=>Math.min(min,r.x),Infinity),
  maxX:rows.reduce((max,r)=>Math.max(max,r.x),-Infinity)};
}
function summary(t){
 const {rows,n}=observations(t);
 if(!t.paired)return oneVarSummary(rows,n);
 // REA-107: paired STAT's Var and MinMax commands do not depend on
 // potentially unrepresentable Sum X² / Sum Y² / cross moments.
 // Delay range checks until an aggregate is actually selected.
 const xStats=oneVarSummary(rows,n);
 const yStats=oneVarSummary(rows.map(r=>({x:r.y,w:r.w})),n);
 const rawSum=fn=>rows.reduce((sum,r)=>sum+r.w*fn(r),0);
 const out={
  n,sumX:xStats.sumX,sumX2:xStats.sumX2,
  meanX:xStats.meanX,varianceX:xStats.varianceX,
  sdX:xStats.sdX,sampleSDX:xStats.sampleSDX,
  minX:xStats.minX,maxX:xStats.maxX,
  sumY:yStats.sumX,sumY2:yStats.sumX2,
  meanY:yStats.meanX,varianceY:yStats.varianceX,
  sdY:yStats.sdX,sampleSDY:yStats.sampleSDX,
  minY:yStats.minX,maxY:yStats.maxX,
  sumXY:rawSum(r=>r.x*r.y),
  sumX3:rawSum(r=>r.x**3),
  sumX2Y:rawSum(r=>r.x*r.x*r.y),
  sumX4:rawSum(r=>r.x**4)
 };
 return out;
}
function linear(rows){
 const n=rows.reduce((v,r)=>v+r.w,0),mx=rows.reduce((v,r)=>v+r.w*r.x,0)/n,my=rows.reduce((v,r)=>v+r.w*r.y,0)/n;
 let xx=0,yy=0,xy=0;
 for(const r of rows){const dx=r.x-mx,dy=r.y-my;xx+=r.w*dx*dx;yy+=r.w*dy*dy;xy+=r.w*dx*dy}
 if(!Number.isFinite(xx)||xx<=0)fail();
 const B=finite(xy/xx),A=finite(my-B*mx),correlation=yy>0?Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))):null;
 return {A,B,correlation};
}
function gaussian3(m,b){
 const a=m.map((v,i)=>[...v,b[i]]);
 for(let i=0;i<3;i++){
  let p=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[p][i]))p=j;
  if(!Number.isFinite(a[p][i])||Math.abs(a[p][i])<1e-13)fail();
  [a[p],a[i]]=[a[i],a[p]];
  const d=a[i][i];for(let k=i;k<4;k++)a[i][k]/=d;
  for(let j=0;j<3;j++)if(j!==i){const q=a[j][i];for(let k=i;k<4;k++)a[j][k]-=q*a[i][k]}
 }
 return a.map(v=>finite(v[3]));
}
function quad(rows){
 const n=rows.reduce((v,r)=>v+r.w,0),center=rows.reduce((v,r)=>v+r.w*r.x,0)/n;
 const span=rows.reduce((max,r)=>Math.max(max,Math.abs(r.x-center)),0);if(!Number.isFinite(span)||span<=0)fail();
 const moments=[0,0,0,0,0],rhs=[0,0,0];
 for(const r of rows){const u=(r.x-center)/span;let power=1;
  for(let i=0;i<5;i++){moments[i]+=r.w*power;if(i<3)rhs[i]+=r.w*power*r.y;power*=u}
 }
 const [q0,q1,q2]=gaussian3([[moments[0],moments[1],moments[2]],[moments[1],moments[2],moments[3]],[moments[2],moments[3],moments[4]]],rhs);
 const C=finite(q2/span**2),B=finite(q1/span-2*C*center),A=finite(q0-q1*center/span+C*center**2);
 return {A,B,C,correlation:null};
}
function fit(t,type){
 if(!TYPES.some(x=>x.id===type)||type==='1VAR'||!t.paired)fail('Argument ERROR');
 const {rows}=observations(t);
 if(type==='QUAD')return {type,...quad(rows)};
 const mapped=rows.map(({x,y,w})=>{
  let u=x,v=y;
  if(type==='LOG'){if(x<=0)fail();u=Math.log(x)}
  if(type==='EXP'||type==='ABEXP'){if(y<=0)fail();v=Math.log(y)}
  if(type==='POWER'){if(x<=0||y<=0)fail();u=Math.log(x);v=Math.log(y)}
  if(type==='INV'){if(x===0)fail();u=1/x}
  return {x:finite(u),y:finite(v),w};
 });
 let {A,B,correlation}=linear(mapped);
 if(['EXP','ABEXP','POWER'].includes(type))A=finite(Math.exp(A));
 if(type==='ABEXP')B=finite(Math.exp(B));
 return {type,A,B,C:null,correlation};
}
function estimateY(m,x){
 finite(x);let y;const {A,B,C,type}=m;
 switch(type){
 case 'LIN':y=A+B*x;break;
 case 'QUAD':y=A+B*x+C*x*x;break;
 case 'LOG':if(x<=0)fail();y=A+B*Math.log(x);break;
 case 'EXP':y=A*Math.exp(B*x);break;
 case 'ABEXP':y=A*Math.pow(B,x);break;
 case 'POWER':if(x<=0)fail();y=A*Math.pow(x,B);break;
 case 'INV':if(!x)fail();y=A+B/x;break;
 default:fail('Argument ERROR');
 }
 return finite(y);
}
function estimateX(m,y){
 finite(y);const {A,B,C,type}=m;
 if(type==='QUAD'){
  if(C===0){if(!B)fail();return [finite((y-A)/B)]}
  const d=B*B-4*C*(A-y);if(d<0||!Number.isFinite(d))fail();
  return [finite((-B-Math.sqrt(d))/(2*C)),finite((-B+Math.sqrt(d))/(2*C))];
 }
 let x;
 switch(type){
 case 'LIN':if(!B)fail();x=(y-A)/B;break;
 case 'LOG':if(!B)fail();x=Math.exp((y-A)/B);break;
 case 'EXP':if(y<=0||A<=0||!B)fail();x=Math.log(y/A)/B;break;
 case 'ABEXP':if(y<=0||A<=0||B<=0||B===1)fail();x=Math.log(y/A)/Math.log(B);break;
 case 'POWER':if(y<=0||A<=0||!B)fail();x=Math.pow(y/A,1/B);break;
 case 'INV':if(y===A)fail();x=B/(y-A);if(x===0)fail();break;
 default:fail('Argument ERROR');
 }
 return [finite(x)];
}
function format(v){return v===null?'N/A':String(Number(finite(v).toPrecision(12)))}
function lines(pairs){return pairs.map(([k,v])=>k+' = '+format(v))}
function sumLines(s,paired){
 const a=[['Sum X2',s.sumX2],['Sum X',s.sumX]];
 if(paired)a.push(['Sum Y2',s.sumY2],['Sum Y',s.sumY],['Sum XY',s.sumXY],['Sum X3',s.sumX3],['Sum X2Y',s.sumX2Y],['Sum X4',s.sumX4]);
 return lines(a);
}
function varLines(s,paired){
 const a=[['n',s.n],['Mean X',s.meanX],['Sigma X',s.sdX],['s X',s.sampleSDX]];
 if(paired)a.push(['Mean Y',s.meanY],['Sigma Y',s.sdY],['s Y',s.sampleSDY]);
 return lines(a);
}
function minMaxLines(s,paired){return lines(paired?[['minX',s.minX],['maxX',s.maxX],['minY',s.minY],['maxY',s.maxY]]:[['minX',s.minX],['maxX',s.maxX]])}
function regLines(m){return lines(m.type==='QUAD'?[['A',m.A],['B',m.B],['C',m.C]]:[['A',m.A],['B',m.B],['r',m.correlation]])}
const API=Object.freeze({TYPES,observations,summary,fit,estimateY,estimateX,format,sumLines,varLines,minMaxLines,regLines});
g.FreshStatRegression=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
