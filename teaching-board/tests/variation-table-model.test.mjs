import test from 'node:test';
import assert from 'node:assert/strict';
import {createVariationSpec,analyzeVariation,variationBreakpoints,variationDomainContains,variationIntervals,coordinate} from '../js/variation-table-model.js';

test('rational function: signed intervals, extrema and undefined columns',()=>{
    const s=createVariationSpec({zeros:'4, 1',undefinedPoints:'2, -2',functionSource:'(x^2+2*x-9)/(x^2-4)',
        derivativeSource:'(-2*x^2+10*x-8)/(x^2-4)^2',autoSigns:true});
    const a=analyzeVariation(s);
    assert.deepEqual(a.points.map(p=>p.x),[-2,1,2,4]);
    assert.deepEqual(a.intervals.map(i=>i.sign),['-','-','+','+','-']);
    assert.deepEqual(a.points.map(p=>p.extremum),[null,'min',null,'max']);
    assert.equal(a.points[1].value,2);
    assert.equal(a.points[3].value,1.25);
    assert.deepEqual(a.points.map(p=>p.defined),[false,true,false,true]);
});
test('cusp may be extremum; hole is never one',()=>{
    const cusp=createVariationSpec({derivativeUndefined:'0',derivativeSource:'x/abs(x)',autoSigns:true});
    assert.equal(analyzeVariation(cusp).points[0].extremum,'min');
    const hole=createVariationSpec({undefinedPoints:'2',derivativeSource:'-1/(x-2)^2',autoSigns:true});
    assert.equal(analyzeVariation(hole).points[0].extremum,null);
});
test('inflection is distinct from stationary extremum, continuity is explicit',()=>{
    const s=createVariationSpec({mode:'inflection',secondZeros:'0',secondSource:'6*x',autoSigns:true});
    assert.equal(analyzeVariation(s).points[0].inflection,false);
    s.assumeContinuous=true;
    assert.equal(analyzeVariation(s).points[0].inflection,true);
    assert.equal(analyzeVariation(s).points[0].extremum,null);
});
test('bounded domains, exact fractions and invalid interval tests',()=>{
    const s=createVariationSpec({domainMin:'0',minClosed:true,zeros:'1/2',derivativeSource:'2*x-1',autoSigns:true});
    assert.deepEqual(variationBreakpoints(s).map(p=>p.x),[0,.5]);
    assert.equal(variationDomainContains(s,0),true);
    assert.equal(variationIntervals(s)[0].active,false);
    assert.equal(coordinate('π/2'),Math.PI/2);
    s.samples['0|0.5']={x:0.6,sign:'+'};
    assert.throws(()=>analyzeVariation(s),/inside/);
});
test('duplicate points collapse, contradictory zero and hole rejected',()=>{
    const s=createVariationSpec({zeros:'2,2,1',undefinedPoints:'-1'});
    assert.deepEqual(variationBreakpoints(s).map(p=>p.x),[-1,1,2]);
    s.points.push({x:2,label:'2',kind:'undefined'});
    assert.throws(()=>analyzeVariation(s),/undefined/);
});
test('invalid coordinates and unsafe expression fail without eval',()=>{
    for(const raw of ['x+2','1/0','evil()','',1e10])assert.throws(()=>coordinate(raw));
    const s=createVariationSpec({zeros:'0'});
    s.samples['-inf|0']={x:-1,sign:'script'};
    assert.throws(()=>analyzeVariation(s));
    assert.throws(()=>createVariationSpec({zeros:'0',functionSource:'process.exit(1)'}));
});
