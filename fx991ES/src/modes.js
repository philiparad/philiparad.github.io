/* Milestone 12: independently implemented standard-mode engines. No dynamic code execution. */
(function(global){'use strict';
const K=global.FX991, E=K.ERROR;
const bad=(code=E.ARGUMENT)=>{throw new K.CalcError(code)};
const finite=x=>{let n=Number(String(x).trim());if(!String(x).trim()||!Number.isFinite(n))bad();return n};
const nums=s=>{let a=String(s).trim().split(/[\s,]+/).filter(Boolean).map(finite);if(!a.length)bad();return a};
const display=n=>Number(n.toPrecision(11)).toString();
const outcome=(text,number=0,data=null)=>({kind:'mode-result',text:String(text),ans:K.dec(number),data});
const line=a=>'['+a.map(display).join(', ')+']';
const split2=(s,separator='|')=>{const i=s.indexOf(separator);if(i<0)bad(E.SYNTAX);return [s.slice(0,i).trim(),s.slice(i+separator.length).trim()]};
function complex(s,ctx){
 let op='ADD',a,b,parts=String(s).trim();
 let command=parts.match(/^(ADD|SUB|MUL|DIV|ABS|ARG|CONJ|POLAR|RECT)\s*:\s*(.*)$/i);
 if(command){op=command[1].toUpperCase();parts=command[2]}
 const parse=z=>{let v=nums(z);if(v.length!==2)bad();return v};
 if(op==='POLAR'){let [r,t]=parse(parts),rad=ctx.setup.angle==='DEG'?Math.PI/180:ctx.setup.angle==='GRAD'?Math.PI/200:1;return outcome(display(r*Math.cos(t*rad))+' '+(r*Math.sin(t*rad)<0?'-':'+')+' '+display(Math.abs(r*Math.sin(t*rad)))+'i',r*Math.cos(t*rad))}
 if(op==='RECT'){let [re,im]=parse(parts),rad=ctx.setup.angle==='DEG'?180/Math.PI:ctx.setup.angle==='GRAD'?200/Math.PI:1;return outcome('r='+display(Math.hypot(re,im))+' θ='+display(Math.atan2(im,re)*rad),Math.hypot(re,im))}
 if(parts.includes(';'))[a,b]=parts.split(';').map(parse);else if(parts.includes('|'))[a,b]=parts.split('|').map(parse);else a=parse(parts);
 if(['ADD','SUB','MUL','DIV'].includes(op)&&!b)bad(E.SYNTAX);
 let re=a[0],im=a[1];
 if(op==='ADD'){re+=b[0];im+=b[1]}
 if(op==='SUB'){re-=b[0];im-=b[1]}
 if(op==='MUL'){re=a[0]*b[0]-a[1]*b[1];im=a[0]*b[1]+a[1]*b[0]}
 if(op==='DIV'){let d=b[0]*b[0]+b[1]*b[1];if(!d)bad(E.MATH);re=(a[0]*b[0]+a[1]*b[1])/d;im=(a[1]*b[0]-a[0]*b[1])/d}
 if(op==='ABS')return outcome(display(Math.hypot(re,im)),Math.hypot(re,im));
 if(op==='ARG'){let scale=ctx.setup.angle==='DEG'?180/Math.PI:ctx.setup.angle==='GRAD'?200/Math.PI:1;return outcome(display(Math.atan2(im,re)*scale),Math.atan2(im,re)*scale)}
 if(op==='CONJ')im=-im;
 if(Math.abs(im)<1e-13)im=0;
 if(!command&&parts.includes(';'))return {kind:'complex',re:K.dec(re),im:K.dec(im)};
 return outcome(display(re)+(im<0?' - ':' + ')+display(Math.abs(im))+'i',re,{re,im});
}
function base(s){
 const m=String(s).trim().match(/^(BIN|OCT|DEC|HEX)\s*:\s*(.*)$/i);if(!m)bad(E.SYNTAX);
 const base={BIN:2,OCT:8,DEC:10,HEX:16}[m[1].toUpperCase()],bits=base===2?16n:32n,mask=(1n<<bits)-1n;
 let source=m[2].trim().toUpperCase(),unary=source.match(/^(NOT|NEG)\s*\(?\s*([0-9A-F]+)\s*\)?$/),binary=source.match(/^([0-9A-F]+)\s*(XNOR|XOR|AND|OR|[+\-*\/])\s*([0-9A-F]+)$/),simple=source.match(/^[0-9A-F]+$/);
 if(!unary&&!binary&&!simple)bad(E.SYNTAX);
 function read(text){let v=0n;for(let ch of text){let d=BigInt(parseInt(ch,16));if(d>=BigInt(base))bad(E.SYNTAX);v=v*BigInt(base)+d}if(v>mask)bad(E.MATH);return v}
 let a=read(unary?unary[2]:binary?binary[1]:source),b=binary?read(binary[3]):0n,z=a;
 if(unary)z=unary[1]==='NOT'?~a:-a;
 if(binary){let op=binary[2];if(op==='+')z=a+b;if(op==='-')z=a-b;if(op==='*')z=a*b;if(op==='/'){if(!b)bad(E.MATH);z=a/b}if(op==='AND')z=a&b;if(op==='OR')z=a|b;if(op==='XOR')z=a^b;if(op==='XNOR')z=~(a^b)}
 z&=mask;
 let signed=z>=1n<<(bits-1n)?z-(1n<<bits):z;
 let text=base===10?signed.toString():z.toString(base).toUpperCase().padStart(base===2?16:base===16?8:base===8?11:1,'0');
 return outcome(text,Number(signed),{radix:base,bits:Number(bits),unsigned:z.toString(),signed:signed.toString()});
}
function solveMatrix(A,b){
 const n=A.length;if(n<1||n>3||A.some(r=>r.length!==n)||b.length!==n)bad(E.DIMENSION);
 let a=A.map((row,i)=>[...row,b[i]]);
 for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;
 if(Math.abs(a[p][k])<1e-13)bad(E.MATH);[a[k],a[p]]=[a[p],a[k]];
 let piv=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=piv;
 for(let i=0;i<n;i++)if(i!==k){let f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j]}}
 return a.map(r=>r[n]);
}
function quadratic([a,b,c]){
 if(a===0)bad();let delta=b*b-4*a*c;
 if(delta>=0){let t=Math.sqrt(delta),q=-0.5*(b+Math.sign(b||1)*t);let roots=q===0?[-b/(2*a),-b/(2*a)]:[q/a,c/q];return roots.sort((x,y)=>y-x)}
 return null;
}
function cubic(c){
 const [a,b,d,e]=c;if(a===0)bad();let p=(3*a*d-b*b)/(3*a*a),q=(2*b*b*b-9*a*b*d+27*a*a*e)/(27*a*a*a),shift=-b/(3*a);
 const discriminant=q*q/4+p*p*p/27;
 if(discriminant>1e-13){let u=Math.cbrt(-q/2+Math.sqrt(discriminant)),v=Math.cbrt(-q/2-Math.sqrt(discriminant));return [u+v+shift]}
 if(Math.abs(discriminant)<=1e-13){let u=Math.cbrt(-q/2);return [2*u+shift,-u+shift,-u+shift].sort((x,y)=>y-x)}
 let r=2*Math.sqrt(-p/3),t=Math.acos(Math.max(-1,Math.min(1,3*q/(p*r))))/3;
 return [0,1,2].map(k=>r*Math.cos(t-2*Math.PI*k/3)+shift).sort((x,y)=>y-x);
}
function equation(s){
 let m=String(s).trim().match(/^(QUAD|CUBIC|LINEAR)\s*:\s*(.*)$/i);if(!m)bad(E.SYNTAX);
 let cmd=m[1].toUpperCase(),src=m[2];
 if(cmd==='LINEAR'){
  let [rows,rhs]=split2(src,'|');let A=rows.split(';').map(nums),b=nums(rhs),x=solveMatrix(A,b);
  return outcome(x.map((v,i)=>'x'+(i+1)+'='+display(v)).join(' ; '),x[0],{roots:x});
 }
 let c=nums(src),count=cmd==='QUAD'?3:4;if(c.length!==count)bad();let roots=cmd==='QUAD'?quadratic(c):cubic(c);
 if(!roots){let [a,b,d]=c,im=Math.sqrt(-(b*b-4*a*d))/(2*Math.abs(a));return outcome('x1='+display(-b/(2*a))+'+'+display(im)+'i ; x2='+display(-b/(2*a))+'-'+display(im)+'i',-b/(2*a))}
 return outcome(roots.map((v,i)=>'x'+(i+1)+'='+display(v)).join(' ; '),roots[0],{roots});
}
function parseMatrix(s){let rows=String(s).trim().split(';').map(nums);if(!rows.length||rows.length>3||rows[0].length>3||rows.some(r=>r.length!==rows[0].length))bad(E.DIMENSION);return rows}
function determinant(A){if(A.length!==A[0].length)bad(E.DIMENSION);if(A.length===1)return A[0][0];return A[0].reduce((sum,x,j)=>sum+((j%2)?-1:1)*x*determinant(A.slice(1).map(r=>r.filter((_,i)=>i!==j))),0)}
function matrix(s){
 let m=String(s).trim().match(/^(DET|INV|TRANS|ABS|ADD|SUB|MUL|POW2|POW3)\s*:\s*(.*)$/i);if(!m)bad(E.SYNTAX);let op=m[1].toUpperCase(),src=m[2];let pair=['ADD','SUB','MUL'].includes(op),parts=pair?split2(src,'|'):[src],A=parseMatrix(parts[0]),B=pair?parseMatrix(parts[1]):null,result;
 if(op==='DET')return outcome(display(determinant(A)),determinant(A));
 if(op==='ABS')return outcome(display(Math.sqrt(A.flat().reduce((acc,x)=>acc+x*x,0))),Math.sqrt(A.flat().reduce((acc,x)=>acc+x*x,0)));
 if(op==='TRANS')result=A[0].map((_,j)=>A.map(r=>r[j]));
 if(op==='ADD'||op==='SUB'){if(A.length!==B.length||A[0].length!==B[0].length)bad(E.DIMENSION);result=A.map((row,i)=>row.map((x,j)=>op==='ADD'?x+B[i][j]:x-B[i][j]))}
 function multiply(X,Y){if(X[0].length!==Y.length)bad(E.DIMENSION);return X.map(r=>Y[0].map((_,j)=>r.reduce((sum,v,k)=>sum+v*Y[k][j],0)))}
 if(op==='MUL')result=multiply(A,B);
 if(op==='POW2')result=multiply(A,A);
 if(op==='POW3')result=multiply(multiply(A,A),A);
 if(op==='INV'){
  if(A.length!==A[0].length)bad(E.DIMENSION);
  const n=A.length,cols=Array.from({length:n},(_,j)=>solveMatrix(A,Array.from({length:n},(_,i)=>i===j?1:0)));
  result=A.map((_,i)=>cols.map(col=>col[i]));
 }
 return outcome(result.map(line).join(' ; '),result[0][0],{matrix:result});
}
function vector(s){
 let m=String(s).trim().match(/^(DOT|CROSS|ADD|SUB|ABS|ANGLE|MUL)\s*:\s*(.*)$/i);if(!m)bad(E.SYNTAX);
 let op=m[1].toUpperCase(),src=m[2],parts=src.split('|'),a=nums(parts[0]);if(a.length<2||a.length>3)bad(E.DIMENSION);
 if(op==='ABS')return outcome(display(Math.hypot(...a)),Math.hypot(...a));
 if(op==='MUL'){if(parts.length!==2)bad();let k=finite(parts[1]);let v=a.map(x=>x*k);return outcome(line(v),v[0],{vector:v})}
 if(parts.length!==2)bad(E.SYNTAX);let b=nums(parts[1]);if(a.length!==b.length)bad(E.DIMENSION);
 let dot=a.reduce((s,x,i)=>s+x*b[i],0);
 if(op==='DOT')return outcome(display(dot),dot);
 if(op==='ANGLE'){let divisor=Math.hypot(...a)*Math.hypot(...b);if(!divisor)bad(E.MATH);let x=Math.acos(Math.max(-1,Math.min(1,dot/divisor)));return outcome(display(x*180/Math.PI),x*180/Math.PI)}
 let v;if(op==='ADD')v=a.map((x,i)=>x+b[i]);if(op==='SUB')v=a.map((x,i)=>x-b[i]);
 if(op==='CROSS'){if(a.length!==3)bad(E.DIMENSION);v=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
 return outcome(line(v),v[0],{vector:v});
}
function statistics(s){
 const m=String(s).trim().match(/^(1VAR|LINEAR|QUAD|LOG|EEXP|ABEXP|POWER|INVERSE)\s*:\s*([\s\S]*)$/i);if(!m)bad(E.SYNTAX);
 const type=m[1].toUpperCase(),items=m[2].split(';').map(nums);
 if(type==='1VAR'){
  const a=items.length===1?items[0]:items.flat();if(a.length>80)bad(E.MEM);
  let n=a.length,sum=a.reduce((x,y)=>x+y,0),mean=sum/n,sse=a.reduce((x,y)=>x+(y-mean)**2,0);
  return outcome('n='+n+'  mean='+display(mean)+'  σ='+display(Math.sqrt(sse/n))+'  s='+(n>1?display(Math.sqrt(sse/(n-1))):'undefined'),mean,{n,mean,sum,populationStd:Math.sqrt(sse/n)});
 }
 if(items.length<2||items.length>40||items.some(p=>p.length!==2))bad(E.ARGUMENT);
 let x=items.map(p=>p[0]),y=items.map(p=>p[1]);
 if(type==='QUAD'){
  let A=[[x.length,x.reduce((s,v)=>s+v,0),x.reduce((s,v)=>s+v*v,0)],[x.reduce((s,v)=>s+v,0),x.reduce((s,v)=>s+v*v,0),x.reduce((s,v)=>s+v**3,0)],[x.reduce((s,v)=>s+v*v,0),x.reduce((s,v)=>s+v**3,0),x.reduce((s,v)=>s+v**4,0)]];
  let B=[y.reduce((s,v)=>s+v,0),x.reduce((s,v,i)=>s+v*y[i],0),x.reduce((s,v,i)=>s+v*v*y[i],0)];let c=solveMatrix(A,B);return outcome('a='+display(c[0])+' b='+display(c[1])+' c='+display(c[2]),c[0],{coefficients:c});
 }
 // Fit transformed straight lines for the six non-quadratic regression forms.
 const transformed=items.map(([X,Y])=>{
  if(type==='LOG')return [Math.log(X),Y];
  if(type==='EEXP'||type==='ABEXP')return [X,Math.log(Y)];
  if(type==='POWER')return [Math.log(X),Math.log(Y)];
  if(type==='INVERSE')return [1/X,Y];
  return [X,Y];
 });if(transformed.some(r=>r.some(v=>!Number.isFinite(v))))bad(E.MATH);
 let mx=transformed.reduce((s,p)=>s+p[0],0)/transformed.length,my=transformed.reduce((s,p)=>s+p[1],0)/transformed.length;
 let xx=transformed.reduce((s,p)=>s+(p[0]-mx)**2,0),xy=transformed.reduce((s,p)=>s+(p[0]-mx)*(p[1]-my),0),yy=transformed.reduce((s,p)=>s+(p[1]-my)**2,0);
 if(xx===0||yy===0)bad(E.MATH);let b=xy/xx,a=my-b*mx,r=xy/Math.sqrt(xx*yy);
 if(['EEXP','ABEXP','POWER'].includes(type))a=Math.exp(a);
 if(type==='ABEXP')b=Math.exp(b);
 return outcome('a='+display(a)+' b='+display(b)+' r='+display(r),a,{a,b,r});
}
function table(s,ctx){
 let chunks=String(s).split('|');if(chunks.length!==4)bad(E.SYNTAX);
 let expressions=chunks[0].split(';').map(x=>x.trim());if(expressions.length!==1&&expressions.length!==2)bad(E.SYNTAX);
 if(expressions.length===2&&ctx.model!=='c')bad(E.UNSUPPORTED);
 let start=finite(chunks[1]),end=finite(chunks[2]),step=finite(chunks[3]);if(step<=0||end<start)bad();
 let n=Math.floor((end-start)/step+1e-9)+1,limit=expressions.length===2?20:30;if(n>limit)bad(E.MEM);
 let asts=expressions.map(K.parse),rows=[];for(let i=0;i<n;i++){
  let x=start+i*step;if(x>end+1e-9)break;
  let context={...ctx,memory:{...ctx.memory,X:K.dec(x)}};
  rows.push([x,...asts.map(ast=>K.numeric(K.evaluate(ast,context)))]);
 }
 return outcome(rows.map(row=>row.map(display).join('  ')).join(' ; '),rows[0][1],{rows,columns:expressions.length+1});
}
function calculate(mode,source,context){
 if(['INEQ','VERIF','DIST'].includes(mode))return global.FX991_CMODES?.calculate(mode,source,context)||bad(E.UNSUPPORTED);
 return {CMPLX:complex,'BASE-N':base,EQN:equation,MATRIX:matrix,VECTOR:vector,STAT:statistics,TABLE:table}[mode]?.(source,context)||bad(E.UNSUPPORTED);
}
const SAMPLES=Object.freeze({COMP:'1/3+1/6',CMPLX:'MUL:2,3|4,5',STAT:'1VAR:1,2,3,4,5','BASE-N':'BIN:1010 AND 1100',EQN:'QUAD:1,-3,2',MATRIX:'MUL:1,2;3,4|5,6;7,8',TABLE:'X^2+1|-2|2|1',VECTOR:'DOT:1,2,3|4,5,6'});
global.FX991_MODES=Object.freeze({calculate,SAMPLES,complex,base,equation,matrix,vector,statistics,table,solveMatrix,determinant});
})(typeof window!=='undefined'?window:globalThis);
