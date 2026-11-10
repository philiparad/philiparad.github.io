/* Independent numerical/expression engine. No eval, new Function, CASIO binary or ROM. */
(function(global){'use strict';
const TAU=2*Math.PI;
const SETTINGS={angle:'DEG',format:'Norm2',digits:3,math:true};
class MathFault extends Error{constructor(message){super(message);this.name='CalculatorError'}}
const fail=(message)=>{throw new MathFault(message)};
// REA-031: source-backed integer domains and bounded exact intermediates.
// Convert to the calculator's 15-significant-digit numerical model only after
// the exact integer is known; do not round huge combinations to JS integers.
const COMB_LIMIT=10n**100n;
function calculatorInteger(n){
 if(!Number.isFinite(n)||!Number.isInteger(n)||n<0||n>=1e10)fail('Math ERROR');
 return BigInt(n);
}
function toCalculatorNumber(exact){
 if(exact>=COMB_LIMIT)fail('Math ERROR');
 const number=Number(exact);
 if(!Number.isFinite(number))fail('Math ERROR');
 return Number(number.toPrecision(15));
}
function factorial(n){
 if(!Number.isInteger(n)||n<0||n>69)fail('Math ERROR');
 let exact=1n;
 for(let k=2n;k<=BigInt(n);k++)exact*=k;
 return toCalculatorNumber(exact);
}
function permutation(n,r){
 const N=calculatorInteger(n),R=calculatorInteger(r);
 if(R>N)fail('Math ERROR');
 let exact=1n;
 for(let k=0n;k<R;k++){
  exact*=N-k;
  if(exact>=COMB_LIMIT)fail('Math ERROR');
 }
 return toCalculatorNumber(exact);
}
function combination(n,r){
 const N=calculatorInteger(n),R=calculatorInteger(r);
 if(R>N)fail('Math ERROR');
 const K=R<N-R?R:N-R;
 let exact=1n;
 for(let k=1n;k<=K;k++){
  exact=exact*(N-k+1n)/k;
  if(exact>=COMB_LIMIT)fail('Math ERROR');
 }
 return toCalculatorNumber(exact);
}
// REA-032: model-specific input domains and exact cardinal-angle values.
const TRIG_LIMIT={DEG:9e9,RAD:157079632.7,GRAD:1e10};
const ANGLE_QUARTER={DEG:90,RAD:Math.PI/2,GRAD:100};
function checkedTrig(name,x,unit){
 if(!Number.isFinite(x)||Math.abs(x)>=TRIG_LIMIT[unit])fail('Math ERROR');
 const quarter=ANGLE_QUARTER[unit],scaled=x/quarter,nearest=Math.round(scaled);
 // Snap only inputs numerically indistinguishable from an exact right angle.
 // This avoids tan(pi/2) leaking a huge finite answer, and cos(90) ~= 6e-17.
 const cardinal=Math.abs(scaled-nearest)<=8*Number.EPSILON*Math.max(1,Math.min(Math.abs(scaled),16));
 if(cardinal){
  const k=((nearest%4)+4)%4;
  if(name==='sin')return [0,1,0,-1][k];
  if(name==='cos')return [1,0,-1,0][k];
  if(k%2!==0)fail('Math ERROR');
  return 0;
 }
 const radians=toRadians(x,unit);
 const result=name==='sin'?Math.sin(radians):name==='cos'?Math.cos(radians):Math.tan(radians);
 if(!Number.isFinite(result))fail('Math ERROR');
 return result;
}
function checkedInverseTrig(name,x,unit){
 if(!Number.isFinite(x))fail('Math ERROR');
 if((name==='asin'||name==='acos')&&Math.abs(x)>1)fail('Math ERROR');
 if(name==='atan'&&Math.abs(x)>9.999999999e99)fail('Math ERROR');
 const radians=name==='asin'?Math.asin(x):name==='acos'?Math.acos(x):Math.atan(x);
 return fromRadians(radians,unit);
}
function checkedHyperbolic(name,x){
 if(!Number.isFinite(x))fail('Math ERROR');
 const abs=Math.abs(x);
 if((name==='sinh'||name==='cosh')&&abs>230.2585092)fail('Math ERROR');
 if(name==='asinh'&&abs>4.999999999e99)fail('Math ERROR');
 if(name==='acosh'&&(x<1||x>4.999999999e99))fail('Math ERROR');
 if(name==='atanh'&&abs>0.9999999999)fail('Math ERROR');
 if((name==='tanh'||name==='atanh')&&abs>9.999999999e99)fail('Math ERROR');
 const result=Math[name](x);
 if(!Number.isFinite(result)||Math.abs(result)>9.999999999e99)fail('Math ERROR');
 return result;
}

const INTEGER_FUNCTION_LIMIT=1e10;
function validatedInteger(n,allowNegative){
 if(!Number.isInteger(n)||!Number.isFinite(n)||
    Math.abs(n)>=INTEGER_FUNCTION_LIMIT||(!allowNegative&&n<0))fail('Math ERROR');
 return BigInt(n);
}
function exactGcd(a,b){
 a=a<0n?-a:a;b=b<0n?-b:b;
 while(b!==0n){const r=a%b;a=b;b=r}
 return a;
}
function gcdFunction(args){
 if(args.length!==2)fail('Syntax ERROR');
 const a=validatedInteger(args[0],true),b=validatedInteger(args[1],true);
 if(a===0n&&b===0n)fail('Math ERROR');
 return Number(exactGcd(a,b));
}
function lcmFunction(args){
 if(args.length!==2)fail('Syntax ERROR');
 const a=validatedInteger(args[0],false),b=validatedInteger(args[1],false);
 if(a===0n||b===0n)return 0;
 const exact=(a/exactGcd(a,b))*b;
 if(exact>=10n**100n)fail('Math ERROR');
 return Number(Number(exact).toPrecision(15));
}
function integerPart(args,largest){
 if(args.length!==1)fail('Syntax ERROR');
 const x=args[0];
 if(!Number.isFinite(x)||Math.abs(x)>9.999999999e99)fail('Math ERROR');
 const value=largest?Math.floor(x):Math.trunc(x);
 return value===0?0:value;
}
// REA-036: injectable randomness and reproducible test sequences.
// This seeded generator is for tests only, not a representation of CASIO's PRNG.
function createSeededRandom(seed){
 if(!Number.isSafeInteger(seed))fail('Argument ERROR');
 let state=(seed>>>0)||0x6d2b79f5;
 return function(){
  state^=state<<13;state^=state>>>17;state^=state<<5;
  return (state>>>0)/4294967296;
 };
}
function randomUnit(opts){
 const rng=typeof opts.random==='function'?opts.random:Math.random;
 const sample=rng();
 if(typeof sample!=='number'||!Number.isFinite(sample)||sample<0||sample>=1)
  fail('Math ERROR');
 return sample;
}
function randomThreeDigits(opts){return Math.floor(randomUnit(opts)*1000)/1000}
function randomInteger(args,opts){
 if(args.length!==2||!args.every(Number.isSafeInteger))fail('Argument ERROR');
 const [a,b]=args;
 if(!(a<b)||Math.abs(a)>=1e10||Math.abs(b)>=1e10||b-a>=1e10)
  fail('Argument ERROR');
 return a+Math.floor(randomUnit(opts)*(b-a+1));
}
function roundCalculated(value,settings){
 if(!Number.isFinite(value))fail('Math ERROR');
 const mode=settings.format||'Norm2';
 if(mode==='Fix'||mode==='Sci'){
  const numberFormat=global.FreshNumberFormat;
  if(!numberFormat)fail('Math ERROR');
  const formatted=numberFormat.format(value,{...settings,decimalSeparator:'dot'});
  const rounded=Number(formatted.replace('×10^','e'));
  if(!Number.isFinite(rounded))fail('Math ERROR');
  return Object.is(rounded,-0)?0:rounded;
 }
 return Number(value.toPrecision(10));
}
function toRadians(n,unit){return unit==='RAD'?n:unit==='GRAD'?n*Math.PI/200:n*Math.PI/180}
function fromRadians(n,unit){return unit==='RAD'?n:unit==='GRAD'?n*200/Math.PI:n*180/Math.PI}
function gcd(a,b){while(b!==0n){const t=a%b;a=b;b=t}return a<0n?-a:a}
function fraction(value,tolerance=1e-11,maxDenominator=10000){
 if(!Number.isFinite(value))return null;
 if(Math.abs(value)<tolerance)return [0,1];
 if(Math.abs(value)>1e10)return null;
 const sign=value<0?-1:1;let x=Math.abs(value),n0=0,n1=1,d0=1,d1=0;
 for(let i=0;i<25;i++){
  const a=Math.floor(x),n=a*n1+n0,d=a*d1+d0;
  if(d>maxDenominator)break;
  if(Math.abs(value-sign*n/d)<=tolerance*Math.max(1,Math.abs(value)))return [sign*n,d];
  n0=n1;n1=n;d0=d1;d1=d;const rem=x-a;if(rem<1e-14)break;x=1/rem;
 }
 return null;
}
function format(value,settings={},preferFraction=false){
 const cfg={...SETTINGS,...settings};
 if(typeof value==='string')return value;
 if(!Number.isFinite(value))return 'Math ERROR';
 if(preferFraction&&cfg.math&&cfg.format.startsWith('Norm')){
  const f=fraction(value);
  if(f&&f[1]!==1)return f[0]+'/'+f[1];
 }
 return global.FreshNumberFormat?
  global.FreshNumberFormat.format(value,cfg):Number(value.toPrecision(10)).toString();
}
const T={NUMBER:'number',IDENT:'identifier',OP:'operator'};
function tokenize(source){
 if(/[\d.]\s+[\d.]/.test(String(source)))fail('Syntax ERROR');
 let raw=[],s=String(source).replace(/RanInt#/gi,'RanInt').replace(/Ran#/gi,'Ran').replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/π/g,'pi').replace(/√/g,'sqrt').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s+/g,'');
 for(let i=0;i<s.length;){const sub=s.slice(i);let m;
  if((m=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/.exec(sub))){raw.push({type:T.NUMBER,value:Number(m[0]),text:m[0]});i+=m[0].length;continue}
  if(s.startsWith('nPr',i)||s.startsWith('nCr',i)){raw.push({type:T.OP,value:s.slice(i,i+3)});i+=3;continue}
  if((m=/^[A-Za-z_][A-Za-z_0-9]*/.exec(sub))){raw.push({type:T.IDENT,value:m[0]});i+=m[0].length;continue}
  if('+-*/^!()% ,°′″'.includes(s[i])&&s[i]!== ' '){raw.push({type:T.OP,value:s[i]});i++;continue}
  fail('Syntax ERROR');
 }
 return raw;
}
// REA-037: finite product Π with an explicit optional web step.
// CASIO's native Π(expr,a,b) always uses integer step 1.
// The fourth argument is a labeled educational extension.
const PRODUCT_TERM_LIMIT=20000;
function splitProductArguments(body){
 let depth=0,start=0,parts=[];
 for(let i=0;i<body.length;i++){
  if(body[i]==='(')depth++;
  else if(body[i]===')'){depth--;if(depth<0)fail('Syntax ERROR')}
  else if(body[i]===','&&depth===0){parts.push(body.slice(start,i).trim());start=i+1}
 }
 if(depth!==0)fail('Syntax ERROR');
 parts.push(body.slice(start).trim());
 if(parts.some(x=>!x)||parts.length<3||parts.length>4)fail('Syntax ERROR');
 return parts;
}
function parseProduct(source){
 const text=String(source).trim();
 const match=/^(?:Prod|Product|Π)\(/i.exec(text);
 if(!match)return null;
 let depth=1,close=-1;
 for(let i=match[0].length;i<text.length;i++){
  if(text[i]==='(')depth++;
  else if(text[i]===')'){depth--;if(depth===0){close=i;break}}
 }
 if(close!==text.length-1)fail('Syntax ERROR');
 const parts=splitProductArguments(text.slice(match[0].length,-1));
 return {expression:parts[0],a:parts[1],b:parts[2],step:parts[3]||'1'};
}
function finiteProduct(parts,opts){
 // Do not permit nested series, derivative/integral, or vector transforms.
 const prohibited=/\b(?:Prod|Product|Pol|Rec)\s*\(|[ΠΣ∫]|÷R|\bd\/dx\b/i;
 if(prohibited.test(parts.expression)||[parts.a,parts.b,parts.step].some(s=>prohibited.test(s)))
  fail('Syntax ERROR');
 const lower=evaluate(parts.a,opts);
 const upper=evaluate(parts.b,opts);
 const step=evaluate(parts.step,opts);
 if(![lower,upper,step].every(Number.isSafeInteger)||
    Math.abs(lower)>=1e10||Math.abs(upper)>=1e10||
    step<1||step>=1e10||lower>upper)fail('Argument ERROR');
 const count=Math.floor((upper-lower)/step)+1;
 if(count>PRODUCT_TERM_LIMIT)fail('Argument ERROR');
 let result=1;
 for(let i=0;i<count;i++){
  const x=lower+i*step;
  const item=evaluate(parts.expression,{...opts,memory:{...(opts.memory||{}),X:x}});
  if(!Number.isFinite(item))fail('Math ERROR');
  result*=item;
  if(!Number.isFinite(result)||Math.abs(result)>9.999999999e99)fail('Math ERROR');
 }
 return result;
}
function evaluate(source,opts={}){
 const series=parseProduct(source);
 if(series)return finiteProduct(series,opts);
 if(global.FreshSexagesimal)source=global.FreshSexagesimal.normalize(source);
 // REA-021: exact base-10 intermediates for numeric arithmetic expressions.
 // Scientific functions, register variables and unsupported powers use the existing engine.
 if(global.FreshDecimal){
  try{
   const decimalValue=global.FreshDecimal.evaluate(source);
   if(decimalValue!==null)return decimalValue;
  }catch(error){fail(error instanceof SyntaxError?'Syntax ERROR':'Math ERROR')}
 }
 const st={...SETTINGS,...opts};const memory=opts.memory||{};
 const raw=tokenize(source);
 // Recombine nPr/nCr even if the tokenizer recognized the letters as identifiers.
 for(const token of raw)if(token.type===T.IDENT&&/^(nPr|nCr)$/.test(token.value))token.type=T.OP;
 let i=0;const peek=()=>raw[i];const take=()=>raw[i++];
 const names=new Set(['nthroot','sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','sqrt','cbrt','abs','exp','floor','ceil','round','rnd','ranint','int','intg','gcd','lcm','pol','rec','min','max','sign','RanInt']);
 const variables={pi:Math.PI,e:Math.E,Ans:opts.ans??0,PreAns:opts.preAns??0,...memory};
 // Original model does not expose the newer E/F variable registers.
 if(opts.model==='fx-991es'){delete variables.E;delete variables.F}
 function call(name,args){
  const x=args[0];const unit=st.angle;
  switch(name.toLowerCase()){
   case 'sin':case 'cos':case 'tan':return checkedTrig(name.toLowerCase(),x,unit);
   case 'asin':case 'acos':case 'atan':return checkedInverseTrig(name.toLowerCase(),x,unit);
   case 'sinh':case 'cosh':case 'tanh':
   case 'asinh':case 'acosh':case 'atanh':return checkedHyperbolic(name.toLowerCase(),x);
   case 'ln':if(args.length!==1||x<=0)fail('Math ERROR');return Math.log(x);
   case 'log':
    if(args.length===1){if(x<=0)fail('Math ERROR');return Math.log10(x)}
    if(args.length!==2||x<=0||x===1||args[1]<=0)fail('Math ERROR');
    return Math.log(args[1])/Math.log(x);
   case 'nthroot':{
    if(args.length!==2||x===0)fail('Math ERROR');
    const radicand=args[1],index=x;
    if(radicand<0){
     if(!Number.isInteger(index)||Math.abs(index)%2!==1)fail('Math ERROR');
     const answer=-Math.pow(-radicand,1/index);
     if(!Number.isFinite(answer))fail('Math ERROR');
     return answer;
    }
    if(radicand===0&&index<0)fail('Math ERROR');
    const answer=Math.pow(radicand,1/index);
    if(!Number.isFinite(answer))fail('Math ERROR');
    return answer;
   }
   case 'sqrt':if(x<0)fail('Math ERROR');return Math.sqrt(x);
   case 'cbrt':return Math.cbrt(x);
   case 'abs':return Math.abs(x);
   case 'gcd':return gcdFunction(args);
   case 'lcm':return lcmFunction(args);
   case 'int':return integerPart(args,false);
   case 'intg':return integerPart(args,true);
   case 'exp':return Math.exp(x);case 'floor':return Math.floor(x);case 'ceil':return Math.ceil(x);
   case 'round':return Math.round(x);
   case 'rnd':if(args.length!==1)fail('Syntax ERROR');return roundCalculated(x,st);
   case 'min':return Math.min(...args);case 'max':return Math.max(...args);case 'sign':return Math.sign(x);
   case 'ranint':return randomInteger(args,opts);
   default:fail('Syntax ERROR');
  }
 }
 function begin(t){return t&&(t.type===T.IDENT||t.value==='(')}
 function primary(){const t=take();if(!t)fail('Syntax ERROR');
  if(t.value==='+')return expr(25);
  if(t.value==='-')return -expr(25);
  if(t.value==='('){const x=expr(0);if(!peek()||take().value!==')')fail('Syntax ERROR');return x}
  if(t.type===T.NUMBER)return t.value;
  if(t.type===T.IDENT){
   if(t.value==='Ran'||t.value==='rand'||t.value==='ran')return randomThreeDigits(opts);
   if(peek()?.value==='('&&(names.has(t.value)||names.has(t.value.toLowerCase()))){take();let args=[];if(peek()?.value!==')'){while(true){args.push(expr(0));if(peek()?.value!==',')break;take()}}if(!peek()||take().value!==')')fail('Syntax ERROR');return call(t.value,args)}
   if(Object.prototype.hasOwnProperty.call(variables,t.value))return Number(variables[t.value]);
   fail('Variable ERROR: '+t.value);
  }
  fail('Syntax ERROR');
 }
 function expr(min){let left=primary();while(true){const t=peek();if(!t||t.value===')'||t.value===',')break;
  if(t.value==='!'||t.value==='%'||t.value==='°'||t.value==='′'||t.value==='″'){if(45<min)break;take();if(t.value==='!')left=factorial(left);else if(t.value==='%')left=left/100;else left=fromRadians(toRadians(left/(t.value==='°'?1:t.value==='′'?60:3600),'DEG'),st.angle);continue}
  const implicit=begin(t);const operator=implicit?'*':t.value;
  const binding=implicit?24:{'nPr':23,'nCr':23,'+':10,'-':10,'*':20,'/':20,'^':30}[operator];
  if(binding===undefined||binding<min)break;
  if(!implicit)take();const right=expr(operator==='^'?binding:binding+1);
  if(operator==='+')left+=right;else if(operator==='-')left-=right;
  else if(operator==='*')left*=right;else if(operator==='/'){if(right===0)fail('Math ERROR');left/=right}
  else if(operator==='^')left=Math.pow(left,right);else if(operator==='nPr')left=permutation(left,right);
  else if(operator==='nCr')left=combination(left,right);
 }
 return left}
 if(!raw.length)fail('Syntax ERROR');const result=expr(0);if(i<raw.length)fail('Syntax ERROR');if(!Number.isFinite(result))fail('Math ERROR');if(Math.abs(result)>9.999999999e99)fail('Math ERROR');return result;
}
// REA-038: guarded, tolerance-controlled numerical algorithms.
// These approximate CASIO's documented behavior, not its private firmware.
const NUMERIC_EVAL_LIMIT=60000;
function numericTolerance(tol,defaultValue){
 const t=tol===undefined?defaultValue:Number(tol);
 if(!Number.isFinite(t)||t<1e-14||t>0.1)fail('Argument ERROR');
 return t;
}
function checkedSample(fn,x){
 if(!Number.isFinite(x))fail('Math ERROR');
 let y;
 try{y=fn(x)}catch(e){throw e}
 if(typeof y!=='number'||!Number.isFinite(y)||Math.abs(y)>9.999999999e99)fail('Math ERROR');
 return y;
}
function derivative(fn,x,tol=1e-10){
 const threshold=numericTolerance(tol,1e-10);
 if(!Number.isFinite(x)||Math.abs(x)>9.999999999e99)fail('Argument ERROR');
 const scale=Math.max(1,Math.abs(x)),middle=checkedSample(fn,x);
 let h=Math.max(1e-4,Math.pow(Number.EPSILON,1/5))*scale,last=null;
 for(let k=0;k<17;k++){
  if(x+h===x||x-h===x)fail('Time Out');
  const p=checkedSample(fn,x+h),m=checkedSample(fn,x-h);
  const p2=checkedSample(fn,x+2*h),m2=checkedSample(fn,x-2*h);
  const slope=(-p2+8*p-8*m+m2)/(12*h);
  const left=(middle-m)/h,right=(p-middle)/h;
  // A cusp or jump has unequal one-sided derivatives even at tiny h.
  if(k>=5&&Math.abs(left-right)>Math.max(1e-4,20*h/scale*Math.max(1,Math.abs(slope))))
   fail('Math ERROR');
  if(last!==null&&Math.abs(slope-last)<=Math.max(threshold,threshold*Math.abs(slope))){
   const hh=Math.max(1e-5*scale,16*Number.EPSILON*scale);
   const leftCheck=(middle-checkedSample(fn,x-hh))/hh;
   const rightCheck=(checkedSample(fn,x+hh)-middle)/hh;
   if(Math.abs(leftCheck-rightCheck)>Math.max(1e-4,10*hh/scale*Math.max(1,Math.abs(slope))))
    fail('Math ERROR');
   return Math.abs(slope)<threshold?0:slope;
  }
  last=slope;h/=2;
 }
 fail('Time Out');
}
function integrate(fn,a,b,tol=1e-5){
 const threshold=numericTolerance(tol,1e-5);
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>=1e10||Math.abs(b)>=1e10)
  fail('Argument ERROR');
 if(a===b)return 0;
 const sign=a>b?-1:1;
 if(sign<0){const tmp=a;a=b;b=tmp}
 let calls=0;
 const sample=x=>{if(++calls>NUMERIC_EVAL_LIMIT)fail('Time Out');return checkedSample(fn,x)};
 const fa=sample(a),fb=sample(b),mid=(a+b)/2,fm=sample(mid);
 const simpson=(left,right,fl,fc,fr)=>(right-left)*(fl+4*fc+fr)/6;
 const whole=simpson(a,b,fa,fm,fb);
 function refine(left,right,fl,fm,fr,estimate,budget,depth){
  if(depth>=24)fail('Time Out');
  const mid=(left+right)/2,lmid=(left+mid)/2,rmid=(mid+right)/2;
  if(mid===left||mid===right||lmid===left||rmid===right)fail('Time Out');
  const f1=sample(lmid),f2=sample(rmid);
  const a1=simpson(left,mid,fl,f1,fm),a2=simpson(mid,right,fm,f2,fr);
  const delta=a1+a2-estimate;
  if(Math.abs(delta)<=15*budget)return a1+a2+delta/15;
  return refine(left,mid,fl,f1,fm,a1,budget/2,depth+1)+
         refine(mid,right,fm,f2,fr,a2,budget/2,depth+1);
 }
 // Relative and absolute error tolerances are both scaled into each subinterval.
 const absTol=Math.max(threshold,threshold*Math.abs(whole));
 const result=sign*refine(a,b,fa,fm,fb,whole,absTol,0);
 if(!Number.isFinite(result)||Math.abs(result)>9.999999999e99)fail('Math ERROR');
 return result===0?0:result;
}
function summation(fn,a,b){
 if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||
    Math.abs(a)>=1e10||Math.abs(b)>=1e10||a>b)fail('Argument ERROR');
 if(b-a+1>20000)fail('Argument ERROR');
 let total=0,correction=0;
 for(let k=a;k<=b;k++){
  const item=checkedSample(fn,k),y=item-correction,t=total+y;
  correction=(t-total)-y;total=t;
  if(!Number.isFinite(total)||Math.abs(total)>9.999999999e99)fail('Math ERROR');
 }
 return total;
}
function solve(fn,start=1,tol=1e-10){
 const threshold=numericTolerance(tol,1e-10);
 if(!Number.isFinite(start)||Math.abs(start)>=1e10)fail('Argument ERROR');
 let x=start,fx=checkedSample(fn,x),lastStep=Infinity;
 const good=(v,at)=>Math.abs(v)<=threshold*Math.max(1,Math.abs(at));
 for(let i=0;i<100;i++){
  // Reject pole-induced "roots" by always checking function residual.
  if(good(fx,x)&&(i===0||lastStep<=Math.sqrt(threshold)*Math.max(1,Math.abs(x))))
   return x;
  let slope;
  try{slope=derivative(fn,x,Math.max(1e-9,threshold))}catch(e){slope=NaN}
  let proposal=Number.isFinite(slope)&&Math.abs(slope)>1e-14?x-fx/slope:NaN;
  if(!Number.isFinite(proposal)||Math.abs(proposal)>1e10)
   proposal=x+Math.max(.1,Math.abs(x)*.1)*(fx>0?-1:1);
  let accepted=false;
  for(let j=0;j<22;j++){
   const next=x+(proposal-x)*Math.pow(.5,j);
   if(next===x)break;
   try{
    const candidate=checkedSample(fn,next);
    if(Math.abs(candidate)<Math.abs(fx)||good(candidate,next)){
     lastStep=Math.abs(next-x);x=next;fx=candidate;accepted=true;break;
    }
   }catch(e){}
  }
  if(!accepted){
   // Solve can legitimately fail for flat functions, poles and poor initial guesses.
   fail("Can't Solve");
  }
 }
 fail("Can't Solve");
}
function quadratic(a,b,c){if(a===0){if(b===0)fail('Math ERROR');return [-c/b]}const d=b*b-4*a*c;if(d<0)return [];const s=Math.sqrt(d);return d===0?[-b/(2*a)]:[(-b+s)/(2*a),(-b-s)/(2*a)]}
function matrixSolve(rows){const n=rows.length;const m=rows.map(r=>r.slice());for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;[m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-12)fail('Math ERROR');const d=m[i][i];for(let k=i;k<=n;k++)m[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){const f=m[j][i];for(let k=i;k<=n;k++)m[j][k]-=f*m[i][k]}}return m.map(row=>row[n])}
function descriptiveStats(data){if(!data.length)fail('Argument ERROR');const n=data.length,mean=data.reduce((a,b)=>a+b,0)/n,variance=data.reduce((a,b)=>a+(b-mean)**2,0)/n;return {n,sum:data.reduce((a,b)=>a+b,0),mean,variance,sd:Math.sqrt(variance),sampleSD:n>1?Math.sqrt(variance*n/(n-1)):null,min:Math.min(...data),max:Math.max(...data)}}
function parseNumbers(text){const vals=String(text).split(/[,;\s]+/).filter(Boolean).map(Number);if(!vals.length||vals.some(n=>!Number.isFinite(n)))fail('Argument ERROR');return vals}
const API=Object.freeze({evaluate,format,fraction,MathFault,SETTINGS,parseProduct,finiteProduct,summation,numericTolerance,createSeededRandom,randomThreeDigits,randomInteger,roundCalculated,toRadians,fromRadians,factorial,permutation,combination,derivative,integrate,solve,quadratic,matrixSolve,descriptiveStats,parseNumbers});
global.FreshMath=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
