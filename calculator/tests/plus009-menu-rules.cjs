#!/usr/bin/env node
/* PLUS-009: deterministic menu numbering and paging contract. */
'use strict';
const assert=require('node:assert/strict'),M=require('../js/menu-model.js');
const model='fx-991es-plus';
assert.deepEqual(M.modeEntries(model).map(e=>e.key),['1','2','3','4','5','6','7','8']);
for(let n=1;n<=8;n++)assert.equal(M.modeSelection(model,0,String(n)).label,M.modeEntries(model)[n-1].label);
assert.equal(M.modeSelection(model,0,'9'),null);
assert.equal(M.navigate(0,'DOWN',10,8),1);
assert.equal(M.navigate(1,'DOWN',10,8),1);
assert.equal(M.navigate(1,'UP',10,8),0);
assert.equal(M.navigate(0,'UP',10,8),0);
const a=Array.from({length:10},(_,i)=>String(i));
assert.deepEqual(M.page(a,1,8).entries,['8','9']);
assert.equal(M.page(a,1,8).above,true);
assert.equal(M.page(a,1,8).below,false);
assert.equal(M.rule('mode').size,8);
assert.equal(M.rule('setup').size,8);
console.log('PLUS-009 PASS: MODE selection, pagination and LCD menu rules');
