import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {decodeVisualPng,writeVisualArtifacts} from '../browser-tests/visual-artifacts.mjs';

const onePixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRrQAAAAASUVORK5CYII=';

test('browser visual artifacts reject non-PNG, corrupt files and viewport mismatches',()=>{
 const decoded=decodeVisualPng(onePixel,1,1);
 assert.equal(decoded.toString('ascii',1,4),'PNG');
 assert.throws(()=>decodeVisualPng(onePixel,720,470),/dimensions/);
 assert.throws(()=>decodeVisualPng(onePixel.replace('image\/png','image\/jpeg'),1,1),/base64 PNG/);
 assert.throws(()=>decodeVisualPng('data:image/png;base64,AAAA',1,1),/Invalid PNG/);
});

test('inspectable PNG artifacts include both renders, difference image and hash manifest',()=>{
 const path=mkdtempSync(join(tmpdir(),'teaching-board-visual-unit-'));
 try{
  const snapshots=[{name:'sample',cached:onePixel,export:onePixel,difference:onePixel}];
  const findings=[{name:'sample',exportHash:'a'.repeat(64),differentPixels:0}];
  const manifest=writeVisualArtifacts(path,'chromium',snapshots,findings,{
   width:1,height:1,expected:{sample:'a'.repeat(64)}
  });
  assert.deepEqual(readdirSync(path).sort(),[
   'chromium-01-cached.png','chromium-01-difference.png',
   'chromium-01-export.png','chromium-gallery.html','chromium-visual-artifacts.json'
  ]);
  for(const type of ['cached','export','difference']){
   assert.ok(readFileSync(join(path,`chromium-01-${type}.png`)).equals(decodeVisualPng(onePixel,1,1)));
  }
  assert.equal(manifest.scenes[0].goldenMatch,true);
  const gallery=readFileSync(join(path,'chromium-gallery.html'),'utf8');
  assert.match(gallery,/<title>Teaching Board visual review/);
  assert.match(gallery,/chromium-01-export\.png/);
  assert.match(gallery,/chromium-01-cached\.png/);
  assert.match(gallery,/chromium-01-difference\.png/);
  assert.match(gallery,/Reference hash matched/);
  const written=JSON.parse(readFileSync(join(path,'chromium-visual-artifacts.json'),'utf8'));
  assert.deepEqual(written,manifest);
 }finally{rmSync(path,{recursive:true,force:true});}
});

test('visual artifact exporter rejects ambiguous browser names or corrupt fixtures',()=>{
 const path=mkdtempSync(join(tmpdir(),'teaching-board-visual-safety-'));
 try{
  const snapshots=[{name:'expected',cached:onePixel,export:onePixel,difference:onePixel}];
  const result=[{name:'another',exportHash:'a'.repeat(64),differentPixels:0}];
  assert.throws(()=>writeVisualArtifacts(path,'../../bad',snapshots,result,{width:1,height:1}),/Unknown browser/);
  assert.throws(()=>writeVisualArtifacts(path,'webkit',snapshots,result,{width:1,height:1}),/fixture mismatch/);
  assert.throws(()=>writeVisualArtifacts(path,'webkit',[],result,{width:1,height:1}),/must match/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
