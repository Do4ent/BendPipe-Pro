import test from "node:test";
import assert from "node:assert/strict";

import {
  inspectIncludeLibrarySegment,
  comparePartIncludeLibraryEvidence
} from "../../src/import/dwfx/include-library-evidence.mjs";

function open(name){ return [0x28,name.length,...Buffer.from(name)]; }
function close(){ return [0x29]; }
function include(name){ return [0x3c,name.length,...Buffer.from(name)]; }
function line(a,b){
  const f=(v)=>{const x=Buffer.allocUnsafe(4);x.writeFloatLE(v);return [...x];};
  return [0x47,...f(...[])];
}

test("A20: exact Include Library segment is decoded and summarized",()=>{
  const lib="?Include Library/34001";
  const bytes=Uint8Array.from([
    ...open(lib),
      ...open("child"),
        ...include("?Include Library/nested"),
      ...close(),
    ...close(),
    ...open("?Include Library/nested"),...close()
  ]);
  const result=inspectIncludeLibrarySegment(bytes,lib,{hsfVersion:"14.50"});

  assert.equal(result.status,"exact");
  assert.equal(result.root_segment_complete,true);
  assert.equal(result.summary.kind_counts.segment>=3,true);
  assert.deepEqual(
    result.summary.includes.map((x)=>x.name),
    ["?Include Library/nested"]
  );
  assert.equal(result.production_ready,false);
});

test("A20: node and variation include libraries remain comparable but unselected",()=>{
  const nodeLib="?Include Library/46838";
  const varLib="?Include Library/46910";
  const bytes=Uint8Array.from([
    ...open(nodeLib),...close(),
    ...open(varLib),...close()
  ]);
  const result=comparePartIncludeLibraryEvidence(bytes,{
    part_number:"10157546",
    graphics_node:{
      status:"exact",
      includes:[{name:nodeLib,status:"exact"}]
    },
    geometric_variation:{
      status:"exact",
      includes:[{name:varLib,status:"exact"}]
    }
  },{hsfVersion:"14.50"});

  assert.equal(result.graphics_node.libraries[0].evidence.status,"exact");
  assert.equal(result.geometric_variation.libraries[0].evidence.status,"exact");
  assert.equal(result.preferred_chain,null);
  assert.equal(result.production_ready,false);
});

test("A20: unresolved library anchor is not decoded by nearest-name guessing",()=>{
  const result=comparePartIncludeLibraryEvidence(new Uint8Array(),{
    part_number:"p",
    graphics_node:{
      status:"unresolved",
      includes:[{name:"?Include Library/1",status:"unresolved"}]
    },
    geometric_variation:{status:"not_applicable",includes:[]}
  });

  assert.equal(result.graphics_node.libraries[0].status,"unresolved");
  assert.equal(result.graphics_node.libraries[0].evidence,null);
});
