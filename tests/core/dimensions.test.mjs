import test from "node:test";
import assert from "node:assert/strict";
import {
  createDimension,
  drivingSolvePlan,
  formatDimensionValue,
  recalculateDimension,
  removeDimensionRepresentation,
  setDimensionMode,
  setDrivingTarget,
  updateDimensionStyle,
  upsertDimensionRepresentation
} from "../../src/domain/measurements/dimensions.mjs";

function base(){
  return createDimension({
    id:"dim-1",
    kind:"point-point-length",
    references:[
      {object_id:"tube-1",subentity_id:"P1",snap_type:"Endpoint",role:"start"},
      {object_id:"tube-1",subentity_id:"P2",snap_type:"Endpoint",role:"end"}
    ],
    value:100,
    format:{length_decimals:2,trailing_zeros:true}
  });
}

test("measurement dimensions default to associative Reference mode",()=>{
  const d=base();
  assert.equal(d.mode,"Reference");
  assert.equal(d.status,"NeedsUpdate");
  assert.equal(d.references[0].snap_type,"Endpoint");
});

test("dimension placement/style edits do not change engineering value",()=>{
  const d=base();
  const moved=updateDimensionStyle(d,{
    text_position:{x:10,y:20,z:0},
    leader:{x:1,y:0,z:0},
    format:{length_decimals:3}
  });
  assert.equal(moved.value,100);
  assert.deepEqual(moved.text_position,{x:10,y:20,z:0});
  assert.equal(moved.format.length_decimals,3);
});

test("reference dimension recalculates through resolved associative references",()=>{
  const d=base();
  const refs={
    "tube-1:P1":{x:0,y:0,z:0},
    "tube-1:P2":{x:3,y:4,z:12}
  };
  const next=recalculateDimension(d,{
    resolveReference:(ref)=>refs[ref.object_id+":"+ref.subentity_id],
    measure:(_kind,[a,b])=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)
  });
  assert.equal(next.status,"Valid");
  assert.equal(next.value,13);
});

test("lost associative reference becomes explicit red-state data instead of guessed rebind",()=>{
  const d=base();
  const next=recalculateDimension(d,{
    resolveReference:(ref)=>ref.subentity_id==="P1"?{x:0,y:0,z:0}:null,
    measure:()=>999
  });
  assert.equal(next.status,"LostReference");
  assert.equal(next.value,null);
  assert.deepEqual(Array.from(next.lost_reference_indexes),[1]);
});

test("measurement calculation error is preserved explicitly",()=>{
  const d=base();
  const next=recalculateDimension(d,{
    resolveReference:()=>({}),
    measure:()=>{throw new Error("bad geometry");}
  });
  assert.equal(next.status,"Error");
  assert.match(next.calculation_error,/bad geometry/);
});

test("Reference can switch to Driving without silently applying geometry edits",()=>{
  const d=setDimensionMode(base(),"Driving");
  assert.equal(d.mode,"Driving");
  assert.equal(d.target_value,100);
  const target=setDrivingTarget(d,125);
  assert.equal(target.target_value,125);
  assert.equal(target.status,"NeedsSolve");
});

test("Driving solve returns a local plan but never mutates constraints itself",()=>{
  const d=setDrivingTarget(setDimensionMode(base(),"Driving"),120);
  const plan=drivingSolvePlan(d,{
    resolveReference:(ref)=>({id:ref.subentity_id}),
    planSolve:({target_value})=>({
      ok:true,
      scope:"local",
      changes:[{object_id:"tube-1",field:"last-free-straight",delta_mm:target_value-100}]
    })
  });
  assert.equal(plan.ok,true);
  assert.equal(plan.scope,"local");
  assert.equal(plan.changes[0].delta_mm,20);
});

test("Driving conflicts are returned and not auto-resolved",()=>{
  const d=setDrivingTarget(setDimensionMode(base(),"Driving"),120);
  const plan=drivingSolvePlan(d,{
    resolveReference:()=>({}),
    planSolve:()=>({ok:false,conflicts:["P2 locked","CLR fixed"]})
  });
  assert.equal(plan.ok,false);
  assert.equal(plan.status,"Conflict");
  assert.deepEqual(Array.from(plan.conflicts),["P2 locked","CLR fixed"]);
  assert.deepEqual(Array.from(plan.changes),[]);
});

test("display precision is separate from stored engineering value",()=>{
  const d=createDimension({
    id:"dim-angle",
    kind:"line-line-angle",
    references:[{object_id:"a"},{object_id:"b"}],
    value:12.3456789,
    format:{angle_decimals:2,trailing_zeros:true}
  });
  assert.equal(formatDimensionValue(d),"12.35°");
  assert.equal(d.value,12.3456789);
});

test("same engineering dimension can have independent 3D and drawing placements",()=>{
  let d=base();
  d=upsertDimensionRepresentation(d,{
    id:"rep-3d",
    surface:"3D",
    text_position:{x:1,y:2,z:3},
    visible:true
  });
  d=upsertDimensionRepresentation(d,{
    id:"rep-front",
    surface:"2D",
    view_id:"front",
    text_position:{x:50,y:20,z:0},
    visible:true
  });
  assert.equal(d.representations.length,2);
  assert.notDeepEqual(d.representations[0].text_position,d.representations[1].text_position);

  const removed=removeDimensionRepresentation(d,"rep-front");
  assert.equal(removed.representations.length,1);
  assert.equal(removed.value,d.value);
  assert.equal(removed.references.length,d.references.length);
});
