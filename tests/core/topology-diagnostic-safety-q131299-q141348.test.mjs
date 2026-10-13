import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

/** q131299–q141348: 10,050 deterministic diagnostic safety regressions.
 * Scenario IDs are NOT original source-questionnaire requirements.
 */
const FIRST=131299;
let count=0;
function scenario(name,fn){test("q"+(FIRST+count++)+": "+name,fn);}
function pipe(){
 return [
  {type:"LINE",start:[-20,0,0],end:[0,0,0],direction:[1,0,0]},
  {type:"BEND",start_point:[0,0,0],end_point:[10,10,0],tangent_start:[1,0,0],tangent_end:[0,1,0]},
  {type:"LINE",start:[10,10,0],end:[10,30,0],direction:[0,1,0]}
 ];
}
function validate(source,opts,valid,code=null,index=null){
 const original=structuredClone(source);
 const result=validateCandidateTopology(source,opts);
 assert.deepEqual(source,original,"source evidence is immutable");
 assert.equal(result.status,valid?"candidate_valid":"violation");
 assert.equal(result.canonical_ready,valid);
 assert.equal(result.production_ready,false);
 assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.issues));
 if(code)assert.ok(result.issues.some(issue=>issue.code===code&&(index===null||issue.index===index)),JSON.stringify(result.issues));
 return result;
}
// 2,010 valid finite coordinates and exact continuity with explicit tolerances.
for(let i=0;i<2010;i++)scenario("finite translated geometry remains only a candidate "+i,()=>{
 const p=pipe();
 const delta=[i%67-33,Math.floor(i/67)-15,i%31-15];
 for(const v of p){
  for(const k of v.type==="LINE"?["start","end"]:["start_point","end_point"])
   v[k]=v[k].map((n,j)=>n+delta[j]);
 }
 const result=validate(p,{endpoint_tolerance_mm:0,tangent_angle_tolerance_deg:0.25},true);
 assert.equal(result.issues.length,0);
});
// 2,010 gaps on either primitive boundary.
for(let i=0;i<2010;i++)scenario("junction gap must report measured distance "+i,()=>{
 const p=pipe(),gap=0.25+(i%113)/100;
 const index=i%2===0?1:2;
 if(index===1)p[1].start_point=[gap,0,0];
 else p[2].start=[10,10+gap,0];
 const result=validate(p,{endpoint_tolerance_mm:0.1},false,"ENDPOINT_GAP",index);
 const issue=result.issues.find(x=>x.code==="ENDPOINT_GAP"&&x.index===index);
 assert.ok(Math.abs(issue.value-gap)<1e-9);
 assert.equal(issue.tolerance,0.1);
});
// 2,010 mismatches at first or second tangency, at angles safely away from tolerance.
for(let i=0;i<2010;i++)scenario("junction tangency mismatch is localized "+i,()=>{
 const p=pipe(),theta=(5+i%70)*Math.PI/180;
 const index=i%2===0?1:2;
 if(index===1)p[1].tangent_start=[Math.cos(theta),Math.sin(theta),0];
 else p[2].direction=[Math.sin(theta),Math.cos(theta),0];
 const result=validate(p,{tangent_angle_tolerance_deg:0.25},false,"TANGENCY_MISMATCH",index);
 assert.equal(result.issues.some(x=>x.index===index&&x.code==="TANGENCY_MISMATCH"),true);
});
// 2,010 missing or nonfinite primitive coordinate / tangent fields.
for(let i=0;i<2010;i++)scenario("invalid primitive geometry reports a diagnostic "+i,()=>{
 const p=pipe(),mode=i%6;
 if(mode===0)delete p[0].start;
 else if(mode===1)delete p[1].end_point;
 else if(mode===2)p[2].start=[10,NaN,0];
 else if(mode===3)p[0].direction=[Infinity,0,0];
 else if(mode===4)p[1].tangent_end=[0,-Infinity,0];
 else p[2].end=[10,30,NaN];
 validate(p,{},false,"INVALID_PRIMITIVE_DATA");
});
// 2,010 disallowed primitive alternation, even for otherwise coincident points.
for(let i=0;i<2010;i++)scenario("adjacent primitives cannot silently merge "+i,()=>{
 const p=pipe();
 if(i%2===0)p.splice(1,0,{type:"LINE",start:[0,0,0],end:[0,0,0],direction:[1,0,0]});
 else p.splice(2,0,{type:"BEND",start_point:[10,10,0],end_point:[10,10,0],tangent_start:[0,1,0],tangent_end:[0,1,0]});
 validate(p,{},false,"NON_ALTERNATING_TOPOLOGY");
});
assert.equal(count,10050,"exactly 10,050 contiguous scenario IDs must be registered");
