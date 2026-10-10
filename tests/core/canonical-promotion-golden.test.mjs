import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { evaluateCanonicalPromotion } from "../../src/recognition/canonical-promotion.mjs";
import { validateDevelopedLengthConsistency } from "../../src/recognition/developed-length-consistency.mjs";
import { analyzeRigidModellingMatrix } from "../../src/import/dwfx/transform-provenance.mjs";

function read(name){
  return JSON.parse(readFileSync(
    new URL("../reference_parts/cases/dwfx-80003043/"+name,import.meta.url),
    "utf8"
  ));
}

const descriptor=read("model-descriptor-golden.json");
const primitives=read("recognized-primitives-golden.json");
const neutral=read("neutral-bend-sequence-golden.json");
const transforms=read("transform-provenance-golden.json");

test("A20: all six real 80003043 tubes satisfy canonical promotion evidence gate",()=>{
  const partNumbers=Object.keys(primitives.parts).sort();
  assert.equal(partNumbers.length,6);

  for(const partNumber of partNumbers){
    const part=primitives.parts[partNumber];
    const neutralPart=neutral.parts[partNumber];
    const placement=transforms.parts[partNumber];
    const placementAnalysis=analyzeRigidModellingMatrix(placement.root_matrix);
    const lengthConsistency=validateDevelopedLengthConsistency(
      part.primitives,
      part.developed_length_mm,
      {tolerance_mm:0.1}
    );

    const result=evaluateCanonicalPromotion({
      geometry:{
        status:"geometry_candidate",
        include_library:placement.include_library,
        source_scale_status:"explicit_source",
        source_scale_mm_per_source_unit:descriptor.scale_mm_per_source_unit,
        topology:{status:"candidate_valid"},
        length_consistency:lengthConsistency,
        neutral_bend_sequence:{
          status:"candidate",
          bend_count:neutralPart.bends.length
        },
        segmentation:{primitive_count:part.primitives.length},
        machine_compensation_applied:false
      },
      descriptor:{
        status:descriptor.status,
        w3d:{
          scale_mm_per_source_unit:descriptor.scale_mm_per_source_unit,
          polygon_handedness:descriptor.polygon_handedness
        }
      },
      transform_provenance:{
        status:placementAnalysis.status==="rigid_proper"
          ?"rigid_placement"
          :"blocked",
        intrinsic_geometry_invariants_preserved:
          placementAnalysis.preserves_lengths_angles_and_orientation,
        transform_count:2
      }
    });

    assert.equal(result.status,"canonical_candidate",partNumber);
    assert.equal(result.canonical_ready,true,partNumber);
    assert.equal(result.production_ready,false,partNumber);
    assert.deepEqual(result.blockers,[],partNumber);
    assert.equal(result.source_scale_mm_per_source_unit,10,partNumber);
    assert.equal(result.polygon_handedness,"left",partNumber);
    assert.equal(result.bend_count,neutralPart.bends.length,partNumber);
  }
});

test("A20: real descriptor facts remain exact source truth for canonical promotion",()=>{
  assert.equal(descriptor.model_unit,"mm");
  assert.deepEqual(
    descriptor.graphic_resource_transform,
    [10,0,0,0,0,10,0,0,0,0,10,0,0,0,0,1]
  );
  assert.equal(descriptor.scale_mm_per_source_unit,10);
  assert.equal(descriptor.polygon_handedness,"left");
  assert.equal(descriptor.status,"exact");
  assert.equal(descriptor.production_ready,false);
});
