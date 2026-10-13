import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const output=path.join(root,"dist","TubeBender_CAD_VC207R7_M1_Standalone.html");

function ensureBuild(){
  execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  return fs.readFileSync(output,"utf8");
}

function originHelpers(activeRef){
  const html=ensureBuild();
  const start=html.indexOf("function importedSpatialOriginFromEvidence(");
  const end=html.indexOf("\nfunction validToolDiameterIndex(",start);
  assert.ok(start>=0,"importedSpatialOriginFromEvidence missing");
  assert.ok(end>start,"origin helper boundary missing");
  const source=html.slice(start,end);
  const context={
    clone:(value)=>value==null?value:JSON.parse(JSON.stringify(value)),
    activeTube:()=>activeRef.current,
    Number,Array,Object,Math
  };
  return vm.runInNewContext(
    source+"\n({importedSpatialOriginFromEvidence,restoreImportedSpatialOrigin,markImportedOriginOverride})",
    context,
    {filename:"standalone-imported-origin-runtime.js"}
  );
}

function importedTube(){
  return {
    origin:{x:0,y:0,z:0},
    importEvidence:{
      source:{format:"DWFx"},
      spatialPlacement:{
        status:"exact",
        origin_mm:[85.62700272800446,692.823486328125,244.6039581360275],
        start_vector:[0,1,0],
        placement_source:"dwfx_reference_scene_exact_instance",
        machine_compensation_applied:false
      }
    },
    importValidation:{
      productionBlocked:true,
      spatialPlacementResolved:true
    }
  };
}

test("A35: stale zero imported origin is restored from exact spatial evidence",()=>{
  const ref={current:null};
  const api=originHelpers(ref);
  const tube=importedTube();
  ref.current=tube;

  assert.equal(api.restoreImportedSpatialOrigin(tube),true);
  assert.deepEqual(
    JSON.parse(JSON.stringify(tube.origin)),
    {
      x:85.62700272800446,
      y:692.823486328125,
      z:244.6039581360275
    }
  );
  assert.equal(tube.importEvidence.spatialPlacement.editable_origin_seeded,true);
  assert.equal(tube.importEvidence.spatialPlacement.user_origin_override,false);
});

test("A35: manual imported-origin edit disables automatic source-origin restore",()=>{
  const ref={current:null};
  const api=originHelpers(ref);
  const tube=importedTube();
  ref.current=tube;

  api.restoreImportedSpatialOrigin(tube);
  assert.equal(api.markImportedOriginOverride(tube),true);
  tube.origin={x:10,y:20,z:30};

  assert.equal(api.restoreImportedSpatialOrigin(tube),false);
  assert.deepEqual(JSON.parse(JSON.stringify(tube.origin)),{x:10,y:20,z:30});
  assert.equal(tube.importEvidence.spatialPlacement.user_origin_override,true);
});

test("A35: malformed or non-exact spatial evidence is never guessed",()=>{
  const ref={current:null};
  const api=originHelpers(ref);
  const tube=importedTube();
  tube.importEvidence.spatialPlacement.status="partial";
  ref.current=tube;

  assert.equal(api.restoreImportedSpatialOrigin(tube),false);
  assert.deepEqual(JSON.parse(JSON.stringify(tube.origin)),{x:0,y:0,z:0});
});
