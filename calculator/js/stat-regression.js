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
// REA-108: scale centered residuals before forming regression moments.
// Raw xx/yy/xy can overflow even when A, B and r are representable.
function linear(rows){
 const n=rows.reduce((sum,r)=>sum+r.w,0);
 const anchorX=rows[0].x,anchorY=rows[0].y;
 const spanX=rows.reduce((v,r)=>Math.max(v,Math.abs(r.x-anchorX)),0);
 const spanY=rows.reduce((v,r)=>Math.max(v,Math.abs(r.y-anchorY)),0);
 // Center relative to one observed point to retain precision when data
 // are clustered around a large offset. All normalized sums stay bounded.
 const meanOffset=(anchor,span,key)=>span===0?0:
  rows.reduce((sum,r)=>sum+r.w*((r[key]-anchor)/span),0)/n*span;
 const mx=anchorX+meanOffset(anchorX,spanX,'x');
 const my=anchorY+meanOffset(anchorY,spanY,'y');
 const scaleX=rows.reduce((v,r)=>Math.max(v,Math.abs(r.x-mx)),0);
 const scaleY=rows.reduce((v,r)=>Math.max(v,Math.abs(r.y-my)),0);
 if(!Number.isFinite(scaleX)||scaleX===0)fail();
 let xx=0,yy=0,xy=0;
 for(const r of rows){
  const dx=(r.x-mx)/scaleX;
  const dy=scaleY===0?0:(r.y-my)/scaleY;
  xx+=r.w*dx*dx;
  yy+=r.w*dy*dy;
  xy+=r.w*dx*dy;
 }
 if(!Number.isFinite(xx)||xx<=0)fail();
 const B=finite(scaleY===0?0:(xy/xx)*(scaleY/scaleX));
 const A=finite(my-B*mx);
 const correlation=yy>0?Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))):null;
 return {A,B,correlation};
}
// REA-110: weighted QR with two orthogonalization passes.
// Normal equations magnify conditioning errors and can falsely reject
// valid, unevenly spaced points under the old absolute pivot cutoff.
function quad(rows){
 const n=rows.reduce((sum,r)=>sum+r.w,0);
 const anchor=rows[0].x;
 const span=rows.reduce((max,r)=>Math.max(max,Math.abs(r.x-anchor)),0);
 if(!Number.isFinite(span)||span===0)fail();
 const offset=rows.reduce((sum,r)=>sum+r.w*((r.x-anchor)/span),0)/n;
 const center=anchor+offset*span;
 const scale=rows.reduce((max,r)=>Math.max(max,Math.abs(r.x-center)),0);
 if(!Number.isFinite(scale)||scale===0)fail();
 const yScale=rows.reduce((max,r)=>Math.max(max,Math.abs(r.y)),0);
 const columns=[[],[],[]],target=[];
 for(const r of rows){
  const u=(r.x-center)/scale,weight=Math.sqrt(r.w);
  columns[0].push(weight);
  columns[1].push(weight*u);
  columns[2].push(weight*u*u);
  target.push(yScale===0?0:weight*(r.y/yScale));
 }
 const dot=(x,y)=>x.reduce((sum,v,i)=>sum+v*y[i],0);
 const vectors=[],upper=[[0,0,0],[0,0,0],[0,0,0]];
 for(let j=0;j<3;j++){
  const v=columns[j].slice();
  for(let pass=0;pass<2;pass++){
   for(let i=0;i<j;i++){
    const projection=dot(vectors[i],v);
    upper[i][j]+=projection;
    for(let k=0;k<v.length;k++)v[k]-=projection*vectors[i][k];
   }
  }
  const length=Math.sqrt(dot(v,v));
  const original=Math.sqrt(dot(columns[j],columns[j]));
  if(!Number.isFinite(length)||length<=Number.EPSILON*original*8)fail();
  upper[j][j]=length;
  vectors.push(v.map(value=>value/length));
 }
 const projections=vectors.map(v=>dot(v,target));
 const coefficients=[0,0,0];
 for(let j=2;j>=0;j--){
  let value=projections[j];
  for(let k=j+1;k<3;k++)value-=upper[j][k]*coefficients[k];
  coefficients[j]=value/upper[j][j];
 }
 const [q0,q1,q2]=coefficients.map(q=>q*yScale);
 const C=finite((q2/scale)/scale);
 const B=finite(q1/scale-2*C*center);
 const A=finite(q0-(q1/scale)*center+C*center*center);
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
  // REA-109: avoid subtracting nearly equal numbers for the small root.
  // The product of the two roots is (A-y)/C. Recover the small root
  // from the stable large root rather than losing it to cancellation.
  const constant=A-y;
  const d=B*B-4*C*constant;
  if(d<0||!Number.isFinite(d))fail();
  const root=Math.sqrt(d);
  const q=-0.5*(B>=0?B+root:B-root);
  if(q===0)return [finite(0),finite(0)];
  const large=finite(q/C),small=finite(constant/q);
  return B>=0?[large,small]:[small,large];
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
// REA-111: a non-displayable aggregate must not suppress other valid
// STAT menu choices. The selected entry still raises Math ERROR in app.js.
function lines(pairs){return pairs.map(([k,v])=>{
 try{return k+' = '+format(v)}
 catch(error){
  if(error.message!=='Math ERROR')throw error;
  return k+' = Math ERROR';
 }
})}
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
