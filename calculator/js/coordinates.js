/* REA-033: rectangular/polar conversion, independent of calculator UI. */
(function(global){'use strict';
const TO_RAD={DEG:Math.PI/180,RAD:1,GRAD:Math.PI/200};
const FROM_RAD={DEG:180/Math.PI,RAD:1,GRAD:200/Math.PI};
function domainError(){throw new RangeError('Math ERROR')}
function syntaxError(){throw new SyntaxError('Syntax ERROR')}
function splitArguments(body){
 let level=0,start=0,parts=[];
 for(let i=0;i<body.length;i++){
  if(body[i]==='(')level++;
  else if(body[i]===')'){level--;if(level<0)syntaxError()}
  else if(body[i]===','&&level===0){parts.push(body.slice(start,i).trim());start=i+1}
 }
 if(level!==0)syntaxError();
 parts.push(body.slice(start).trim());
 if(parts.length!==2||parts.some(x=>!x))syntaxError();
 return parts;
}
function parse(source){
 const expression=String(source).trim();
 const name=/^(Pol|Rec)\(/.exec(expression);
 if(!name)return null;
 const body=expression.slice(name[0].length);
 let level=1,end=-1;
 for(let i=0;i<body.length;i++){
  if(body[i]==='(')level++;
  else if(body[i]===')'){level--;if(level===0){end=i;break}if(level<0)syntaxError()}
 }
 if(end<0||end!==body.length-1)syntaxError();
 return {operation:name[1],arguments:splitArguments(body.slice(0,end))};
}
function nearZero(value,scale=1){
 return Math.abs(value)<=2e-14*Math.max(1,Math.abs(scale))?0:value;
}
function coordinate(operation,a,b,unit='DEG'){
 if(!Object.prototype.hasOwnProperty.call(TO_RAD,unit))domainError();
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>9.999999999e99||Math.abs(b)>9.999999999e99)domainError();
 if(operation==='Pol'){
  const r=Math.hypot(a,b);
  if(!Number.isFinite(r)||r>9.999999999e99)domainError();
  const theta=a===0&&b===0?0:Math.atan2(b,a)*FROM_RAD[unit];
  const period=unit==='DEG'?360:unit==='RAD'?2*Math.PI:400;
  const half=period/2;
  // atan2 yields (-half,half]; repair its negative-axis -half endpoint.
  let normalized=theta<=-half?theta+period:theta>half?theta-period:theta;
  normalized=nearZero(normalized);
  return Object.freeze({kind:'coordinate',operation,first:nearZero(r),second:normalized,
   firstLabel:'r',secondLabel:'θ',unit});
 }
 if(operation==='Rec'){
  // A signed radius remains a valid polar vector; apply its sign to x/y.
  const radians=b*TO_RAD[unit];
  if(!Number.isFinite(radians))domainError();
  const x=nearZero(a*Math.cos(radians),a);
  const y=nearZero(a*Math.sin(radians),a);
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>9.999999999e99||Math.abs(y)>9.999999999e99)domainError();
  return Object.freeze({kind:'coordinate',operation,first:x,second:y,
   firstLabel:'X',secondLabel:'Y',unit});
 }
 syntaxError();
}
function evaluate(source,opts,evalScalar){
 const parsed=parse(source);
 if(!parsed)return null;
 const args=parsed.arguments.map(part=>evalScalar(part,opts));
 return coordinate(parsed.operation,args[0],args[1],opts?.angle||'DEG');
}
const api=Object.freeze({parse,splitArguments,coordinate,evaluate});
global.FreshCoordinates=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
