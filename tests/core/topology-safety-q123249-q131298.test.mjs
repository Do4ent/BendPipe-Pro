import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

/** q123249–q131298: 8,050 executable topology candidate safety regressions.
 * IDs are automated scenario counters, NOT source questionnaire requirements.
 */
const FIRST=123249;
let count=0;
function scenario(label,fn){test("q"+(FIRST+count++)+": "+label,fn);}
function line(start,end,direction){return {type:"LINE",start,end,direction};}
function bend(start_point,end_point,tangent_start,tangent_end){
 return {type:"BEND",start_point,end_point,tangent_start,tangent_end};
}
function pipe(){
 return [line([-20,0,0],[0,0,0],[1,0,0]),
 bend([0,0,0],[10,10,0],[1,0,0],[0,1,0]),
 line([10,10,0],[10,35,0],[0,1,0])];
}
function check(source,options,valid,expectedCode=null){
 const before=structuredClone(source);
 const r=validateCandidateTopology(source,options);
 assert.deepEqual(source,before,"source evidence must remain unchanged");
 assert.equal(r.status,valid?"candidate_valid":"violation");
 assert.equal(r.canonical_ready,valid);
 assert.equal(r.production_ready,false);
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.issues));
 if(expectedCode)assert.ok(r.issues.some(x=>x.code===expectedCode),JSON.stringify(r.issues));
 return r;
}
// 1,610 translation invariance of continuous geometry, including large finite offsets.
for(let i=0;i<1610;i++)scenario("translation preserves finite topology "+i,()=>{
 const offset=[(i%23)*100-1100,Math.floor(i/23)*20-600,(i%37)*9-150];
 const shift=p=>p.map((v,k)=>v+offset[k]);
 const geom=pipe().map(p=>p.type==="LINE"?
   line(shift(p.start),shift(p.end),[...p.direction]):
   bend(shift(p.start_point),shift(p.end_point),[...p.tangent_start],[...p.tangent_end]));
 const r=check(geom,{},true);
 assert.equal(r.issues.length,0);
});
// 1,610 rejected finite gaps, with explicit gap measurements.
for(let i=0;i<1610;i++)scenario("finite gap is measured and rejected "+i,()=>{
 const geom=pipe();
 const gap=0.25+(i%200)/100;
 geom[1].start_point=[gap,0,0];
 const r=check(geom,{endpoint_tolerance_mm:0.1},false,"ENDPOINT_GAP");
 const issue=r.issues.find(x=>x.code==="ENDPOINT_GAP"&&x.index===1);
 assert.ok(issue&&Math.abs(issue.value-gap)<1e-9);
});
// 1,610 angular discontinuities on either junction.
for(let i=0;i<1610;i++)scenario("junction tangency discontinuity is detected "+i,()=>{
 const geom=pipe(),theta=(5+i%80)*Math.PI/180;
 const vector=[Math.cos(theta),Math.sin(theta),0];
 const idx=i%2?2:1;
 if(idx===1)geom[1].tangent_start=vector;
 else geom[2].direction=[Math.sin(theta),Math.cos(theta),0];
 const r=check(geom,{tangent_angle_tolerance_deg:0.25},false,"TANGENCY_MISMATCH");
 assert.ok(r.issues.some(x=>x.code==="TANGENCY_MISMATCH"&&x.index===idx));
});
// 1,610 invalid numeric endpoint tolerances must throw, not silently accept.
for(let i=0;i<1610;i++)scenario("invalid endpoint tolerance is rejected "+i,()=>{
 const invalid=[Infinity,-Infinity,NaN,-(i+1)/1000,"0.1",null,true,{},[0.1]][i%9];
 assert.throws(()=>validateCandidateTopology(pipe(),{endpoint_tolerance_mm:invalid}),
   /endpoint_tolerance_mm must be a finite number/);
});
// 1,610 invalid angular tolerances must throw, not silently waive checks.
for(let i=0;i<1610;i++)scenario("invalid angular tolerance is rejected "+i,()=>{
 const invalid=[Infinity,-Infinity,NaN,-(i+1)/1000,180,180+i/100,"0.25",null,true,{},[0.25]][i%11];
 assert.throws(()=>validateCandidateTopology(pipe(),{tangent_angle_tolerance_deg:invalid}),
   /tangent_angle_tolerance_deg must be a finite number/);
});
assert.equal(count,8050,"register exactly 8,050 scenarios");
