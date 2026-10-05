import test from "node:test";
import assert from "node:assert/strict";
import {
  createSnapCandidate,
  rankSnapCandidates,
  cycleSnapCandidate
} from "../../src/domain/snapping/snap-engine.mjs";

function c(id,type,{virtual=false,distance=1}={}){
  return createSnapCandidate({
    id,type,source:"Tube",object_id:"tube-1",subentity_id:id,
    point:{x:0,y:0,z:0},screen_distance_px:distance,virtual
  });
}

test("question 90: intra-object Snap priority follows accepted CAD order",()=>{
  const ranked=rankSnapCandidates([
    c("nearest","Nearest"),
    c("plane","Plane"),
    c("axis","LineAxis"),
    c("perp","Perpendicular"),
    c("tangent","Tangent"),
    c("mid","Midpoint"),
    c("center","Center"),
    c("intersection","Intersection"),
    c("endpoint","Endpoint"),
    c("node","Node")
  ]);
  assert.deepEqual(ranked.map(x=>x.type),[
    "Endpoint","Node","Intersection","Center","Midpoint",
    "Perpendicular","Tangent","LineAxis","Plane","Nearest"
  ]);
});

test("question 90: virtual Intersection does not outrank real geometric snaps",()=>{
  const ranked=rankSnapCandidates([
    c("virtual-intersection","Intersection",{virtual:true}),
    c("center","Center"),
    c("mid","Midpoint"),
    c("axis","LineAxis"),
    c("plane","Plane"),
    c("nearest","Nearest")
  ]);
  assert.deepEqual(ranked.map(x=>x.id),[
    "center","mid","axis","plane","virtual-intersection","nearest"
  ]);
});

test("question 90: Tab cycling follows ranked candidates and wraps",()=>{
  const candidates=[
    c("nearest","Nearest"),
    c("center","Center"),
    c("endpoint","Endpoint")
  ];
  const first=cycleSnapCandidate(candidates,null,1);
  assert.equal(first.id,"endpoint");
  const second=cycleSnapCandidate(candidates,"endpoint",1);
  assert.equal(second.id,"center");
  const third=cycleSnapCandidate(candidates,"center",1);
  assert.equal(third.id,"nearest");
  const wrapped=cycleSnapCandidate(candidates,"nearest",1);
  assert.equal(wrapped.id,"endpoint");
  const reverse=cycleSnapCandidate(candidates,"endpoint",-1);
  assert.equal(reverse.id,"nearest");
});
