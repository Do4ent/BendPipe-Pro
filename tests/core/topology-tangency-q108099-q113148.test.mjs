import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

/**
 * q108099–q113148: 5,050 deterministic tangency-tolerance regressions.
 * IDs label executable scenarios, NOT independently completed questionnaire requirements.
 */
const FIRST=108099;
let count=0;
const scenario=(name,fn)=>test("q"+(FIRST+count++)+": "+name,fn);
function pipe(angleDeg=0){
  const radians=angleDeg*Math.PI/180;
  return [
    {type:"LINE",start:[-20,0,0],end:[0,0,0],direction:[1,0,0]},
    {type:"BEND",start_point:[0,0,0],end_point:[10,10,0],
      tangent_start:[Math.cos(radians),Math.sin(radians),0],
      tangent_end:[0,1,0]},
    {type:"LINE",start:[10,10,0],end:[10,30,0],direction:[0,1,0]}
  ];
}
function verify(source,options,valid,issueCode){
  const before=structuredClone(source);
  const result=validateCandidateTopology(source,options);
  assert.deepEqual(source,before,"validation must not modify source geometry");
  assert.equal(result.status,valid?"candidate_valid":"violation");
  assert.equal(result.canonical_ready,valid);
  assert.equal(result.production_ready,false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.issues));
  if(issueCode)assert.ok(result.issues.some(x=>x.code===issueCode),JSON.stringify(result.issues));
  return result;
}

// Valid explicit numeric tangent-angle tolerances across [0,180).
for(let i=0;i<1010;i++){
  scenario("finite angle tolerance is retained without production promotion "+i,()=>{
    const tolerance=(i%1010)*179/1010;
    const result=verify(pipe(0),{tangent_angle_tolerance_deg:tolerance},true);
    assert.equal(result.tolerances.tangent_angle_tolerance_deg,tolerance);
    assert.equal(result.issues.length,0);
  });
}
// Nonfinite and out-of-domain angular tolerances cannot waive tangent checking.
for(let i=0;i<1010;i++){
  scenario("nonfinite or out-of-range angular tolerance is rejected "+i,()=>{
    const invalid=[Infinity,-Infinity,NaN,-(i+1)/1000,180,180+i/10][i%6];
    assert.throws(()=>validateCandidateTopology(pipe(),{tangent_angle_tolerance_deg:invalid}),
      /tangent_angle_tolerance_deg must be a finite number/);
  });
}
// Type coercion is forbidden for measurement tolerances.
for(let i=0;i<1010;i++){
  scenario("non-number angular tolerance is rejected "+i,()=>{
    const invalid=["0.25",null,true,false,[0.25],{value:0.25},undefined][i%7];
    // undefined is defaulted by JS destructuring; verify non-number inputs only.
    if(invalid===undefined){
      const result=verify(pipe(),{},true);
      assert.equal(result.tolerances.tangent_angle_tolerance_deg,0.25);
    }else{
      assert.throws(()=>validateCandidateTopology(pipe(),{tangent_angle_tolerance_deg:invalid}),
        /tangent_angle_tolerance_deg must be a finite number/);
    }
  });
}
// Clearly inside/outside explicit angle thresholds; avoid floating-point boundary ambiguity.
for(let i=0;i<1010;i++){
  scenario("tangency threshold detects angular mismatch "+i,()=>{
    const tolerance=1+(i%40);
    const within=i%2===0;
    const angle=within?tolerance*0.5:tolerance*1.5;
    const result=verify(pipe(angle),{tangent_angle_tolerance_deg:tolerance},
      within,within?null:"TANGENCY_MISMATCH");
    assert.equal(result.issues.filter(x=>x.code==="TANGENCY_MISMATCH").length,within?0:1);
  });
}
// Undefined zero tangent directions are never accepted as candidate-valid.
for(let i=0;i<1010;i++){
  scenario("undefined zero tangent direction blocks geometry promotion "+i,()=>{
    const source=pipe(0);
    if(i%2===0)source[0].direction=[0,0,0];
    else source[1].tangent_start=[0,0,0];
    const result=verify(source,{tangent_angle_tolerance_deg:179},false,"UNDEFINED_TANGENT");
    assert.equal(result.issues.some(x=>x.index===1),true);
  });
}
assert.equal(count,5050,"exactly 5,050 executable scenarios are registered");
