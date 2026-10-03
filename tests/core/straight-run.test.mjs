import test from "node:test";
import assert from "node:assert/strict";
import {
  createStraightRun,
  removeStraightSplit,
  serializeStraightRunToLegacy,
  splitStraightAtDistance,
  splitStraightAtNormalized,
  splitStraightEqual,
  straightRunFromLegacy,
  straightRunSegments,
  straightRunSnapNodes,
  validateStraightRun
} from "../../src/domain/editing/straight-run.mjs";

test("StraightRun keeps one manufacturing straight with internal split nodes",()=>{
  const run=createStraightRun({id:"run-1",total_length_mm:100,nodes_mm:[25,60]});
  assert.equal(run.total_length_mm,100);
  assert.deepEqual(Array.from(run.nodes_mm),[25,60]);
  assert.deepEqual(Array.from(straightRunSegments(run).map((x)=>x.length_mm)),[25,35,40]);
});

test("split by distance from start and end preserves total length",()=>{
  let run=createStraightRun({id:"run-1",total_length_mm:100});
  run=splitStraightAtDistance(run,30,{from:"start"});
  run=splitStraightAtDistance(run,20,{from:"end"});
  assert.equal(run.total_length_mm,100);
  assert.deepEqual(Array.from(run.nodes_mm),[30,80]);
});

test("split by normalized point creates exact internal node",()=>{
  const run=splitStraightAtNormalized(createStraightRun({total_length_mm:120}),0.25);
  assert.deepEqual(Array.from(run.nodes_mm),[30]);
});

test("equal split creates N equal subsegments but still one StraightRun",()=>{
  const run=splitStraightEqual(createStraightRun({total_length_mm:100}),4);
  assert.deepEqual(Array.from(run.nodes_mm),[25,50,75]);
  assert.deepEqual(Array.from(straightRunSegments(run).map((x)=>x.length_mm)),[25,25,25,25]);
});

test("duplicate split inside tolerance is idempotent",()=>{
  let run=createStraightRun({id:"run-1",total_length_mm:100,nodes_mm:[50]});
  const same=splitStraightAtDistance(run,50.0000001,{tolerance_mm:0.001});
  assert.equal(same,run);
});

test("internal segment below Lmin is allowed but reported as Warning",()=>{
  const run=createStraightRun({total_length_mm:100,nodes_mm:[10,60]});
  const result=validateStraightRun(run,{lmin_mm:20,end_segments_exempt:false});
  assert.equal(result.valid,false);
  assert.equal(result.status,"Warning");
  assert.ok(result.issues.some((x)=>x.code==="BELOW_LMIN"&&x.segment_index===0));
});

test("end-segment exemption can preserve technological endpoint allowance rule",()=>{
  const run=createStraightRun({total_length_mm:100,nodes_mm:[10,90]});
  const result=validateStraightRun(run,{lmin_mm:20,end_segments_exempt:true});
  assert.equal(result.valid,true);
});

test("split nodes become exact snap nodes in 3D",()=>{
  const run=createStraightRun({id:"run-1",total_length_mm:100,nodes_mm:[20,50]});
  const nodes=straightRunSnapNodes(run,{origin:{x:10,y:5,z:-2},direction:{x:0,y:2,z:0}});
  assert.deepEqual(nodes[0].point,{x:10,y:25,z:-2});
  assert.deepEqual(nodes[1].point,{x:10,y:55,z:-2});
  assert.equal(nodes[0].type,"Node");
});

test("legacy serialization never emits consecutive LINE rows",()=>{
  const run=createStraightRun({id:"run-1",total_length_mm:100,nodes_mm:[25,50]});
  const row=serializeStraightRunToLegacy(run);
  assert.equal(row.type,"LINE");
  assert.equal(row.L,100);
  assert.deepEqual(Array.from(row.straightRun.nodes_mm),[25,50]);

  const restored=straightRunFromLegacy({...row,elementId:"line-1"});
  assert.equal(restored.total_length_mm,100);
  assert.deepEqual(Array.from(restored.nodes_mm),[25,50]);
});

test("remove split deletes only the internal node",()=>{
  const run=createStraightRun({id:"run",total_length_mm:100,nodes_mm:[20,40,60]});
  const next=removeStraightSplit(run,1);
  assert.deepEqual(Array.from(next.nodes_mm),[20,60]);
  assert.equal(next.total_length_mm,100);
});

test("split endpoints and invalid equal counts are rejected",()=>{
  const run=createStraightRun({total_length_mm:100});
  assert.throws(()=>splitStraightAtDistance(run,0),/> 0/);
  assert.throws(()=>splitStraightAtDistance(run,100),/inside straight run/);
  assert.throws(()=>splitStraightEqual(run,1),/>= 2/);
});
