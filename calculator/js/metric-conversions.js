/* 40 conversion pairs supported by the fx-991ES PLUS (2nd edition). */
(function(g){'use strict';
const FORWARD=[["in","cm",2.54],["ft","m",0.3048],["yd","m",0.9144],["mile","km",1.609344],["n mile","m",1852],["acre","m²",4046.856],["gal (US)","L",3.785412],["gal (UK)","L",4.54609],["pc","km",30856780000000],["km/h","m/s",0.2777777777777778],["oz","g",28.34952],["lb","kg",0.4535924],["atm","Pa",101325],["mmHg","Pa",133.3224],["hp","kW",0.7457],["kgf/cm²","Pa",98066.5],["kgf·m","J",9.80665],["lbf/in²","kPa",6.894757],["°F","°C",null],["J","cal",4.1858]];
const PRECISE={"11":4046.8564224,"13":3.785411784,"17":30856775814913.67,"21":28.349523125,"23":0.45359237,"27":133.322387415,"29":0.745699871582,"35":6.894757293168};
const ITEMS=Object.freeze(FORWARD.flatMap(([from,to,factor],index)=>{
 const code=2*index+1;
 return [Object.freeze({code:String(code).padStart(2,'0'),from,to,factor,reverse:false}),
         Object.freeze({code:String(code+1).padStart(2,'0'),from:to,to:from,factor,reverse:true})];
}));
const fail=(message='Argument ERROR')=>{throw Error(message)};
function select(model,code){
 if(model!=='fx-991es-plus')fail();
 const entry=ITEMS.find(item=>item.code===String(code).padStart(2,'0'));if(!entry)fail();
 const key=Number(entry.code)-(entry.reverse?1:0);
 const factor=model==='fx-991es-plus'&&PRECISE[key]!==undefined?PRECISE[key]:entry.factor;
 return {...entry,factor};
}
function convert(value,entry){
 if(!Number.isFinite(value))fail('Math ERROR');
 let result;
 if(entry.code==='37')result=(value-32)/1.8;
 else if(entry.code==='38')result=value*1.8+32;
 // Appendix #117 specifies 39: 1 J = (1/4.1858) cal,
 // 40: 1 cal = 4.1858 J. Keep the exact printed factor.
 else if(entry.code==='39')result=value/4.1858;
 else if(entry.code==='40')result=value*4.1858;
 else result=entry.reverse?value/entry.factor:value*entry.factor;
 if(!Number.isFinite(result)||Math.abs(result)>9.999999999e99)fail('Math ERROR');
 return result;
}
function literal(entry,operand){
 if(!entry||typeof operand!=='string'||!operand.trim())fail('Syntax ERROR');
 const x='('+operand+')';
 if(entry.code==='37')return '(('+x+'-32)/1.8)';
 if(entry.code==='38')return '(('+x+'*1.8)+32)';
 if(entry.code==='39')return '('+x+'/4.1858)';
 if(entry.code==='40')return '('+x+'*4.1858)';
 const factor=Number(entry.factor.toPrecision(15));
 return entry.reverse?'('+x+'/'+factor+')':'('+x+'*'+factor+')';
}
function suffix(expression){
 const str=String(expression??'');
 let end=str.length;while(end>0&&/\s/.test(str[end-1]))end--;
 if(end===0)fail('Syntax ERROR');
 let start=end;
 if(str[end-1]===')'){
  let depth=0;
  for(let i=end-1;i>=0;i--){
   if(str[i]===')')depth++;
   else if(str[i]==='('){depth--;if(depth===0){start=i;break}}
  }
  if(depth!==0)fail('Syntax ERROR');
  while(start>0&&/[A-Za-z]/.test(str[start-1]))start--;
 }else{
  // Digits, decimal, scientific E notation and simple calculator variables.
  if(!/[0-9.A-Za-z]/.test(str[end-1]))fail('Syntax ERROR');
  const source=str.slice(0,end);
  const match=source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$|(?:Ans|PreAns|[A-FMXY]|pi|e)$/);
  if(!match)fail('Syntax ERROR');
  start=end-match[0].length;
 }
 // Make the leading negative sign part of the operand only where unary.
 if(start>0&&str[start-1]==='-'&&(start===1||/[+\-*/^(,]/.test(str[start-2])))start--;
 if(start>0&&str[start-1]==='+'&&(start===1||/[+\-*/^(,]/.test(str[start-2])))start--;
 return {prefix:str.slice(0,start),operand:str.slice(start,end),suffix:str.slice(end)};
}
function insert(expression,entry){
 const part=suffix(expression);
 return part.prefix+literal(entry,part.operand)+part.suffix;
}
function editor(){return {buffer:'',error:''}}
function digit(e,key,model){
 if(!/^[0-9]$/.test(key)||e.buffer.length>=2)fail('Syntax ERROR');
 e.buffer+=key;e.error='';
 if(e.buffer.length<2)return null;
 return select(model,e.buffer);
}
function backspace(e){e.buffer=e.buffer.slice(0,-1);e.error='';return e}
g.FreshConversions=Object.freeze({ITEMS,select,convert,literal,suffix,insert,editor,digit,backspace});
if(typeof module!=='undefined'&&module.exports)module.exports=g.FreshConversions;
})(typeof window!=='undefined'?window:globalThis);
