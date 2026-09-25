import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  analyzeRigidModellingMatrix
} from "../../src/import/dwfx/transform-provenance.mjs";

const golden=JSON.parse(readFileSync(
  new URL(
    "../reference_parts/cases/dwfx-80003043/transform-provenance-golden.json",
    import.meta.url
  ),
  "utf8"
));

test("A20: all six real geometric-variation placement transforms are proper rigid",()=>{
  assert.equal(Object.keys(golden.parts).length,6);
  for(const [partNumber,part] of Object.entries(golden.parts)){
    const result=analyzeRigidModellingMatrix(part.root_matrix);
    assert.equal(result.status,"rigid_proper",partNumber);
    assert.equal(result.preserves_lengths_angles_and_orientation,true,partNumber);
    assert.ok(result.max_axis_length_error<1e-6,partNumber);
    assert.ok(result.max_orthogonality_error<1e-6,partNumber);
    assert.ok(result.determinant_error<1e-6,partNumber);
  }
});

test("A20: real variation structure preserves root placement separate from nested Include Library",()=>{
  for(const [partNumber,part] of Object.entries(golden.parts)){
    assert.equal(part.root_transform_relative_offset,16,partNumber);
    assert.equal(part.nested_identity_relative_offset,68,partNumber);
    assert.equal(part.include_relative_offset,117,partNumber);
    assert.match(part.include_library,/^\?Include Library\/\d+$/,partNumber);
  }
});

test("A20: real placement translations remain provenance, not manufacturing compensation",()=>{
  const translations=Object.values(golden.parts).map((part)=>
    analyzeRigidModellingMatrix(part.root_matrix).translation
  );
  assert.ok(
    translations.some((value)=>
      Math.abs(value[0])>1 ||
      Math.abs(value[1])>1 ||
      Math.abs(value[2])>1
    )
  );
  assert.equal(golden.production_ready,false);
});
