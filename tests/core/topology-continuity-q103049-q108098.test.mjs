import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

/**
 * q103049–q108098: 5,050 deterministic executable topology regressions.
 * q identifiers are scenario counters, NOT newly completed product requirements.
 * Every passing result remains a non-production geometry candidate.
 */
const FIRST=103049;
let count=0;
function scenario(name,fn){test("q"+(FIRST+count++)+": "+name,fn);}
function pipe(gap=0){
  return [
    {type:"LINE",start:[-25,0,0],end:[0,0,0],direction:[1,0,0]},
    {type:"BEND",start_point:[gap,0,0],end_point:[10,10,0],
      tangent_start:[1,0,0],tangent_end:[0,1,0]},
    {type:"LINE",start:[10,10,0],end:[10,40,0],direction:[0,1,0]}
  ];
}
function validate(source,options,valid,code=null){
  const before=structuredClone(source);
  const result=validateCandidateTopology(source,options);
  assert.deepEqual(source,before,"validation must preserve exact source evidence");
  assert.equal(result.status,valid?"candidate_valid":"violation");
  assert.equal(result.canonical_ready,valid);
  assert.equal(result.production_ready,false);
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.issues));
  if(code)assert.ok(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues));
  return result;
}

// 1,010 valid, finite, explicit mm tolerances never promote manufacturing status.
for(let i=0;i<1010;i++){
  scenario("finite topology endpoint tolerance remains bounded "+i,()=>{
    const tolerance=i%7/100;
    const r=validate(pipe(0),{endpoint_tolerance_mm:tolerance,tangent_angle_tolerance_deg:0.25},true);
    assert.equal(r.tolerances.endpoint_tolerance_mm,tolerance);
    assert.equal(r.issues.length,0);
  });
}

// 1,010 reject Infinity, -Infinity, NaN and negative endpoint tolerances.
for(let i=0;i<1010;i++){
  scenario("invalid endpoint tolerance cannot waive continuity "+i,()=>{
    const invalid=[Infinity,-Infinity,NaN,-(i+1)/1000][i%4];
    assert.throws(
      ()=>validateCandidateTopology(pipe(1),{endpoint_tolerance_mm:invalid}),
      /endpoint_tolerance_mm must be a finite number/
    );
  });
}

// 1,010 reject coerced strings, null, boolean, arrays and objects.
for(let i=0;i<1010;i++){
  scenario("endpoint tolerance must be a real numeric measurement "+i,()=>{
    const invalid=["0.1",null,true,[0.1],{value:0.1}][i%5];
    assert.throws(
      ()=>validateCandidateTopology(pipe(0),{endpoint_tolerance_mm:invalid}),
      /endpoint_tolerance_mm must be a finite number/
    );
  });
}

// 1,010 measurable gaps on either side of a finite threshold.
for(let i=0;i<1010;i++){
  scenario("endpoint continuity is deterministic around finite tolerance "+i,()=>{
    const tolerance=0.01+(i%17)/1000,within=i%2===0;
    const gap=within?tolerance*0.5:tolerance*1.5;
    const r=validate(pipe(gap),{endpoint_tolerance_mm:tolerance},within,
      within?null:"ENDPOINT_GAP");
    assert.equal(r.issues.filter(x=>x.code==="ENDPOINT_GAP").length,within?0:1);
  });
}

// 1,010 a lone first LINE must be fully shaped, not silently accepted.
for(let i=0;i<1010;i++){
  scenario("initial primitive with missing or nonfinite geometry is rejected "+i,()=>{
    const source=[{type:"LINE",start:[0,0,0],end:[20,0,0],direction:[1,0,0]}];
    if(i%4===0)delete source[0].start;
    if(i%4===1)delete source[0].end;
    if(i%4===2)delete source[0].direction;
    if(i%4===3)source[0].start=[0,NaN,0];
    const r=validate(source,{},false,"INVALID_PRIMITIVE_DATA");
    assert.equal(r.issues.some(x=>x.index===0),true);
  });
}
assert.equal(count,5050,"exactly 5,050 topology scenarios must be registered");
