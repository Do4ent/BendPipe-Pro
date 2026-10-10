import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  validateDevelopedLengthConsistency
} from "../../src/recognition/developed-length-consistency.mjs";

const golden=JSON.parse(readFileSync(
  new URL(
    "../reference_parts/cases/dwfx-80003043/recognized-primitives-golden.json",
    import.meta.url
  ),
  "utf8"
));

const EXPECTED={
  "10160780":{bend_count:2,clr:15},
  "10157546":{bend_count:6,clr:20},
  "10157555":{bend_count:3,clr:20},
  "10157683":{bend_count:6,clr:55},
  "10157549":{bend_count:3,clr:15},
  "10157552":{bend_count:4,clr:15}
};

test("A20: real 80003043 primitive golden covers all six linked tube parts",()=>{
  assert.deepEqual(
    Object.keys(golden.parts).sort(),
    Object.keys(EXPECTED).sort()
  );
  assert.equal(golden.production_ready,false);
  assert.equal(golden.truth_category,"derived");
});

test("A20: every real tube primitive sequence is continuous and alternates LINE/BEND",()=>{
  for(const [partNumber,part] of Object.entries(golden.parts)){
    const primitives=part.primitives;
    assert.ok(primitives.length>=3,partNumber);
    assert.equal(primitives[0].type,"LINE",partNumber);
    assert.equal(primitives.at(-1).type,"LINE",partNumber);

    for(let i=0;i<primitives.length;i+=1){
      const primitive=primitives[i];
      assert.equal(
        primitive.type,
        i%2===0?"LINE":"BEND",
        `${partNumber} primitive ${i}`
      );
      if(i>0){
        assert.equal(
          primitives[i-1].source_end_index,
          primitive.source_start_index,
          `${partNumber} source continuity at primitive ${i}`
        );
      }
    }
    assert.equal(
      primitives.at(-1).source_end_index,
      part.centerline_sample_count-1,
      `${partNumber} final source index`
    );
  }
});

test("A20: real recognized LINE/BEND lengths reconstruct Autodesk developed length within 0.1 mm",()=>{
  for(const [partNumber,part] of Object.entries(golden.parts)){
    const result=validateDevelopedLengthConsistency(
      part.primitives,
      part.developed_length_mm,
      {tolerance_mm:0.1}
    );
    assert.equal(result.status,"passed",partNumber);
    assert.ok(
      result.absolute_error_mm<0.05,
      `${partNumber} developed length error ${result.absolute_error_mm}`
    );
    assert.equal(result.production_ready,false);
  }
});

test("A20: real golden bend counts and CLR values match decoded tube families",()=>{
  for(const [partNumber,expected] of Object.entries(EXPECTED)){
    const bends=golden.parts[partNumber].primitives.filter(
      (primitive)=>primitive.type==="BEND"
    );
    assert.equal(bends.length,expected.bend_count,partNumber);
    bends.forEach((bend,index)=>{
      assert.ok(
        Math.abs(bend.clr_mm-expected.clr)<1e-9,
        `${partNumber} bend ${index+1} CLR`
      );
    });
  }
});

test("A20: sparse real bends remain explicitly tagged when two ring centers carry the bend",()=>{
  const sparse=golden.parts["10160780"].primitives.find(
    (primitive)=>primitive.evidence_mode==="two_point_ring_tangents"
  );
  assert.ok(sparse);
  assert.equal(sparse.type,"BEND");
  assert.ok(Math.abs(sparse.clr_mm-15)<1e-9);
  assert.ok(Math.abs(sparse.signed_sweep_deg-15.0712)<1e-4);
});
