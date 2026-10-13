import test from "node:test";
import assert from "node:assert/strict";
import {
  createReproducibilityEvidence,
  compareCpuGpuEvidence,
  reproducibilityReleaseGate,
  REPRODUCIBILITY_TOLERANCES
} from "../../src/domain/validation/reproducibility.mjs";

test("CPU and GPU evidence match within fixed tolerances",()=>{
  const cpu=createReproducibilityEvidence({backend:"cpu",payload:{origin:{x:1,y:2,z:3},length_mm:100,angle_deg:90}});
  const gpu=createReproducibilityEvidence({backend:"gpu",payload:{origin:{x:1+5e-7,y:2,z:3},length_mm:100+5e-7,angle_deg:90+5e-8}});
  const report=compareCpuGpuEvidence(cpu,gpu);
  assert.equal(report.status,"Match");
  assert.equal(report.ok,true);
  assert.equal(reproducibilityReleaseGate(report).ok,true);
});

test("CPU GPU mismatch is explicit and blocks release",()=>{
  const cpu=createReproducibilityEvidence({backend:"cpu",payload:{length_mm:100,angle_deg:90}});
  const gpu=createReproducibilityEvidence({backend:"gpu",payload:{length_mm:100.01,angle_deg:90}});
  const report=compareCpuGpuEvidence(cpu,gpu);
  assert.equal(report.status,"Mismatch");
  assert.equal(report.ok,false);
  assert.ok(report.differences.some((x)=>x.path==="length_mm"));
  assert.equal(reproducibilityReleaseGate(report).status,"Blocked");
});

test("missing backend evidence is NotChecked and never passes",()=>{
  const cpu=createReproducibilityEvidence({backend:"cpu",payload:{length_mm:100}});
  const report=compareCpuGpuEvidence(cpu,null);
  assert.equal(report.status,"NotChecked");
  assert.equal(reproducibilityReleaseGate(report).ok,false);
});

test("tolerances are explicit and stable",()=>{
  assert.deepEqual(REPRODUCIBILITY_TOLERANCES,{point_mm:1e-6,length_mm:1e-6,angle_deg:1e-7,scalar:1e-9});
});
