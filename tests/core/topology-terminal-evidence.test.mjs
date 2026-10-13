import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";
function tube(){return [
 {type:"LINE",start:[-20,0,0],end:[0,0,0],direction:[1,0,0]},
 {type:"BEND",start_point:[0,0,0],end_point:[10,10,0],tangent_start:[1,0,0],tangent_end:[0,1,0]},
 {type:"LINE",start:[10,10,0],end:[10,40,0],direction:[0,1,0]}
];}
for (const [name,mutate] of [
 ["last LINE nonfinite end",p=>p[2].end=[10,40,NaN]],
 ["last LINE missing end",p=>delete p[2].end],
 ["last LINE malformed direction",p=>p[2].direction=[0,Infinity,0]],
 ["middle BEND end missing",p=>delete p[1].end_point],
 ["middle BEND terminal tangent nonfinite",p=>p[1].tangent_end=[0,-Infinity,0]],
 ["first LINE with zero direction",p=>p[0].direction=[0,0,0]]
])test(name+" blocks canonical readiness",()=>{
 const p=tube();mutate(p);const before=structuredClone(p);
 const r=validateCandidateTopology(p);
 assert.equal(r.status,"violation");
 assert.equal(r.canonical_ready,false);
 assert.equal(r.production_ready,false);
 assert.ok(r.issues.some(issue=>["INVALID_PRIMITIVE_DATA","UNDEFINED_TANGENT"].includes(issue.code)),JSON.stringify(r.issues));
 assert.deepEqual(p,before);
});
test("valid connected topology still passes geometry candidate validation",()=>{
 const result=validateCandidateTopology(tube());
 assert.equal(result.status,"candidate_valid");
 assert.equal(result.canonical_ready,true);
 assert.equal(result.production_ready,false);
});
