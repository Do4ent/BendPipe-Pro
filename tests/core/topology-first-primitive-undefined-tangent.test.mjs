import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

const goodLine=()=>({type:"LINE",start:[0,0,0],end:[20,0,0],direction:[1,0,0]});
const goodBend=()=>({type:"BEND",start_point:[0,0,0],end_point:[10,10,0],tangent_start:[1,0,0],tangent_end:[0,1,0]});

test("single LINE with zero direction is not a valid geometry candidate",()=>{
 const source=[{...goodLine(),direction:[0,0,0]}],before=structuredClone(source);
 const result=validateCandidateTopology(source);
 assert.equal(result.status,"violation");
 assert.equal(result.canonical_ready,false);
 assert.equal(result.production_ready,false);
 assert.ok(result.issues.some(x=>x.code==="UNDEFINED_TANGENT"&&x.index===0));
 assert.deepEqual(source,before);
});
test("first BEND with zero start tangent emits both applicable diagnostics",()=>{
 const result=validateCandidateTopology([{...goodBend(),tangent_start:[0,0,0]}]);
 assert.equal(result.status,"violation");
 assert.equal(result.production_ready,false);
 assert.ok(result.issues.some(x=>x.code==="MUST_START_WITH_LINE"));
 assert.ok(result.issues.some(x=>x.code==="UNDEFINED_TANGENT"&&x.index===0));
});
test("first BEND with zero end tangent is never canonical-ready",()=>{
 const result=validateCandidateTopology([{...goodBend(),tangent_end:[0,0,0]}]);
 assert.equal(result.canonical_ready,false);
 assert.ok(result.issues.some(x=>x.code==="UNDEFINED_TANGENT"&&x.index===0));
});
test("valid standalone LINE preserves preexisting topology behavior",()=>{
 const result=validateCandidateTopology([goodLine()]);
 assert.equal(result.status,"candidate_valid");
 assert.equal(result.production_ready,false);
 assert.equal(result.issues.length,0);
});
test("nonfinite direction still reports invalid primitive data",()=>{
 const result=validateCandidateTopology([{...goodLine(),direction:[Infinity,0,0]}]);
 assert.ok(result.issues.some(x=>x.code==="INVALID_PRIMITIVE_DATA"&&x.index===0));
 assert.equal(result.canonical_ready,false);
});
