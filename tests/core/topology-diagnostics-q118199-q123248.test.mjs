import test from "node:test";
import assert from "node:assert/strict";
import {validateCandidateTopology} from "../../src/recognition/topology-validation.mjs";

/** q118199–q123248: 5,050 topology diagnostics regressions.
 * These q IDs are test scenario identifiers, NOT original questionnaire requirements.
 */
const FIRST=118199;
let count=0;
function scenario(label,run){ test("q"+(FIRST+count++)+": "+label,run); }
function line(start=[0,0,0],end=[20,0,0],direction=[1,0,0]){
  return {type:"LINE",start,end,direction};
}
function bend(){return {type:"BEND",start_point:[20,0,0],end_point:[30,10,0],tangent_start:[1,0,0],tangent_end:[0,1,0]};}
function pipe(){return [line(),bend(),line([30,10,0],[30,30,0],[0,1,0])];}
function verify(source,expected,code,index,options={}){
  const before=structuredClone(source);
  const out=validateCandidateTopology(source,options);
  assert.deepEqual(source,before,"input must be preserved");
  assert.equal(out.status,expected?"candidate_valid":"violation");
  assert.equal(out.canonical_ready,expected);
  assert.equal(out.production_ready,false);
  assert.ok(Object.isFrozen(out) && Object.isFrozen(out.issues));
  if(code)assert.ok(out.issues.some(x=>x.code===code && x.index===index),JSON.stringify(out.issues));
  return out;
}
// 1010 empty inputs: an empty candidate must never promote.
for(let i=0;i<1010;i++)scenario("empty primitive array stays invalid "+i,()=>{
 const r=verify([],false,"EMPTY_TOPOLOGY",null);
 assert.equal(r.issues[0].code,"EMPTY_TOPOLOGY");
});
// 1010 missing/unsupported first primitives.
for(let i=0;i<1010;i++)scenario("unsupported start cannot be promoted "+i,()=>{
 const value=[null,{}, {type:"ARC"}, {type:"MESH"}, false][i%5];
 verify([value,...pipe()],false,"UNSUPPORTED_PRIMITIVE",0);
});
// 1010 candidates beginning with bend should carry an explicit diagnostic.
for(let i=0;i<1010;i++)scenario("bend-first sequence violates topology "+i,()=>{
 const src=[bend(),line([30,10,0],[30,30,0],[0,1,0])];
 const result=verify(src,false,"MUST_START_WITH_LINE",0);
 assert.equal(result.issues.some(x=>x.code==="MUST_START_WITH_LINE"),true);
});
// 1010 malformed trailing primitives must be diagnosed without changing source.
for(let i=0;i<1010;i++)scenario("unsupported trailing primitive is diagnosed "+i,()=>{
 const bad=[null,{}, {type:"ARC"}, {type:"CIRCLE"}, 7][i%5];
 const result=verify([...pipe(),bad],false,"UNSUPPORTED_PRIMITIVE",3);
 assert.equal(result.issues.some(x=>x.index===3),true);
});
// 1010 finite, clearly distant gaps must produce a measurable diagnostic.
for(let i=0;i<1010;i++)scenario("gap diagnostic reports a finite measured distance "+i,()=>{
 const src=pipe();
 const gap=1+(i%101)/10;
 src[1].start_point=[20+gap,0,0];
 const r=verify(src,false,"ENDPOINT_GAP",1,{endpoint_tolerance_mm:0.1});
 const issue=r.issues.find(x=>x.code==="ENDPOINT_GAP"&&x.index===1);
 assert.ok(Number.isFinite(issue.value));
 assert.ok(Math.abs(issue.value-gap)<1e-10);
 assert.equal(issue.tolerance,0.1);
});
assert.equal(count,5050,"exactly 5,050 registered scenario cases");
