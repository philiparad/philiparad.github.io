#!/usr/bin/env node
/* PLUS-012 — STAT row insert/delete/clear, capacities and data integrity. */
'use strict';
const A=require('node:assert/strict'),S=require('../js/stat-editor.js');
const row=(X,Y=null,FREQ=1)=>({X,Y,FREQ});
let n=0;
for(const pair of [false,true])for(const freq of [false,true]){
 const s=S.create(pair,freq);
 const capacity=S.rowCapacity(s);
 A.equal(capacity,pair?(freq?26:40):(freq?40:80));
 s.rows=[row(10,pair?100:null),row(20,pair?200:null),row(30,pair?300:null)];s.row=1;S.load(s);
 const original=structuredClone(s.rows);
 S.insert(s);
 A.equal(s.row,1);
 A.equal(s.rows[1].X,null);
 A.deepEqual(s.rows[2],original[1]);
 A.deepEqual(s.rows[3],original[2]);
 S.remove(s);
 A.deepEqual(s.rows,original);
 A.equal(s.row,1);
 S.clearData(s);
 A.equal(s.rows.length,1);
 A.equal(s.rows[0].X,null);
 A.equal(s.row,0);A.equal(s.col,0);A.equal(s.editing,false);
 n++;
 const full=S.create(pair,freq);
 full.rows=Array.from({length:capacity},(_,i)=>row(i,pair?i*10:null));
 full.row=capacity-1;
 const old=JSON.stringify(full.rows);
 A.throws(()=>S.insert(full),/Data Full/);
 A.equal(JSON.stringify(full.rows),old);
 n++;
}
console.log('PLUS-012 PASS:',n,'STAT row and boundary regressions');
