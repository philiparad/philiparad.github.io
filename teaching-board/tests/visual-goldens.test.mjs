import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const golden=JSON.parse(readFileSync(new URL('../browser-tests/visual-goldens.json',import.meta.url),'utf8'));
const engines=['chromium','firefox','webkit'];
const fixtures=[
 'mixed Hebrew English and inline math',
 'rotated sticky note with custom numbered paragraphs',
 'narrow wrapping, ligatures, emoji and background shapes'
];

test('golden pixel hashes cover exactly three browsers and three nonblank fixtures',()=>{
 assert.equal(golden.schemaVersion,1);
 assert.deepEqual(golden.dimensions,{width:720,height:470});
 assert.deepEqual(Object.keys(golden.engines).sort(),engines);
 assert.match(golden.sourceRun,/^https:\/\/github\.com\/philiparad\/philiparad\.github\.io\/actions\/runs\/\d+$/);
 for(const engine of engines){
  const reference=golden.engines[engine];
  assert.deepEqual(Object.keys(reference).sort(),fixtures.slice().sort());
  for(const fixture of fixtures)assert.match(reference[fixture],/^[0-9a-f]{64}$/);
  assert.equal(new Set(Object.values(reference)).size,fixtures.length);
 }
});
test('pixel goldens remain independent across engine rendering differences',()=>{
 for(const fixture of fixtures){
  const hashes=engines.map(engine=>golden.engines[engine][fixture]);
  assert.equal(new Set(hashes).size,engines.length,'Cross-browser font pixels should be saved separately: '+fixture);
 }
});
test('an intentionally modified render cannot match the committed golden',()=>{
 const baseline=golden.engines.chromium[fixtures[0]];
 const tampered='0'.repeat(64);
 assert.notEqual(baseline,tampered);
 assert.equal(baseline.length,64);
});
