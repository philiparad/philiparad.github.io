/* REA-047 — LCD-native STAT table model, independent of the page DOM. */
(function(global){'use strict';
const MAX_ROWS=80,MAX_WEIGHT=100000;
function fail(msg='Argument ERROR'){throw Error(msg)}
function columns(paired,frequency){return paired?(frequency?['X','Y','FREQ']:['X','Y']):(frequency?['X','FREQ']:['X'])}
function newRow(){return {X:null,Y:null,FREQ:1}}
function create(paired=false,frequency=false){return {paired:!!paired,frequency:!!frequency,rows:[newRow()],row:0,col:0,buffer:'',editing:false,scroll:0,error:''}}
function active(s){return columns(s.paired,s.frequency)[s.col]}
function rowValue(s){const v=s.rows[s.row][active(s)];return v===null?'':String(v)}
function load(s){s.buffer=rowValue(s);s.editing=false;s.error='';return s}
function parse(s){
 const col=active(s),text=s.buffer.trim();
 if(!text){if(col==='FREQ')return 1;return null}
 if(text.length>32)fail();
 const value=Number(text);
 if(!Number.isFinite(value)||Math.abs(value)>=1e100)fail();
 if(col==='FREQ'&&(!Number.isInteger(value)||value<0||value>MAX_WEIGHT))fail();
 return value;
}
function commit(s){
 // Navigation and calculating must not overwrite stored cells with a stale
 // empty buffer. Only a key-initiated editing session may modify a value.
 if(!s.editing)return s;
 const value=parse(s);
 s.rows[s.row][active(s)]=value;s.editing=false;s.error='';
 return s;
}
function move(s,dr,dc){
 commit(s);
 const cols=columns(s.paired,s.frequency);
 s.row=Math.max(0,Math.min(s.rows.length-1,s.row+dr));
 s.col=Math.max(0,Math.min(cols.length-1,s.col+dc));
 return load(s);
}
function insert(s){
 commit(s);
 if(s.rows.length>=MAX_ROWS)fail('Data Full');
 s.rows.splice(s.row+1,0,newRow());s.row++;s.col=0;
 return load(s);
}
function remove(s){
 if(s.rows.length===1){s.rows[0]=newRow();s.row=0}
 else{s.rows.splice(s.row,1);s.row=Math.min(s.row,s.rows.length-1)}
 s.col=0;return load(s);
}
function toggleFrequency(s,enabled){
 // No entered X/Y or stored frequencies are discarded by hiding a column.
 commit(s);s.frequency=!!enabled;
 s.col=Math.min(s.col,columns(s.paired,s.frequency).length-1);
 return load(s);
}
function type(s,addition,overwrite=false){
 const c=String(addition);
 if(!/^[0-9.Ee+\-]+$/.test(c)||s.buffer.length+c.length>32)fail();
 if(!s.editing){s.buffer='';s.editing=true}
 s.buffer=overwrite?s.buffer.slice(0,-1)+c:s.buffer+c;
 s.error='';return s;
}
function calculate(s){
 commit(s);
 let n=0,sumX=0,sumY=0,sumX2=0,sumY2=0,sumXY=0,min=Infinity,max=-Infinity,nonempty=0;
 for(const row of s.rows){
  if(row.X===null){if(row.Y!==null)fail();continue}
  if(s.paired&&row.Y===null)fail();
  const f=s.frequency?row.FREQ:1;
  if(!Number.isInteger(f)||f<0||f>MAX_WEIGHT)fail();
  if(f===0)continue;
  n+=f;if(n>MAX_WEIGHT)fail('Data Full');
  nonempty++;
  const x=row.X,y=row.Y??0;
  sumX+=f*x;sumX2+=f*x*x;min=Math.min(min,x);max=Math.max(max,x);
  if(s.paired){sumY+=f*y;sumY2+=f*y*y;sumXY+=f*x*y}
 }
 if(!n||!nonempty)fail('Argument ERROR');
 const meanX=sumX/n,varianceX=Math.max(0,sumX2/n-meanX*meanX);
 const result={n,sumX,meanX,sdX:Math.sqrt(varianceX),sampleSDX:n>1?Math.sqrt(varianceX*n/(n-1)):null,min,max};
 if(s.paired){
  const meanY=sumY/n,varianceY=Math.max(0,sumY2/n-meanY*meanY),covariance=sumXY/n-meanX*meanY;
  const slope=varianceX>0?covariance/varianceX:null;
  const correlation=varianceX>0&&varianceY>0?covariance/Math.sqrt(varianceX*varianceY):null;
  Object.assign(result,{sumY,meanY,sdY:Math.sqrt(varianceY),sumXY,slope,intercept:slope===null?null:meanY-slope*meanX,correlation});
 }
 return result;
}
function lines(result,paired=false){
 const format=n=>n===null?'N/A':String(Number(n.toPrecision(12)));
 const rows=[['n',result.n],['Sum X',result.sumX],['Mean X',result.meanX],['Sigma X',result.sdX],['s X',result.sampleSDX]];
 if(paired)rows.push(['Sum Y',result.sumY],['Mean Y',result.meanY],['Sigma Y',result.sdY],['Sum XY',result.sumXY],['a',result.intercept],['b',result.slope],['r',result.correlation]);
 else rows.push(['Min',result.min],['Max',result.max]);
 return rows.map(([name,v])=>name+' = '+format(v));
}
const API=Object.freeze({MAX_ROWS,columns,create,active,load,parse,commit,move,insert,remove,toggleFrequency,type,calculate,lines});
global.FreshStatEditor=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
