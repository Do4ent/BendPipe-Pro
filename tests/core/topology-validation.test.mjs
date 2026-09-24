import test from "node:test";
import assert from "node:assert/strict";

import { validateCandidateTopology } from "../../src/recognition/topology-validation.mjs";

test("A19: tangent LINE-BEND-LINE topology is candidate-valid",()=>{
  const r=validateCandidateTopology([
    {
      type:"LINE",
      start:[-100,0,0],
      end:[0,0,0],
      direction:[1,0,0]
    },
    {
      type:"BEND",
      start_point:[0,0,0],
      end_point:[50,50,0],
      tangent_start:[1,0,0],
      tangent_end:[0,1,0]
    },
    {
      type:"LINE",
      start:[50,50,0],
      end:[50,150,0],
      direction:[0,1,0]
    }
  ]);

  assert.equal(r.status,"candidate_valid");
  assert.equal(r.canonical_ready,true);
  assert.equal(r.production_ready,false);
  assert.equal(r.issues.length,0);
});

test("A19: endpoint gap is a concrete topology violation",()=>{
  const r=validateCandidateTopology([
    {type:"LINE",start:[0,0,0],end:[10,0,0],direction:[1,0,0]},
    {
      type:"BEND",
      start_point:[10.5,0,0],
      end_point:[20,10,0],
      tangent_start:[1,0,0],
      tangent_end:[0,1,0]
    }
  ],{endpoint_tolerance_mm:0.1});

  assert.equal(r.status,"violation");
  assert.equal(r.canonical_ready,false);
  assert.equal(r.issues[0].code,"ENDPOINT_GAP");
});

test("A19: tangent mismatch is rejected before canonical promotion",()=>{
  const r=validateCandidateTopology([
    {type:"LINE",start:[0,0,0],end:[10,0,0],direction:[1,0,0]},
    {
      type:"BEND",
      start_point:[10,0,0],
      end_point:[20,10,0],
      tangent_start:[0,1,0],
      tangent_end:[0,1,0]
    }
  ],{tangent_angle_tolerance_deg:0.5});

  assert.equal(r.status,"violation");
  assert.ok(r.issues.some(x=>x.code==="TANGENCY_MISMATCH"));
});

test("A19: candidate topology must start with LINE",()=>{
  const r=validateCandidateTopology([
    {
      type:"BEND",
      start_point:[0,0,0],
      end_point:[10,10,0],
      tangent_start:[1,0,0],
      tangent_end:[0,1,0]
    }
  ]);

  assert.equal(r.status,"violation");
  assert.ok(r.issues.some(x=>x.code==="MUST_START_WITH_LINE"));
});

test("A19: adjacent equal primitive types require merge or re-segmentation",()=>{
  const r=validateCandidateTopology([
    {type:"LINE",start:[0,0,0],end:[10,0,0],direction:[1,0,0]},
    {type:"LINE",start:[10,0,0],end:[20,0,0],direction:[1,0,0]}
  ]);

  assert.equal(r.status,"violation");
  assert.ok(r.issues.some(x=>x.code==="NON_ALTERNATING_TOPOLOGY"));
});
