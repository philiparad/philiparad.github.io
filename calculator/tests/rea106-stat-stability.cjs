/* PLUS-only stable regression and statistics tests. */
'use strict';
const assert=require('node:assert/strict');
const R=require('../js/stat-regression.js');
function sample(values,weights=null){return {paired:false,frequency:!!weights,regressionType:'1VAR',rows:values.map((X,i)=>({X,Y:null,FREQ:weights?weights[i]:1}))}}
const tests=[[sample([1e50,-1e50]),0,1e50],[sample([2,4,6]),4,Math.sqrt(8/3)],[sample([0.1,0.2,0.3]),0.2,Math.sqrt(2/300)],[sample([1e50,1e50]),1e50,0]];
let count=0;
for(const [data,mean,sd] of tests){const x=R.summary(data);assert.ok(Math.abs(x.meanX-mean)<=1e-10*Math.max(1,Math.abs(mean)));assert.ok(Math.abs(x.sdX-sd)<=1e-10*Math.max(1,Math.abs(sd)));count++}
const paired={paired:true,frequency:false,regressionType:'LIN',rows:[{X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1}]};
const fit=R.fit(paired,'LIN');assert.ok(Math.abs(fit.A-1)<1e-10&&Math.abs(fit.B-2)<1e-10);count++;
console.log('fx-991ES PLUS statistics:',count,'cases PASS');
