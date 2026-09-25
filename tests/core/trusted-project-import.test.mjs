import test from "node:test";
import assert from "node:assert/strict";

import { prepareTrustedDwfxProjectImport } from "../../src/import/dwfx/trusted-project-import.mjs";

function baseDeps(overrides={}){
  return {
    buildPlan:()=>({
      status:"exact",
      source_file:"sample.dwfx",
      hsf_version:"14.50",
      parts:[{part_number:"A"}],
      issues:[]
    }),
    hydrateVariations:()=>({
      status:"exact",
      parts:[{part_number:"A",decoded_variation_segment:{status:"exact"}}]
    }),
    prepareAssembly:()=>({
      status:"assembly_candidate",
      editable_ready:true,
      production_ready:false,
      tubes:[{id:"dwfx:A",partNumber:"A"}]
    }),
    buildProjectPackage:()=>({
      status:"project_package_candidate",
      production_ready:false,
      package:{
        type:"TubeBenderProject",
        schemaVersion:"2.0",
        project:{id:"p",name:"P",tubes:[{id:"dwfx:A"}]}
      }
    }),
    ...overrides
  };
}

function args(deps={}){
  return {
    opcode_stream:new Uint8Array(),
    metadata_recognition:{tubes:[]},
    include_linkage:{parts:[]},
    descriptor:{status:"exact"},
    project_id:"p",
    project_name:"Project",
    ...baseDeps(deps)
  };
}

test("A20: trusted project orchestrator returns one complete editable project candidate",()=>{
  const result=prepareTrustedDwfxProjectImport(args());

  assert.equal(result.status,"project_import_candidate");
  assert.equal(result.stage,"complete");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.package.type,"TubeBenderProject");
  assert.equal(result.package.schemaVersion,"2.0");
});

test("A20: plan blocker stops hydration and all later stages",()=>{
  let hydrateCalled=false;
  let assemblyCalled=false;
  let packageCalled=false;
  const result=prepareTrustedDwfxProjectImport(args({
    buildPlan:()=>({status:"blocked",issues:["missing exact linkage"]}),
    hydrateVariations:()=>{hydrateCalled=true;return {};},
    prepareAssembly:()=>{assemblyCalled=true;return {};},
    buildProjectPackage:()=>{packageCalled=true;return {};}
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"plan");
  assert.equal(result.editable_ready,false);
  assert.match(result.blocker,/missing exact linkage/);
  assert.equal(hydrateCalled,false);
  assert.equal(assemblyCalled,false);
  assert.equal(packageCalled,false);
});

test("A20: partial variation hydration cannot fall through to assembly guessing",()=>{
  let assemblyCalled=false;
  const result=prepareTrustedDwfxProjectImport(args({
    hydrateVariations:()=>({
      status:"partial",
      blocker:"one exact variation segment is blocked",
      parts:[]
    }),
    prepareAssembly:()=>{assemblyCalled=true;return {};}
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"variation_hydration");
  assert.equal(result.assembly,null);
  assert.equal(assemblyCalled,false);
});

test("A20: partial assembly cannot become a project package",()=>{
  let packageCalled=false;
  const result=prepareTrustedDwfxProjectImport(args({
    prepareAssembly:()=>({
      status:"partial",
      editable_ready:false,
      blocker:"one tube mapping failed"
    }),
    buildProjectPackage:()=>{packageCalled=true;return {};}
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"assembly");
  assert.equal(result.project_package,null);
  assert.equal(packageCalled,false);
});

test("A20: project package failure remains stage-specific",()=>{
  const result=prepareTrustedDwfxProjectImport(args({
    buildProjectPackage:()=>({
      status:"blocked",
      package:null,
      blocker:"invalid explicit bbox"
    })
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"project_package");
  assert.match(result.blocker,/invalid explicit bbox/);
  assert.equal(result.package,undefined);
});

test("A20: successful orchestrator still never claims production readiness",()=>{
  const result=prepareTrustedDwfxProjectImport(args());
  assert.equal(result.production_ready,false);
  assert.match(result.blocker,/production release remains blocked/i);
});
