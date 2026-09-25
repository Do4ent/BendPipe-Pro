import test from "node:test";
import assert from "node:assert/strict";

import { buildLegacyProjectPackageFromAssembly } from "../../src/import/dwfx/legacy-project-package.mjs";

function tube(part){
  return {
    id:"dwfx:"+part,
    name:part,
    partNumber:part,
    rows:[{type:"LINE",L:10}],
    toolingId:null,
    toolingUnresolved:true,
    importEvidence:{
      canonicalGeometry:{schema_version:"1.0.0",tube_id:part,primitives:[]},
      machineCompensationApplied:false
    },
    importValidation:{
      productionBlocked:true,
      coordinateMappingResolved:true,
      canonicalGeometryPreserved:true,
      legacyAxisPlaneDefaultsApplied:false,
      toolingResolved:false,
      productionSettingsConfirmed:false
    }
  };
}

function assembly(){
  return {
    status:"assembly_candidate",
    editable_ready:true,
    production_ready:false,
    tubes:[tube("10160780"),tube("10157546")]
  };
}

test("A20: complete assembly becomes TubeBenderProject schema 2.0 package",()=>{
  const result=buildLegacyProjectPackageFromAssembly({
    assembly:assembly(),
    project_id:"p1",
    project_name:"80003043",
    bbox:{x:800,y:600,z:400}
  });

  assert.equal(result.status,"project_package_candidate");
  assert.equal(result.production_ready,false);
  assert.equal(result.bbox_status,"exact_explicit");
  assert.equal(result.package.type,"TubeBenderProject");
  assert.equal(result.package.version,"VC207R7-M1");
  assert.equal(result.package.appVersion,"VC207R7-M1");
  assert.equal(result.package.schemaVersion,"2.0");
  assert.equal(result.package.project.id,"p1");
  assert.equal(result.package.project.name,"80003043");
  assert.deepEqual(result.package.project.bbox,{x:800,y:600,z:400});
  assert.equal(result.package.project.tubes.length,2);
});

test("A20: missing corpus dimensions remain absent instead of inventing default bbox",()=>{
  const result=buildLegacyProjectPackageFromAssembly({
    assembly:assembly(),
    project_name:"No corpus dimensions"
  });

  assert.equal(result.status,"project_package_candidate");
  assert.equal(result.bbox_status,"unresolved");
  assert.equal("bbox" in result.package.project,false);
  assert.match(result.blocker,/must not synthesize a bbox/i);
});

test("A20: project package does not inject tooling database or resolve tube tooling",()=>{
  const result=buildLegacyProjectPackageFromAssembly({
    assembly:assembly(),
    bbox:{x:100,y:100,z:100}
  });

  assert.equal("pipeDb" in result.package,false);
  for(const t of result.package.project.tubes){
    assert.equal(t.toolingUnresolved,true);
    assert.equal(t.toolingId,null);
    assert.equal(t.importValidation.productionBlocked,true);
    assert.equal(t.importValidation.toolingResolved,false);
    assert.equal(t.importEvidence.machineCompensationApplied,false);
  }
});

test("A20: partial assembly cannot masquerade as complete project package",()=>{
  const partial={...assembly(),status:"partial",editable_ready:false};
  const result=buildLegacyProjectPackageFromAssembly({assembly:partial});
  assert.equal(result.status,"blocked");
  assert.equal(result.package,null);
  assert.match(result.blocker,/complete editable assembly/i);
});

test("A20: invalid explicit bbox fails loudly instead of being repaired",()=>{
  assert.throws(
    ()=>buildLegacyProjectPackageFromAssembly({
      assembly:assembly(),
      bbox:{x:100,y:0,z:100}
    }),
    /bbox\.y/
  );
});

test("A20: returned project package is deeply frozen",()=>{
  const result=buildLegacyProjectPackageFromAssembly({
    assembly:assembly(),
    bbox:{x:100,y:100,z:100}
  });

  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(result.package),true);
  assert.equal(Object.isFrozen(result.package.project),true);
  assert.equal(Object.isFrozen(result.package.project.tubes),true);
  assert.equal(Object.isFrozen(result.package.project.tubes[0]),true);
});
