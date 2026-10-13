import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

import { resolveRawHsfPartLinkage } from "../../src/import/dwfx/raw-hsf-linkage.mjs";

function ascii(s){return [...Buffer.from(s,"ascii")];}
function open(name){return [0x28,name.length,...ascii(name)];}
function close(){return [0x29];}
function include(name){return [0x3c,name.length,...ascii(name)];}

function makeW3d(opcodes){
  const header=[...ascii(";; HSF V14.50"),0x0a];
  const compressed=[...deflateSync(Buffer.from([...opcodes,0x7a]))];
  return Uint8Array.from([...header,0x5a,...compressed]);
}

test("A20: raw HSF linkage resolves exact variation segment to one Include Library",async()=>{
  const stream=[
    ...open("121191"),
      ...open(""),...include("?Include Library/46910"),...close(),
    ...close()
  ];
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:makeW3d(stream),
    source_file:"sample.dwfx",
    graphics_links:[{
      part_number:"10157546",
      status:"exact",
      graphics_node:121190,
      geometric_variation:121191
    }]
  });

  assert.equal(result.status,"exact");
  assert.equal(result.hsf_version,"14.50");
  assert.equal(result.linked_count,1);
  assert.equal(result.blocked_count,0);
  assert.equal(result.parts[0].part_number,"10157546");
  assert.equal(result.parts[0].variation_segment,"121191");
  assert.equal(result.parts[0].variation_include,"?Include Library/46910");
  assert.equal(result.parts[0].decoded_variation_segment.status,"exact");
});

test("A20: missing variation segment remains blocked instead of nearest-ID matching",async()=>{
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:makeW3d([...open("999"),...close()]),
    source_file:"sample.dwfx",
    graphics_links:[{
      part_number:"10157546",
      status:"exact",
      graphics_node:121190,
      geometric_variation:121191
    }]
  });

  assert.equal(result.status,"partial");
  assert.equal(result.linked_count,0);
  assert.equal(result.blocked_count,1);
  assert.equal(result.blocked_parts[0].stage,"geometry_anchor");
});

test("A20: variation with no Include Library remains explicit",async()=>{
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:makeW3d([...open("121191"),...close()]),
    source_file:"sample.dwfx",
    graphics_links:[{
      part_number:"10157546",
      status:"exact",
      graphics_node:121190,
      geometric_variation:121191
    }]
  });

  assert.equal(result.status,"partial");
  assert.equal(result.blocked_parts[0].stage,"include_library");
  assert.match(result.blocked_parts[0].blocker,/no exact Include Library/i);
});

test("A20: multiple Include Library references remain ambiguous",async()=>{
  const stream=[
    ...open("121191"),
      ...include("?Include Library/1"),
      ...include("?Include Library/2"),
    ...close()
  ];
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:makeW3d(stream),
    source_file:"sample.dwfx",
    graphics_links:[{
      part_number:"10157546",
      status:"exact",
      graphics_node:121190,
      geometric_variation:121191
    }]
  });

  assert.equal(result.status,"partial");
  assert.equal(result.blocked_parts[0].stage,"include_library");
  assert.match(result.blocked_parts[0].blocker,/multiple Include Library/i);
});

test("A20: unresolved graphics linkage blocks HSF resolution before W3D decode",async()=>{
  let decoded=false;
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:new Uint8Array(),
    source_file:"sample.dwfx",
    graphics_links:[{
      part_number:"10157546",
      status:"unresolved",
      graphics_node:null,
      geometric_variation:null
    }],
    decodeEnvelope:async()=>{decoded=true;return null;}
  });

  assert.equal(result.status,"blocked");
  assert.equal(result.blocked_parts[0].stage,"graphics_linkage");
  assert.equal(decoded,false);
});


test("DWFx: absent geometricVariation falls back only to the exact graphics-node segment",async()=>{
  const stream=[
    ...open("119736"),
      ...open(""),...include("?Include Library/50001"),...close(),
    ...close()
  ];
  const result=await resolveRawHsfPartLinkage({
    w3d_bytes:makeW3d(stream),
    source_file:"80004806.dwfx",
    graphics_links:[{
      part_number:"10102202",
      status:"exact",
      graphics_node:119735,
      geometric_variation:null
    }]
  });

  assert.equal(result.status,"exact");
  assert.equal(result.parts[0].geometric_variation,null);
  assert.equal(result.parts[0].geometry_anchor_kind,"graphics_node_successor_no_variation");
  assert.equal(result.parts[0].variation_segment,"119736");
  assert.equal(result.parts[0].variation_include,"?Include Library/50001");
});
