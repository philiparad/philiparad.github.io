import test from 'node:test';
import assert from 'node:assert/strict';
import {createVariationSpec,analyzeVariation,variationKey,parsePointValues} from '../js/variation-table-model.js';

test('teacher sees auto signs, student does not, checking identifies errors',()=>{
    const s=createVariationSpec({zeros:'0',derivativeSource:'2*x',autoSigns:true});
    assert.deepEqual(analyzeVariation(s).intervals.map(i=>i.sign),['-','+']);
    s.session='student';assert.deepEqual(analyzeVariation(s).intervals.map(i=>i.sign),['?','?']);
    s.samples[variationKey(null,0)]={x:-1,sign:'+'};
    assert.deepEqual(analyzeVariation(s).intervals.map(i=>i.sign),['+','?']);
    s.session='check';const checked=analyzeVariation(s).intervals;
    assert.equal(checked[0].firstVerified,false);
    assert.equal(checked[1].firstVerified,null);
    s.samples[variationKey(null,0)].sign='-';
    assert.equal(analyzeVariation(s).intervals[0].firstVerified,true);
});
test('closed domain endpoints can be one-sided extrema',()=>{
    const s=createVariationSpec({domainMin:'0',minClosed:true,derivativeSource:'1/(2*sqrt(x))',autoSigns:true});
    const p=analyzeVariation(s).points[0];
    assert.equal(p.defined,true);assert.equal(p.extremum,'min');assert.equal(p.oneSided,true);
    s.domain.minClosed=false;assert.equal(analyzeVariation(s).points[0].extremum,null);
});
test('exact point-value labels are preserved separately from function evaluation',()=>{
    const s=createVariationSpec({zeros:'1,4',pointValueText:'1=2; 4=5/4'});
    const pts=analyzeVariation(s).points;
    assert.deepEqual(pts.map(p=>p.valueLabel),['2','5/4']);
    assert.deepEqual(parsePointValues('π/2=√2'),{[String(Math.PI/2)]:'√2'});
    assert.throws(()=>parsePointValues('1=f(x); invalid'));
});
