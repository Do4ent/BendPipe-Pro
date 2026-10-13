import test from "node:test";
import assert from "node:assert/strict";

import {
  inspectPartHsfGeometryEvidence,
  summarizeDecodedSegment
} from "../../src/import/dwfx/part-geometry-evidence.mjs";

function open(name){ return [0x28,name.length,...Buffer.from(name)]; }
function close(){ return [0x29]; }
function tag(){ return [0x71]; }
function user(value){
  const b=Buffer.from(value);
  return [0x55,b.length&255,(b.length>>>8)&255,...b];
}
function include(name){ return [0x3c,name.length,...Buffer.from(name)]; }

test("A20: node and geometric-variation scene evidence remain independent",()=>{
  const bytes=Uint8Array.from([
    ...open("121190"),...tag(),...user("node"),
    ...include("?Include Library/46838"),...close(),
    ...open("121191"),...tag(),...user("node"),
      ...open("child"),...include("?Include Library/46910"),...close(),
    ...close()
  ]);

  const partAnchor={
    part_number:"10157546",
    graphics_node_segment:{id:121190,status:"exact"},
    geometric_variation_segment:{id:121191,status:"exact"}
  };
  const result=inspectPartHsfGeometryEvidence(bytes,partAnchor,{hsfVersion:"14.50"});

  assert.equal(result.part_number,"10157546");
  assert.equal(result.geometry_source_selected,null);
  assert.equal(result.production_ready,false);

  assert.equal(result.graphics_node.summary.root_segment_complete,true);
  assert.deepEqual(
    result.graphics_node.summary.includes.map((x)=>x.name),
    ["?Include Library/46838"]
  );
  assert.equal(result.geometric_variation.summary.root_segment_complete,true);
  assert.deepEqual(
    result.geometric_variation.summary.includes.map((x)=>x.name),
    ["?Include Library/46910"]
  );
});

test("A20: absent exact anchor is not decoded through a guessed fallback",()=>{
  const bytes=Uint8Array.from([
    ...open("121199"),...tag(),...user("node"),...close()
  ]);
  const result=inspectPartHsfGeometryEvidence(bytes,{
    part_number:"10157683",
    graphics_node_segment:{id:121198,status:"unresolved"},
    geometric_variation_segment:{id:121199,status:"exact"}
  },{hsfVersion:"14.50"});

  assert.equal(result.graphics_node.status,"unresolved");
  assert.equal(result.graphics_node.decoded,null);
  assert.equal(result.geometric_variation.summary.root_segment_complete,true);
  assert.equal(result.geometry_source_selected,null);
});

test("A20: summary preserves unsupported decode frontier",()=>{
  const summary=summarizeDecodedSegment({
    status:"blocked",
    root_segment_complete:false,
    entities:[
      {kind:"transform",source_offset:4,absolute_source_offset:104},
      {kind:"curve_candidate",primitive:"line",source_offset:10,absolute_source_offset:110}
    ],
    unsupported_opcode:0x53,
    unsupported_variant:"fixture shell blocker"
  });

  assert.equal(summary.kind_counts.transform,1);
  assert.equal(summary.kind_counts.curve_candidate,1);
  assert.equal(summary.transforms[0].source_offset,104);
  assert.equal(summary.curves[0].primitive,"line");
  assert.equal(summary.unsupported_opcode,0x53);
  assert.match(summary.unsupported_variant,/shell blocker/);
  assert.equal(summary.production_ready,false);
});
