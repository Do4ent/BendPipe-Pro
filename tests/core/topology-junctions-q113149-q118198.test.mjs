import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";
/** q113149–q118198: 5,050 deterministic candidate topology validation scenarios.
 * Scenario counters, not numbered source questionnaire requirements. */
const FIRST=113149;
let count=0;
function scenario(name,fn){test("q"+(FIRST+count++)+": "+name,fn);}
function line(start,end,direction){return {type:"LINE",start,end,direction};}
function bend(start_point,end_point,tangent_start,tangent_end){
 return {type:"BEND",start_point,end_point,tangent_start,tangent_end};
}
function tube(){
 return [
 line([-20,0,0],[0,0,0],[1,0,0]),
 bend([0,0,0],[10,10,0],[1,0,0],[0,1,0]),
 line([10,10,0],[10,30,0],[0,1,0])
 ];
}
function check(geometry,options,expected,issue){
 const original=structuredClone(geometry);
 const r=validateCandidateTopology(geometry,options);
 assert.deepEqual(geometry,original,"input cannot be modified");
 assert.equal(r.status,expected?"candidate_valid":"violation");
 assert.equal(r.canonical_ready,expected);
 assert.equal(r.production_ready,false);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(Object.isFrozen(r.issues),true);
 if(issue)assert.ok(r.issues.some(x=>x.code===issue),JSON.stringify(r.issues));
 return r;
}
// 1. Valid alternating topology preserved under finite 3D translations.
for(let i=0;i<1010;i++){
 scenario("translated connected candidate remains geometry-only "+i,()=>{
  const t=[(i%101)-50,Math.floor(i/101)-5,(i%17)-8];
  const move=p=>p.map((v,k)=>v+t[k]);
  const original=tube();
  const translated=original.map(p=>p.type==="LINE"?
   line(move(p.start),move(p.end),[...p.direction]):
   bend(move(p.start_point),move(p.end_point),[...p.tangent_start],[...p.tangent_end]));
  const r=check(translated,{},true);
  assert.equal(r.issues.length,0);
 });
}
// 2. A disconnected junction is rejected even when prior joints are valid.
for(let i=0;i<1010;i++){
 scenario("later endpoint separation reports explicit gap "+i,()=>{
  const source=tube();
  source[2].start=[10+(i+1)/100,10,0];
  const r=check(source,{endpoint_tolerance_mm:0},false,"ENDPOINT_GAP");
  assert.ok(r.issues.some(x=>x.index===2&&x.code==="ENDPOINT_GAP"));
 });
}
// 3. Adjacent identical primitives require segmentation or merge.
for(let i=0;i<1010;i++){
 scenario("same-type primitives cannot be implicitly merged "+i,()=>{
  const source=tube();
  if(i%2===0)source.splice(1,0,line([0,0,0],[0,0,0],[1,0,0]));
  else source.splice(2,0,bend([10,10,0],[10,10,0],[0,1,0],[0,1,0]));
  check(source,{},false,"NON_ALTERNATING_TOPOLOGY");
 });
}
// 4. Invalid adjacent coordinates are explicit failures, never silent coercion.
for(let i=0;i<1010;i++){
 scenario("malformed junction coordinate is rejected "+i,()=>{
  const source=tube();
  const bad=[NaN,Infinity,-Infinity];
  if(i%2===0)source[1].start_point=[bad[i%3],0,0];
  else source[2].start=[10,bad[i%3],0];
  check(source,{},false,"INVALID_PRIMITIVE_DATA");
 });
}
// 5. Tangency mismatch on a later boundary must be caught.
for(let i=0;i<1010;i++){
 scenario("last junction direction discontinuity is rejected "+i,()=>{
  const source=tube();
  const theta=(5+(i%65))*Math.PI/180;
  source[2].direction=[Math.sin(theta),Math.cos(theta),0];
  const r=check(source,{tangent_angle_tolerance_deg:0.25},false,"TANGENCY_MISMATCH");
  assert.ok(r.issues.some(x=>x.index===2&&x.code==="TANGENCY_MISMATCH"));
 });
}
assert.equal(count,5050,"must register exactly 5,050 consecutive scenarios");
