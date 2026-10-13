import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const golden=JSON.parse(readFileSync(
  new URL(
    "../reference_parts/cases/dwfx-80003043/neutral-bend-sequence-golden.json",
    import.meta.url
  ),
  "utf8"
));

function developedLength(part){
  return part.bends.reduce(
    (sum,bend)=>
      sum+
      bend.straight_before_mm+
      bend.clr_mm*Math.abs(bend.bend_angle_deg)*Math.PI/180,
    part.tail_length_mm
  );
}

test("A20: real neutral bend tables remain machine-compensation free",()=>{
  assert.equal(golden.machine_compensation_applied,false);
  assert.equal(golden.production_ready,false);
  for(const part of Object.values(golden.parts)){
    assert.ok(part.bends.length>=1);
    assert.equal(part.bends[0].rotation_from_previous_bend_deg,null);
  }
});

test("A20: real neutral bend tables reconstruct exact metadata length within 0.1 mm",()=>{
  for(const [partNumber,part] of Object.entries(golden.parts)){
    const reconstructed=developedLength(part);
    const error=Math.abs(reconstructed-part.developed_length_mm);
    assert.ok(error<0.1,`${partNumber} developed length error ${error}`);
  }
});

test("A20: real neutral bend rotations preserve notable coplanar, orthogonal and reverse-plane cases",()=>{
  assert.ok(
    Math.abs(golden.parts["10157546"].bends[1].rotation_from_previous_bend_deg)<1e-6
  );
  assert.ok(
    Math.abs(golden.parts["10157546"].bends[2].rotation_from_previous_bend_deg-90)<0.001
  );
  assert.ok(
    Math.abs(
      Math.abs(golden.parts["10157549"].bends[1].rotation_from_previous_bend_deg)-180
    )<0.001
  );
  assert.ok(
    Math.abs(golden.parts["10157552"].bends[2].rotation_from_previous_bend_deg+90)<0.001
  );
});

test("A20: real bend tables expose expected bend counts",()=>{
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(golden.parts).map(
        ([partNumber,part])=>[partNumber,part.bends.length]
      )
    ),
    {
      "10160780":2,
      "10157546":6,
      "10157555":3,
      "10157683":6,
      "10157549":3,
      "10157552":4
    }
  );
});
