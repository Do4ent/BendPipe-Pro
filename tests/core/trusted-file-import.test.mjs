import test from "node:test";
import assert from "node:assert/strict";

import { prepareTrustedDwfxFileImport } from "../../src/import/dwfx/trusted-file-import.mjs";

function successDeps(overrides={}){
  return {
    intakeRaw:async()=>({
      status:"exact",
      stage:"raw_evidence",
      model:{
        descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:10,polygon_handedness:"left"}},
        w3d:{bytes:new Uint8Array([1,2,3])}
      },
      metadata:{
        source:{format:"DWFx",file:"sample.dwfx"},
        tubes:[{part_number:"10157546"}]
      },
      graphics_links:[{
        part_number:"10157546",
        status:"exact",
        graphics_node:121190,
        geometric_variation:121191
      }]
    }),
    resolveHsfLinkage:async()=>({
      status:"exact",
      hsf_version:"14.50",
      opcode_stream:new Uint8Array([0x7a]),
      parts:[{
        part_number:"10157546",
        variation_segment:"121191",
        variation_segment_offset:100,
        variation_include:"?Include Library/46910",
        variation_include_offset:200
      }]
    }),
    prepareProject:async()=>({
      status:"project_import_candidate",
      editable_ready:true,
      production_ready:false,
      package:{
        type:"TubeBenderProject",
        schemaVersion:"2.0",
        project:{id:"p",name:"P",tubes:[{partNumber:"10157546"}]}
      }
    }),
    ...overrides
  };
}

function args(overrides={}){
  return {
    bytes:new Uint8Array([1,2,3]),
    dwfx_file:"sample.dwfx",
    project_id:"p",
    ...successDeps(overrides)
  };
}

test("A20: raw-file facade returns editable TubeBenderProject candidate only after all gates pass",async()=>{
  const result=await prepareTrustedDwfxFileImport(args());

  assert.equal(result.status,"dwfx_project_candidate");
  assert.equal(result.stage,"complete");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.source_file,"sample.dwfx");
  assert.equal(result.package.type,"TubeBenderProject");
  assert.equal(result.package.schemaVersion,"2.0");
  assert.match(result.blocker,/Manufacturing remains blocked/i);
});

test("A20: raw evidence blocker stops HSF and project stages",async()=>{
  let hsfCalled=false,projectCalled=false;
  const result=await prepareTrustedDwfxFileImport(args({
    intakeRaw:async()=>({
      status:"blocked",
      stage:"graphics_linkage",
      blocker:"graphics unresolved"
    }),
    resolveHsfLinkage:async()=>{hsfCalled=true;return {};},
    prepareProject:async()=>{projectCalled=true;return {};}
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"graphics_linkage");
  assert.equal(result.hsf_linkage,null);
  assert.equal(result.project_import,null);
  assert.equal(hsfCalled,false);
  assert.equal(projectCalled,false);
});

test("A20: HSF linkage blocker stops project creation",async()=>{
  let projectCalled=false;
  const result=await prepareTrustedDwfxFileImport(args({
    resolveHsfLinkage:async()=>({
      status:"partial",
      blocker:"variation include ambiguous"
    }),
    prepareProject:async()=>{projectCalled=true;return {};}
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"hsf_linkage");
  assert.equal(result.package,null);
  assert.equal(projectCalled,false);
});

test("A20: project-import blocker remains explicit and returns no package",async()=>{
  const result=await prepareTrustedDwfxFileImport(args({
    prepareProject:async()=>({
      status:"blocked",
      stage:"assembly",
      editable_ready:false,
      blocker:"one tube failed geometry mapping"
    })
  }));

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"project_import");
  assert.equal(result.package,null);
  assert.match(result.blocker,/one tube failed geometry mapping/i);
});

test("A20: file facade passes raw descriptor/metadata/linkage into project pipeline",async()=>{
  let captured=null;
  const result=await prepareTrustedDwfxFileImport(args({
    prepareProject:async(input)=>{
      captured=input;
      return {
        status:"project_import_candidate",
        editable_ready:true,
        production_ready:false,
        package:{type:"TubeBenderProject",schemaVersion:"2.0",project:{tubes:[]}}
      };
    }
  }));

  assert.equal(result.status,"dwfx_project_candidate");
  assert.equal(captured.descriptor.status,"exact");
  assert.equal(captured.hsf_version,"14.50");
  assert.equal(captured.metadata_recognition.tubes[0].part_number,"10157546");
  assert.equal(captured.include_linkage.parts[0].variation_segment,"121191");
  assert.equal(captured.include_linkage.parts[0].variation_include,"?Include Library/46910");
});

test("A20: missing source filename fails before any import work",async()=>{
  let called=false;
  await assert.rejects(
    ()=>prepareTrustedDwfxFileImport({
      bytes:new Uint8Array(),
      dwfx_file:"",
      intakeRaw:async()=>{called=true;return {};}
    }),
    /dwfx_file is required/
  );
  assert.equal(called,false);
});


test("A25: reference scene keeps heavy display runtime outside project JSON",async()=>{
  let captured=null;
  const runtime=Object.freeze({
    scene_id:"dwfx-reference:sample.dwfx",
    source_file:"sample.dwfx",
    readonly:true,
    scale_mm_per_source_unit:10,
    assets:Object.freeze([
      Object.freeze({id:"?Include Library/1",status:"exact",kind:"mesh",meshes:Object.freeze([])})
    ])
  });
  const metadata=Object.freeze({
    id:"dwfx-reference:sample.dwfx",
    runtime_scene_id:"dwfx-reference:sample.dwfx",
    source_file:"sample.dwfx",
    readonly:true,
    tree:Object.freeze([]),
    asset_manifest:Object.freeze([])
  });

  const result=await prepareTrustedDwfxFileImport(args({
    intakeRaw:async()=>({
      status:"exact",
      stage:"raw_evidence",
      model:{
        descriptor:{status:"exact",w3d:{scale_mm_per_source_unit:10,polygon_handedness:"left"}},
        w3d:{bytes:new Uint8Array([1,2,3])}
      },
      linkage:{
        resources:{content:{xml:"<Content/>"}},
        link_index:{links:[]}
      },
      metadata:{
        source:{format:"DWFx",file:"sample.dwfx"},
        tubes:[{part_number:"10157546"}]
      },
      graphics_links:[{
        part_number:"10157546",
        status:"exact",
        graphics_node:121190,
        geometric_variation:121191
      }]
    }),
    buildReferenceScene:()=>({
      status:"exact_reference_scene",
      metadata,
      runtime,
      diagnostics:[],
      production_ready:false,
      canonical_ready:false
    }),
    prepareProject:async(input)=>{
      captured=input;
      return {
        status:"project_import_candidate",
        editable_ready:true,
        production_ready:false,
        package:{type:"TubeBenderProject",schemaVersion:"2.0",project:{tubes:[]}}
      };
    }
  }));

  assert.equal(result.status,"dwfx_project_candidate");
  assert.equal(captured.reference_scene.readonly,true);
  assert.equal(captured.reference_scene.display_runtime,undefined);
  assert.equal(result.reference_scene_runtime,runtime);
});
