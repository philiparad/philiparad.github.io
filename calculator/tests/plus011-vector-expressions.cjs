#!/usr/bin/env node
/* PLUS-011: numeric and type safety of physical VECTOR expressions. */
'use strict';
const assert=require('node:assert/strict');
const V=require('../js/vector-registers.js'),s=V.store();
V.set(s,'VctA',V.create(3,[1,2,3]));V.set(s,'VctB',V.create(3,[4,5,6]));
function result(src){const x=V.expression(s,src);return typeof x==='number'?x:x.data}
assert.deepEqual(result('VctA+VctB'),[5,7,9]);
assert.equal(result('VctA·VctB'),32);
assert.equal(result('0+3'),3);
assert.equal(result('3-0'),3);
assert.deepEqual(result('VctA*VctB'),[-3,6,-3]);
assert.deepEqual(result('2*VctA'),[2,4,6]);
assert.deepEqual(result('(VctA+VctB)-VctB'),[1,2,3]);
assert.ok(Math.abs(result('Abs(VctA)')-Math.sqrt(14))<1e-12);
const ans=JSON.stringify(s.VctAns),history=s.history.length;
assert.throws(()=>V.expression(s,'VctA+4'),/Dimension ERROR/);
assert.equal(JSON.stringify(s.VctAns),ans);
assert.equal(s.history.length,history);
assert.throws(()=>V.expression(s,'VctA+'),/Syntax ERROR/);
assert.equal(JSON.stringify(s.VctAns),ans);
assert.throws(()=>V.expression(s,'VctA·missing'),/Syntax ERROR/);
assert.equal(JSON.stringify(s.VctAns),ans);
console.log('PLUS-011 PASS: vector arithmetic, atomic errors, and MatAns isolation');
