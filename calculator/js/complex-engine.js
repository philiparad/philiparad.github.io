/* REA-045 — independent complex expression engine (no eval or firmware imports). */
(function(global){'use strict';
const LIMIT=9.999999999e99;
const fault=(type='Math ERROR')=>{throw Error(type)};
function complex(re,im=0){
 if(!Number.isFinite(re)||!Number.isFinite(im)||Math.abs(re)>LIMIT||Math.abs(im)>LIMIT)fault();
 return {re:re||0,im:im||0};
}
function value(x){
 if(typeof x==='number')return complex(x);
 if(x&&typeof x==='object'&&typeof x.re==='number'&&typeof x.im==='number')return complex(x.re,x.im);
 fault('Variable ERROR');
}
const add=(a,b)=>complex(a.re+b.re,a.im+b.im);
const neg=a=>complex(-a.re,-a.im);
const sub=(a,b)=>add(a,neg(b));
const mul=(a,b)=>complex(a.re*b.re-a.im*b.im,a.re*b.im+a.im*b.re);
function div(a,b){
 // Scale numerator and denominator by the dominant divisor component.
 // Computing b.re + b.im*t first can overflow even for valid operands
 // (for example (10^99+10^99 i)/(10^99+10^99 i) must equal 1).
 if(b.re===0&&b.im===0)fault();
 if(Math.abs(b.re)>=Math.abs(b.im)){
  const t=b.im/b.re,den=1+t*t,ar=a.re/b.re,ai=a.im/b.re;
  return complex((ar+ai*t)/den,(ai-ar*t)/den);
 }
 const t=b.re/b.im,den=1+t*t,ar=a.re/b.im,ai=a.im/b.im;
 return complex((ar*t+ai)/den,(ai*t-ar)/den);
}
function power(a,b){
 if(a.re===0&&a.im===0){
  if(b.im!==0||b.re<=0)fault();
  return complex(0);
 }
 if(b.im===0&&Number.isInteger(b.re)&&Math.abs(b.re)<=1000){
  let n=Math.abs(b.re),base=a,out=complex(1);
  while(n){if(n%2)out=mul(out,base);n=Math.floor(n/2);if(n)base=mul(base,base)}
  return b.re<0?div(complex(1),out):out;
 }
 const radius=Math.hypot(a.re,a.im),theta=Math.atan2(a.im,a.re);
 const scale=Math.exp(b.re*Math.log(radius)-b.im*theta);
 const angle=b.re*theta+b.im*Math.log(radius);
 // Exact real-axis operands can land on quarter turns; binary64 sin/cos
 // produces tiny ghost components there (sqrt(-1) displayed as 6e-17+i).
 // Snap only when the phase itself is indistinguishable from k·π/2,
 // not whenever a component happens to be small.
 const quarter=Math.PI/2,turn=Math.round(angle/quarter);
 const onAxis=Number.isSafeInteger(turn)&&
  Math.abs(angle-turn*quarter)<=8*Number.EPSILON*Math.max(1,Math.abs(angle));
 if(onAxis){
  const quadrant=((turn%4)+4)%4;
  return complex(scale*[1,0,-1,0][quadrant],scale*[0,1,0,-1][quadrant]);
 }
 return complex(scale*Math.cos(angle),scale*Math.sin(angle));
}
function polar(radius,angle,unit='DEG'){
 if(radius.im!==0||angle.im!==0)fault('Math ERROR');
 if(radius.re<0)fault('Math ERROR');
 const theta=radians(angle.re,unit);
 // Avoid retaining sine/cosine floating-point noise on axis-aligned angles.
 const re=radius.re*Math.cos(theta),im=radius.re*Math.sin(theta);
 const clean=n=>Math.abs(n)<1e-13*Math.max(1,radius.re)?0:n;
 return complex(clean(re),clean(im));
}
function normalizedAngle(re,im,unit='DEG'){
 if(re===0&&im===0)return 0;
 let angle=degrees(Math.atan2(im,re),unit);
 const half=unit==='RAD'?Math.PI:unit==='GRAD'?200:180;
 const full=half*2;
 if(angle<=-half)angle+=full;
 if(angle>half)angle-=full;
 if(Math.abs(angle)<1e-12)return 0;
 return angle;
}
// Explicit format commands are legal only at the end of an expression.
function splitDisplayCommand(source){
 const text=String(source).trim();
 const match=/(?:►|▶|→)\s*(r∠θ|a\+bi)\s*$/i.exec(text);
 if(!match){
  if(/[►▶→]/.test(text))fault('Syntax ERROR');
  return {expression:text,format:null};
 }
 const expression=text.slice(0,match.index).trim();
 if(!expression||/[►▶→]/.test(expression))fault('Syntax ERROR');
 return {expression,format:match[1].toLowerCase()==='a+bi'?'rectangular':'polar'};
}
function radians(angle,unit){return unit==='RAD'?angle:unit==='GRAD'?angle*Math.PI/200:angle*Math.PI/180}
function degrees(angle,unit){return unit==='RAD'?angle:unit==='GRAD'?angle*200/Math.PI:angle*180/Math.PI}
function call(name,args,unit){
 if(args.length!==1)fault('Syntax ERROR');
 const z=args[0];
 switch(name.toLowerCase()){
  case 'conj':case 'conjg':return complex(z.re,-z.im);
  case 'abs':return complex(Math.hypot(z.re,z.im));
  case 'arg':if(z.re===0&&z.im===0)fault();return complex(normalizedAngle(z.re,z.im,unit));
  case 're':case 'real':return complex(z.re);
  case 'im':case 'imag':return complex(z.im);
  case 'sqrt':return power(z,complex(.5));
  default:fault('Syntax ERROR');
 }
}
function tokenize(source){
 const text=String(source).replace(/\u2212/g,'-').replace(/\u00d7/g,'*').replace(/\u00f7/g,'/');
 const tokens=[];let pos=0;
 while(pos<text.length){
  if(/\s/.test(text[pos])){pos++;continue}
  const fragment=text.slice(pos);
  const num=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(fragment);
  const id=/^[A-Za-z][A-Za-z0-9]*/.exec(fragment);
  if(num){tokens.push({kind:'number',text:num[0]});pos+=num[0].length;continue}
  if(id){tokens.push({kind:'id',text:id[0]});pos+=id[0].length;continue}
  if('+-*/^(),∠'.includes(text[pos])){tokens.push({kind:'op',text:text[pos++]});continue}
  fault('Syntax ERROR');
 }
 if(tokens.length>240)fault('Syntax ERROR');
 return tokens;
}
function evaluate(expression,options={}){
 const {expression:body}=splitDisplayCommand(expression);
 const tokens=tokenize(body),unit=options.angle||'DEG';
 const memory=options.memory||{};
 const vars={pi:complex(Math.PI),e:complex(Math.E),i:complex(0,1),
  Ans:value(options.ans??0),PreAns:value(options.preAns??0)};
 for(const [key,item] of Object.entries(memory)){
  vars[key]=value(item);
 }
 let at=0;
 const peek=()=>tokens[at]?.text;
 const consume=()=>tokens[at++];
 function primary(){
  const t=consume();if(!t)fault('Syntax ERROR');
  if(t.text==='+')return parse(25);
  if(t.text==='-')return neg(parse(25));
  if(t.text==='('){const z=parse(0);if(peek()!==')')fault('Syntax ERROR');consume();return z}
  if(t.kind==='number')return complex(Number(t.text));
  if(t.kind==='id'){
   if(peek()==='('&&/^(conj|conjg|abs|arg|re|real|im|imag|sqrt)$/i.test(t.text)){
    consume();const args=[];
    if(peek()!==')'){args.push(parse(0));while(peek()===','){consume();args.push(parse(0))}}
    if(peek()!==')')fault('Syntax ERROR');consume();
    return call(t.text,args,unit);
   }
   if(Object.prototype.hasOwnProperty.call(vars,t.text))return vars[t.text];
   fault('Variable ERROR');
  }
  fault('Syntax ERROR');
 }
 function parse(min){
  let left=primary();
  while(at<tokens.length){
   const token=tokens[at],t=token.text;
   if(t===')'||t===',')break;
   const implicit=token.kind==='number'||token.kind==='id'||t==='(';
   const op=implicit?'*':t;
   const binding=op==='^'?30:op==='∠'?22:op==='*'||op==='/'?20:op==='+'||op==='-'?10:-1;
   if(binding<min)break;
   if(!implicit)consume();
   const right=parse(op==='^'?binding:binding+1);
   left=op==='+'?add(left,right):op==='-'?sub(left,right):
    op==='*'?mul(left,right):op==='/'?div(left,right):op==='∠'?polar(left,right,unit):power(left,right);
  }
  return left;
 }
 if(!tokens.length)fault('Syntax ERROR');
 const answer=parse(0);
 if(at!==tokens.length)fault('Syntax ERROR');
 return value(answer);
}
function components(z,unit='DEG',style='rectangular'){
 z=value(z);
 const f=n=>String(Number(n.toPrecision(12)));
 if(style==='polar')return [f(Math.hypot(z.re,z.im)),f(normalizedAngle(z.re,z.im,unit))];
 return [f(z.re),f(z.im)+'i'];
}
function format(z,unit='DEG',style='rectangular'){
 z=value(z);
 const f=n=>String(Number(n.toPrecision(12)));
 if(style==='polar')return f(Math.hypot(z.re,z.im))+'∠'+f(normalizedAngle(z.re,z.im,unit));
 if(z.im===0)return f(z.re);
 if(z.re===0)return (z.im<0?'-':'')+(Math.abs(z.im)===1?'':f(Math.abs(z.im)))+'i';
 return f(z.re)+(z.im<0?'-':'+')+(Math.abs(z.im)===1?'':f(Math.abs(z.im)))+'i';
}
const API=Object.freeze({complex,value,add,sub,mul,div,power,polar,normalizedAngle,splitDisplayCommand,components,evaluate,format,radians});
global.FreshComplex=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
