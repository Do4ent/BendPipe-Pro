import test from "node:test";
import assert from "node:assert/strict";

import { buildPartHsfEvidenceReport } from "../../src/import/dwfx/part-hsf-evidence-report.mjs";

function open(name){ return [0x28,name.length,...Buffer.from(name)]; }
function close(){ return [0x29]; }
function include(name){ return [0x3c,name.length,...Buffer.from(name)]; }

test("A20: composed report joins exact part anchors without selecting geometry source",()=>{
  const bytes=Uint8Array.from([
    ...open("121190"),...include("?Include Library/46838"),...close(),
    ...open("121191"),...include("?Include Library/46910"),...close(),
    ...open("121199"),...include("?Include Library/47012"),...close()
  ]);

  const report=buildPartHsfEvidenceReport({
    opcodeStream:bytes,
    hsfVersion:"14.50",
    partGraphicsLinks:[
      {part_number:"10157546",graphics_node:121190,geometric_variation:121191},
      {part_number:"10157683",graphics_node:121198,geometric_variation:121199}
    ]
  });

  assert.equal(report.part_count,2);
  assert.equal(report.anchored_count,2);
  assert.equal(report.unresolved_count,0);
  assert.equal(report.geometry_source_selection_complete,false);
  assert.equal(report.production_ready,false);

  assert.deepEqual(
    report.parts[0].graphics_node.summary.includes.map((x)=>x.name),
    ["?Include Library/46838"]
  );
  assert.deepEqual(
    report.parts[0].geometric_variation.summary.includes.map((x)=>x.name),
    ["?Include Library/46910"]
  );
  assert.equal(report.parts[0].geometry_source_selected,null);

  assert.equal(report.parts[1].graphics_node.status,"unresolved");
  assert.deepEqual(
    report.parts[1].geometric_variation.summary.includes.map((x)=>x.name),
    ["?Include Library/47012"]
  );
});

test("A20: composed report preserves ambiguity instead of decoding a guessed segment",()=>{
  const bytes=Uint8Array.from([
    ...open("121190"),...close(),
    ...open("121190"),...close()
  ]);
  const report=buildPartHsfEvidenceReport({
    opcodeStream:bytes,
    partGraphicsLinks:[
      {part_number:"dup",graphics_node:121190,geometric_variation:null}
    ]
  });

  assert.equal(report.ambiguous_count,1);
  assert.equal(report.parts[0].graphics_node.status,"ambiguous");
  assert.equal(report.parts[0].graphics_node.decoded,null);
});
