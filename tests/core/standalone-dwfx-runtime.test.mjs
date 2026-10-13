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

function extractedPoLoadFile(html){
  const start=html.indexOf("async function poLoadFile(file){");
  const end=html.indexOf("\nfunction poSummaryItems(",start);
  assert.ok(start>=0,"poLoadFile missing from standalone");
  assert.ok(end>start,"poLoadFile boundary missing from standalone");
  return html.slice(start,end);
}

function contextFor({bridge,prompts=[]}={}){
  const promptQueue=[...prompts];
  const calls={
    busy:[],
    toast:[],
    normalize:[],
    reset:[],
    render:0,
    rawText:[]
  };
  const context={
    PO:{analysisToken:0,source:null,current:null,currentRecord:null},
    window:{
      TubeBenderDwfxImport:bridge??null,
      prompt:()=>promptQueue.length?promptQueue.shift():null
    },
    poUpdateSourceUi(){},
    poSetBusy(...args){calls.busy.push(args);},
    ptToast(msg){calls.toast.push(msg);},
    clone(value){return structuredClone(value);},
    pipeDb:[],
    poNormalizePackage(pkg,meta){
      calls.normalize.push({pkg,meta});
      return {meta,projects:pkg?.project?[pkg.project]:[],status:"ready"};
    },
    poResetSelection(pkg){calls.reset.push(pkg);},
    poRenderPackage(){calls.render+=1;},
    async poLoadRawText(raw,meta){calls.rawText.push({raw,meta});},
    console,
    Date,
    String,
    Number,
    Object,
    Array,
    RegExp,
    structuredClone
  };
  return {context,calls};
}

function compilePoLoadFile(context){
  const html=ensureBuild();
  const source=extractedPoLoadFile(html);
  return vm.runInNewContext(source+"\npoLoadFile",context,{
    filename:"standalone-poLoadFile-runtime.js"
  });
}

test("A20: generated poLoadFile requests explicit bbox then opens recognized DWFx through poNormalizePackage",async()=>{
  const bridgeCalls=[];
  const bridge={
    async importSelectedDwfxFile(file,options={}){
      bridgeCalls.push({file,options});
      if(bridgeCalls.length===1){
        return {
          status:"requirements_pending",
          requirement:{kind:"bbox"},
          blocker:"bbox required"
        };
      }
      return {
        status:"dwfx_project_candidate",
        stage:"complete",
        source_file:file.name,
        production_ready:false,
        package:{
          type:"TubeBenderProject",
          schemaVersion:"2.0",
          project:{
            id:"p",
            name:"Imported",
            bbox:options.bbox,
            tubes:[{id:"t1",rows:[{type:"LINE",L:100}]}]
          }
        }
      };
    }
  };
  const {context,calls}=contextFor({
    bridge,
    prompts:["1000","500","300"]
  });
  const poLoadFile=compilePoLoadFile(context);
  const file={
    name:"sample.dwfx",
    size:123,
    lastModified:456,
    async text(){throw new Error("DWFx path must not call file.text()");}
  };

  await poLoadFile(file);

  assert.equal(bridgeCalls.length,2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(bridgeCalls[1].options.bbox)),
    {x:1000,y:500,z:300}
  );
  assert.equal(calls.normalize.length,1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(calls.normalize[0].pkg.project.bbox)),
    {x:1000,y:500,z:300}
  );
  assert.equal(context.PO.current.rawDwfxImport.status,"dwfx_project_candidate");
  assert.equal(context.PO.current.rawDwfxImport.production_ready,false);
  assert.equal(typeof context.PO.current.rawText,"string");
  const stored=JSON.parse(context.PO.current.rawText);
  assert.equal(stored.type,"TubeBenderProject");
  assert.equal(stored.dwfxImport.status,"dwfx_project_candidate");
  assert.equal(stored.dwfxImport.production_ready,false);
  assert.equal("bytes" in stored,false);
  assert.equal(calls.render,1);
});

test("A20: cancelling explicit bbox keeps DWFx blocked and never normalizes a project",async()=>{
  const bridge={
    async importSelectedDwfxFile(){
      return {
        status:"requirements_pending",
        stage:"project_bbox",
        requirement:{kind:"bbox"},
        blocker:"bbox required"
      };
    }
  };
  const {context,calls}=contextFor({bridge,prompts:[null]});
  const poLoadFile=compilePoLoadFile(context);

  await poLoadFile({
    name:"sample.dwfx",
    size:10,
    lastModified:1,
    async text(){throw new Error("unexpected text read");}
  });

  assert.equal(calls.normalize.length,0);
  assert.equal(context.PO.current.status,"error");
  assert.deepEqual(Array.from(context.PO.current.errors),["bbox required"]);
  assert.equal(context.PO.current.rawDwfxImport.status,"requirements_pending");
  assert.equal(calls.render,1);
});

test("A20: invalid bbox input does not retry DWFx import with a fabricated value",async()=>{
  let callsToBridge=0;
  const bridge={
    async importSelectedDwfxFile(){
      callsToBridge+=1;
      return {
        status:"requirements_pending",
        requirement:{kind:"bbox"},
        blocker:"bbox required"
      };
    }
  };
  const {context,calls}=contextFor({bridge,prompts:["0"]});
  const poLoadFile=compilePoLoadFile(context);

  await poLoadFile({
    name:"sample.dwfx",
    size:10,
    lastModified:1,
    async text(){throw new Error("unexpected text read");}
  });

  assert.equal(callsToBridge,1);
  assert.equal(calls.normalize.length,0);
  assert.ok(calls.toast.some((msg)=>/положительным числом/i.test(msg)));
});

test("A20: generated poLoadFile preserves JSON project-open path unchanged",async()=>{
  let bridgeCalled=false;
  const {context,calls}=contextFor({
    bridge:{
      async importSelectedDwfxFile(){
        bridgeCalled=true;
        return {};
      }
    }
  });
  const poLoadFile=compilePoLoadFile(context);
  const file={
    name:"project.json",
    size:42,
    lastModified:99,
    async text(){return '{"type":"TubeBenderProject"}';}
  };

  await poLoadFile(file);

  assert.equal(bridgeCalled,false);
  assert.equal(calls.rawText.length,1);
  assert.equal(calls.rawText[0].raw,'{"type":"TubeBenderProject"}');
  assert.equal(calls.rawText[0].meta.name,"project.json");
});

test("A20: hard DWFx blocker is displayed as inspection error without poNormalizePackage",async()=>{
  const {context,calls}=contextFor({
    bridge:{
      async importSelectedDwfxFile(){
        return {
          status:"blocked",
          stage:"hsf_linkage",
          blocker:"Exact Include Library linkage failed"
        };
      }
    }
  });
  const poLoadFile=compilePoLoadFile(context);

  await poLoadFile({
    name:"broken.dwfx",
    size:9,
    lastModified:2,
    async text(){throw new Error("unexpected text read");}
  });

  assert.equal(calls.normalize.length,0);
  assert.equal(context.PO.current.status,"error");
  assert.deepEqual(
    Array.from(context.PO.current.errors),
    ["Exact Include Library linkage failed"]
  );
  assert.equal(context.PO.current.rawDwfxImport.stage,"hsf_linkage");
});


test("A20: DWFx recent-project payload is compact JSON and can be reparsed without original binary file",async()=>{
  const bridge={
    async importSelectedDwfxFile(file){
      return {
        status:"dwfx_project_candidate",
        stage:"complete",
        source_file:file.name,
        production_ready:false,
        project_import:{project_package:{bbox_status:"exact_explicit"}},
        package:{
          type:"TubeBenderProject",
          schemaVersion:"2.0",
          project:{
            id:"p",
            name:"Imported",
            bbox:{x:100,y:100,z:100},
            tubes:[{id:"t1",rows:[{type:"LINE",L:10}]}]
          }
        }
      };
    }
  };
  const {context}=contextFor({bridge});
  const poLoadFile=compilePoLoadFile(context);

  await poLoadFile({
    name:"source.dwfx",
    size:8_520_087,
    lastModified:123,
    async text(){throw new Error("binary source must not be serialized through file.text()");}
  });

  const storedText=context.PO.current.rawText;
  assert.ok(storedText.length<10000);
  const reparsed=JSON.parse(storedText);
  assert.equal(reparsed.type,"TubeBenderProject");
  assert.equal(reparsed.dwfxImport.source_file,"source.dwfx");
  assert.deepEqual(reparsed.project.bbox,{x:100,y:100,z:100});
});
