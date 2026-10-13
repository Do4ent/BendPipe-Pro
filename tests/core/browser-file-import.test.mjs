import test from "node:test";
import assert from "node:assert/strict";

import { importSelectedDwfxFile } from "../../src/import/dwfx/browser-file-import.mjs";

function file(name,bytes=[1,2,3]){
  return {
    name,
    async arrayBuffer(){
      return Uint8Array.from(bytes).buffer;
    }
  };
}

test("A20: browser controller passes selected DWFx bytes to trusted file facade",async()=>{
  let captured=null;
  const result=await importSelectedDwfxFile(
    file("80003043(A).dwfx"),
    {
      project_id:"p1",
      prepareImport:async(input)=>{
        captured=input;
        return {
          status:"dwfx_project_candidate",
          editable_ready:true,
          production_ready:false,
          package:{type:"TubeBenderProject"}
        };
      }
    }
  );

  assert.equal(result.status,"dwfx_project_candidate");
  assert.equal(captured.dwfx_file,"80003043(A).dwfx");
  assert.equal(captured.project_id,"p1");
  assert.equal(captured.project_name,"80003043(A)");
  assert.deepEqual([...captured.bytes],[1,2,3]);
});

test("A20: browser controller rejects non-DWFx files before binary intake",async()=>{
  let called=false;
  const result=await importSelectedDwfxFile(file("project.json"),{
    prepareImport:async()=>{called=true;return {};}
  });

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"file_type");
  assert.equal(result.package,null);
  assert.equal(called,false);
});

test("A20: empty DWFx file remains explicit blocker",async()=>{
  let called=false;
  const result=await importSelectedDwfxFile(file("empty.dwfx",[]),{
    prepareImport:async()=>{called=true;return {};}
  });

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"file_read");
  assert.equal(called,false);
});

test("A20: explicit project name and bbox are forwarded unchanged",async()=>{
  let captured=null;
  await importSelectedDwfxFile(file("a.dwfx"),{
    project_name:"Custom",
    bbox:{x:1,y:2,z:3},
    prepareImport:async(input)=>{
      captured=input;
      return {status:"blocked",stage:"fixture"};
    }
  });

  assert.equal(captured.project_name,"Custom");
  assert.deepEqual(captured.bbox,{x:1,y:2,z:3});
});


test("A20: recognized DWFx without explicit bbox returns requirements_pending instead of inheriting workspace frame",async()=>{
  const result=await importSelectedDwfxFile(
    file("recognized.dwfx"),
    {
      prepareImport:async()=>({
        status:"dwfx_project_candidate",
        editable_ready:true,
        production_ready:false,
        project_import:{
          project_package:{bbox_status:"unresolved"}
        },
        package:{
          type:"TubeBenderProject",
          project:{tubes:[{partNumber:"10157546"}]}
        }
      })
    }
  );

  assert.equal(result.status,"requirements_pending");
  assert.equal(result.stage,"project_bbox");
  assert.equal(result.editable_ready,false);
  assert.equal(result.package,null);
  assert.equal(result.requirement.kind,"bbox");
  assert.deepEqual(result.requirement.axes,["x","y","z"]);
  assert.match(result.blocker,/must be entered explicitly/i);
});

test("A20: explicit bbox allows recognized DWFx project candidate through browser controller",async()=>{
  let captured=null;
  const result=await importSelectedDwfxFile(
    file("recognized.dwfx"),
    {
      bbox:{x:1000,y:500,z:300},
      prepareImport:async(input)=>{
        captured=input;
        return {
          status:"dwfx_project_candidate",
          editable_ready:true,
          production_ready:false,
          project_import:{
            project_package:{bbox_status:"exact_explicit"}
          },
          package:{
            type:"TubeBenderProject",
            project:{bbox:input.bbox,tubes:[]}
          }
        };
      }
    }
  );

  assert.equal(result.status,"dwfx_project_candidate");
  assert.deepEqual(captured.bbox,{x:1000,y:500,z:300});
  assert.deepEqual(result.package.project.bbox,{x:1000,y:500,z:300});
});
