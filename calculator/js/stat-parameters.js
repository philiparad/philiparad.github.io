/* REA-085 original fx-991ES STAT command tokens and source-sensitive menus.
 * Tokens remain symbolic in the input; values are resolved against the
 * current committed STAT data only when the expression is evaluated.
 */
(function(global){'use strict';
const row=(key,label,token,field)=>Object.freeze({key:String(key),label,token,field});
const SUM1=Object.freeze([row(1,'Σx²','StatSumX2','sumX2'),row(2,'Σx','StatSumX','sumX')]);
const SUM2=Object.freeze([...SUM1,row(3,'Σy²','StatSumY2','sumY2'),
 row(4,'Σy','StatSumY','sumY'),row(5,'Σxy','StatSumXY','sumXY'),
 row(6,'Σx³','StatSumX3','sumX3'),row(7,'Σx²y','StatSumX2Y','sumX2Y'),
 row(8,'Σx⁴','StatSumX4','sumX4')]);
const VAR1=Object.freeze([row(1,'n','StatN','n'),row(2,'x̄','StatMeanX','meanX'),
 row(3,'xσn','StatSDX','sdX'),row(4,'xσn−1','StatSampleSDX','sampleSDX')]);
const VAR2=Object.freeze([...VAR1,row(5,'ȳ','StatMeanY','meanY'),
 row(6,'yσn','StatSDY','sdY'),row(7,'yσn−1','StatSampleSDY','sampleSDY')]);
const MIN1=Object.freeze([row(1,'minX','StatMinX','minX'),row(2,'maxX','StatMaxX','maxX')]);
const MIN2=Object.freeze([...MIN1,row(3,'minY','StatMinY','minY'),row(4,'maxY','StatMaxY','maxY')]);
const REG1=Object.freeze([row(1,'A','StatRegA','A'),row(2,'B','StatRegB','B'),
 row(3,'r','StatRegR','correlation')]);
const REG2=Object.freeze([row(1,'A','StatRegA','A'),row(2,'B','StatRegB','B'),
 row(3,'C','StatRegC','C')]);
function entries(group,paired,regressionType){
 if(group==='Sum')return paired?SUM2:SUM1;
 if(group==='Var')return paired?VAR2:VAR1;
 if(group==='MinMax')return paired?MIN2:MIN1;
 if(group==='Reg'&&paired){
  const roots=regressionType==='QUAD'?[
   {key:'4',label:'x̂1',estimate:'x',root:0},
   {key:'5',label:'x̂2',estimate:'x',root:1},
   {key:'6',label:'ŷ',estimate:'y'}
  ]:[
   {key:'4',label:'x̂',estimate:'x',root:0},
   {key:'5',label:'ŷ',estimate:'y'}
  ];
  return [...(regressionType==='QUAD'?REG2:REG1),...roots];
 }
 throw Error('Argument ERROR');
}
const all=[...SUM2,...VAR2,...MIN2,...REG1,...REG2];
const tokenMap=Object.freeze(Object.fromEntries(all.map(x=>[x.token,x])));
function tokens(source){
 return [...String(source).matchAll(/\bStat[A-Za-z0-9]+\b/g)].map(m=>m[0]);
}
function resolve(source,table,reg){
 const found=tokens(source);
 if(!found.length)return {};
 if(!table||!reg)throw Error('Argument ERROR');
 const required=[...new Set(found)];
 for(const token of required)if(!tokenMap[token])throw Error('Variable ERROR: '+token);
 const summary=reg.summary(table);
 let fit=null;const memory={};
 const permitted=new Set([...SUM1,...VAR1,...MIN1,...(table.paired?SUM2:[]),
  ...(table.paired?VAR2:[]),...(table.paired?MIN2:[]),
  ...(table.paired?entries('Reg',true,table.regressionType):[])].map(x=>x.token));
 for(const token of required){
  if(!permitted.has(token))throw Error('Argument ERROR');
  const item=tokenMap[token];
  if(item.token.startsWith('StatReg')){
   if(!fit)fit=reg.fit(table,table.regressionType||'LIN');
  }
  const value=(item.token.startsWith('StatReg')?fit:summary)[item.field];
  // REA-106: an internally retained Σx² may exceed the LCD arithmetic
  // range while σ remains valid. Never expose such sums as usable registers.
  if(typeof value!=='number'||!Number.isFinite(value)||
     Math.abs(value)>9.999999999e99)throw Error('Math ERROR');
  memory[token]=value;
 }
 return memory;
}
const API=Object.freeze({entries,resolve,tokens,tokenMap});
global.FreshStatParameters=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
