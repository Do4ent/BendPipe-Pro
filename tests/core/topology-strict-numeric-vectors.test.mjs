import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

const validTube=()=>[
 {type:"LINE",start:[-20,0,0],end:[0,0,0],direction:[1,0,0]},
 {type:"BEND",start_point:[0,0,0],end_point:[10,10,0],tangent_start:[1,0,0],tangent_end:[0,1,0]},
 {type:"LINE",start:[10,10,0],end:[10,40,0],direction:[0,1,0]}
];

for(const [label,update] of [
 ["null endpoint coordinate",p=>{p[2].end[2]=null;}],
 ["numeric string endpoint",p=>{p[2].end[2]="0";}],
 ["undefined first coordinate",p=>{p[0].start[1]=undefined;}],
 ["boolean bend tangent",p=>{p[1].tangent_end[1]=true;}],
 ["empty string in direction",p=>{p[2].direction[0]="";}],
 ["nonfinite numeric bend endpoint",p=>{p[1].end_point[0]=Infinity;}]
]){
 test(label+" is rejected, never coerced to geometry",()=>{
  const primitives=validTube();update(primitives);
  const before=structuredClone(primitives);
  const result=validateCandidateTopology(primitives);
  assert.equal(result.status,"violation");
  assert.equal(result.canonical_ready,false);
  assert.equal(result.production_ready,false);
  assert.ok(result.issues.some(x=>x.code==="INVALID_PRIMITIVE_DATA"),JSON.stringify(result.issues));
  assert.deepEqual(primitives,before);
 });
}
test("strict numeric coordinates preserve a valid candidate",()=>{
 const result=validateCandidateTopology(validTube());
 assert.equal(result.status,"candidate_valid");
 assert.equal(result.canonical_ready,true);
 assert.equal(result.production_ready,false);
});
