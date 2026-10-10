import test from "node:test";
import assert from "node:assert/strict";
import {
  createDimension,
  replaceDimensionReference,
  setDimensionMode,
  setDrivingTarget,
  updateDimensionRepresentation
} from "../../src/domain/measurements/dimensions.mjs";

function base(mode="Reference"){
  return createDimension({
    id:"dim-1",
    kind:"point-point-length",
    mode,
    references:[
      {object_id:"tube-1",subentity_id:"A",snap_type:"Endpoint",role:"start"},
      {object_id:"tube-1",subentity_id:"B",snap_type:"Endpoint",role:"end"}
    ],
    value:100,
    target_value:mode==="Driving"?100:null,
    status:"Valid"
  });
}

test("question 96: replacing one dimension reference preserves the rest and marks NeedsUpdate",()=>{
  const original=base();
  const next=replaceDimensionReference(original,1,{
    object_id:"tube-2",
    subentity_id:"C",
    snap_type:"Center",
    role:"end",
    assembly_context:{world_point_mm:{x:1,y:2,z:3}}
  });
  assert.equal(next.references[0].object_id,"tube-1");
  assert.equal(next.references[1].object_id,"tube-2");
  assert.equal(next.references[1].snap_type,"Center");
  assert.equal(next.status,"NeedsUpdate");
  assert.equal(original.references[1].object_id,"tube-1");
});

test("question 96: Reference dimension cannot receive Driving target",()=>{
  assert.throws(()=>setDrivingTarget(base(),120),/only Driving/);
});

test("question 96: Driving target stores formula and becomes NeedsSolve",()=>{
  const next=setDrivingTarget(base("Driving"),125,{formula:"L1+25mm"});
  assert.equal(next.target_value,125);
  assert.equal(next.target_formula,"L1+25mm");
  assert.equal(next.status,"NeedsSolve");
});

test("question 96: switching back to Reference clears target and formula",()=>{
  const driving=setDrivingTarget(base("Driving"),125,{formula:"100+25mm"});
  const reference=setDimensionMode(driving,"Reference");
  assert.equal(reference.mode,"Reference");
  assert.equal(reference.target_value,null);
  assert.equal(reference.target_formula,null);
});

test("question 96: representation editing moves text and dimension line without touching references",()=>{
  const original=base();
  const next=updateDimensionRepresentation(original,{
    text_position:{x:10,y:20,z:30},
    leader:{line_position:{x:15,y:25,z:35}}
  });
  assert.deepEqual(next.text_position,{x:10,y:20,z:30});
  assert.deepEqual(next.leader,{line_position:{x:15,y:25,z:35}});
  assert.deepEqual(next.references,original.references);
});
