import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveAutomaticFrameFromReferenceBounds,
  rebaseDwfxAssemblyToAutomaticFrame
} from "../../src/import/dwfx/automatic-frame-fit.mjs";

test("A42: automatic DWFx frame rounds exact retained geometry bounds outward to whole mm",()=>{
  const frame=deriveAutomaticFrameFromReferenceBounds({
    bounds_mm:{
      min:[-228.722992,-48.592343,-91.496798],
      max:[509.276981,1165.827818,701.999969],
      size:[737.999973,1214.420161,793.496767]
    }
  });

  assert.equal(frame.status,"exact");
  assert.deepEqual(frame.coordinate_offset,{x:-229,y:-49,z:-92});
  assert.deepEqual(frame.bbox,{x:739,y:1215,z:794});
  assert.deepEqual(frame.bbox_anchor,{x:0,y:0,z:0});
  assert.deepEqual(frame.frame_bounds_mm.min,[-229,-49,-92]);
  assert.deepEqual(frame.frame_bounds_mm.max,[510,1166,702]);
  assert.deepEqual(frame.frame_bounds_mm.size,[739,1215,794]);
  assert.equal(frame.rounding_rule,"floor_min_ceil_max_mm");
});

test("A42: project-frame rebase preserves physical imported tube position",()=>{
  const frame=deriveAutomaticFrameFromReferenceBounds({
    bounds_mm:{
      min:[-228.722992,-48.592343,-91.496798],
      max:[509.276981,1165.827818,701.999969]
    }
  });
  const assembly={
    status:"assembly_candidate",
    editable_ready:true,
    production_ready:false,
    tubes:[{
      id:"dwfx:10139798",
      partNumber:"10139798",
      origin:{x:86,y:757,z:525},
      rows:[{type:"LINE",L:120}],
      importEvidence:{
        spatialPlacement:{
          status:"exact",
          origin_mm:[85.627003249,756.823500174,525.189933777],
          editable_origin_mm:[86,757,525]
        }
      },
      importValidation:{productionBlocked:true}
    }]
  };

  const result=rebaseDwfxAssemblyToAutomaticFrame({assembly,frame});
  assert.equal(result.status,"rebased_assembly");
  const tube=result.assembly.tubes[0];
  assert.deepEqual(tube.origin,{x:315,y:806,z:617});
  assert.deepEqual(
    tube.importEvidence.spatialPlacement.editable_origin_mm,
    [315,806,617]
  );
  assert.deepEqual(
    tube.importEvidence.spatialPlacement.origin_mm,
    [85.627003249,756.823500174,525.189933777]
  );

  const world={
    x:tube.origin.x+frame.coordinate_offset.x,
    y:tube.origin.y+frame.coordinate_offset.y,
    z:tube.origin.z+frame.coordinate_offset.z
  };
  assert.deepEqual(world,{x:86,y:757,z:525});
  assert.equal(
    tube.importEvidence.spatialPlacement.project_frame_rebase.physical_world_position_preserved,
    true
  );
});
