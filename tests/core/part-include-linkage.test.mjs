import test from "node:test";
import assert from "node:assert/strict";

import { resolvePartIncludeLibraryAnchors } from "../../src/import/dwfx/part-include-linkage.mjs";

function open(name){ return [0x28,name.length,...Buffer.from(name)]; }
function close(){ return [0x29]; }
function include(name){ return [0x3c,name.length,...Buffer.from(name)]; }

test("A20: node and variation include chains remain independent",()=>{
  const nodeLib="?Include Library/46838";
  const varLib="?Include Library/46910";
  const bytes=Uint8Array.from([
    ...open("121190"),...include(nodeLib),...close(),
    ...open("121191"),
      ...open(""),...include(varLib),...close(),
    ...close(),
    ...open(nodeLib),...close(),
    ...open(varLib),...close()
  ]);
  const result=resolvePartIncludeLibraryAnchors(bytes,{
    part_number:"10157546",
    graphics_node_segment:{id:121190,status:"exact"},
    geometric_variation_segment:{id:121191,status:"exact"}
  },{hsfVersion:"14.50"});

  assert.equal(result.graphics_node.status,"exact");
  assert.equal(result.graphics_node.include_count,1);
  assert.equal(result.graphics_node.includes[0].name,nodeLib);
  assert.equal(result.graphics_node.includes[0].status,"exact");

  assert.equal(result.geometric_variation.status,"exact");
  assert.equal(result.geometric_variation.include_count,1);
  assert.equal(result.geometric_variation.includes[0].name,varLib);
  assert.equal(result.geometric_variation.includes[0].status,"exact");

  assert.equal(result.geometry_chain_selected,null);
  assert.equal(result.production_ready,false);
});

test("A20: missing graphics-node segment does not fall back to variation implicitly",()=>{
  const varLib="?Include Library/47033";
  const bytes=Uint8Array.from([
    ...open("121199"),...include(varLib),...close(),
    ...open(varLib),...close()
  ]);
  const result=resolvePartIncludeLibraryAnchors(bytes,{
    part_number:"10157683",
    graphics_node_segment:{id:121198,status:"unresolved"},
    geometric_variation_segment:{id:121199,status:"exact"}
  },{hsfVersion:"14.50"});

  assert.equal(result.graphics_node.status,"unresolved");
  assert.equal(result.graphics_node.include_count,0);
  assert.equal(result.geometric_variation.status,"exact");
  assert.equal(result.geometric_variation.includes[0].name,varLib);
  assert.equal(result.geometry_chain_selected,null);
});

test("A20: include-library ambiguity remains explicit",()=>{
  const lib="?Include Library/1";
  const bytes=Uint8Array.from([
    ...open("7"),...include(lib),...close(),
    ...open(lib),...close(),
    ...open(lib),...close()
  ]);
  const result=resolvePartIncludeLibraryAnchors(bytes,{
    part_number:"p",
    graphics_node_segment:{id:7,status:"exact"},
    geometric_variation_segment:{id:null,status:"not_applicable"}
  });

  assert.equal(result.graphics_node.status,"ambiguous");
  assert.equal(result.graphics_node.includes[0].match_count,2);
});
