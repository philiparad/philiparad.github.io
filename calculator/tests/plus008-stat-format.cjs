#!/usr/bin/env node
/* PLUS-008: manufacturer-documented data clearing and preservation. */
'use strict';
const assert=require('node:assert/strict'),T=require('../js/stat-editor.js');
let cases=0;
for(const paired of [false,true]){
 const s=T.create(paired,false);
 s.rows=[{X:3,Y:paired?9:null,FREQ:2},{X:5,Y:paired?15:null,FREQ:4}];
 s.row=1;s.col=0;s.scroll=5;s.buffer='99';s.editing=true;
 T.toggleFrequency(s,true);
 assert.equal(s.frequency,true);assert.equal(s.rows.length,1);
 assert.deepEqual(s.rows[0],{X:null,Y:null,FREQ:1});
 assert.equal(s.row,0);assert.equal(s.col,0);assert.equal(s.scroll,0);
 assert.equal(s.buffer,'');assert.equal(s.editing,false);
 assert.equal(T.rowCapacity(s),paired?26:40);
 cases++;
 s.rows[0].X=17;s.rows[0].Y=paired?18:null;s.rows[0].FREQ=3;
 s.buffer='7';s.editing=true;
 T.toggleFrequency(s,true);
 assert.equal(s.rows[0].X,17,'same setting must not erase data');
 assert.equal(s.buffer,'7','same setting must preserve pending input');
 cases++;
 T.toggleFrequency(s,false);
 assert.equal(s.frequency,false);assert.equal(s.rows.length,1);
 assert.deepEqual(s.rows[0],{X:null,Y:null,FREQ:1});
 assert.equal(T.rowCapacity(s),paired?40:80);
 cases++;
}
const z=T.create(false,false);z.rows[0].X=25;
T.toggleFrequency(z,false);assert.equal(z.rows[0].X,25);cases++;
console.log('PLUS-008 PASS: '+cases+' format changes, capacity and no-op cases');
