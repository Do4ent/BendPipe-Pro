import test from "node:test";
import assert from "node:assert/strict";

import { resolvePartHsfSegmentAnchors } from "../../src/import/dwfx/part-segment-linkage.mjs";

function openSegment(name) {
  return [0x28, name.length, ...Buffer.from(name)];
}

test("A20: part linkage records node and geometric-variation anchors independently",()=>{
  const bytes=Uint8Array.from([
    ...openSegment("121190"),0x29,
    ...openSegment("121191"),0x29,
    ...openSegment("121199"),0x29
  ]);
  const result=resolvePartHsfSegmentAnchors(bytes,[
    {part_number:"10157546",graphics_node:121190,geometric_variation:121191},
    {part_number:"10157683",graphics_node:121198,geometric_variation:121199}
  ]);

  assert.equal(result.anchored_count,2);
  assert.equal(result.unresolved_count,0);

  assert.equal(result.items[0].graphics_node_segment.status,"exact");
  assert.equal(result.items[0].geometric_variation_segment.status,"exact");
  assert.equal(result.items[0].exact_anchor_count,2);
  assert.equal(result.items[0].geometry_anchor_selected,null);

  assert.equal(result.items[1].graphics_node_segment.status,"unresolved");
  assert.equal(result.items[1].geometric_variation_segment.status,"exact");
  assert.equal(result.items[1].exact_anchor_count,1);
  assert.equal(result.items[1].geometry_anchor_selected,null);
  assert.equal(result.items[1].production_ready,false);
});

test("A20: absent node and variation remain unresolved instead of ordinal matching",()=>{
  const result=resolvePartHsfSegmentAnchors(
    Uint8Array.from([...openSegment("999"),0x29]),
    [{part_number:"tube-x",graphics_node:121136,geometric_variation:121137}]
  );
  assert.equal(result.items[0].status,"unresolved");
  assert.equal(result.items[0].exact_anchor_count,0);
  assert.equal(result.items[0].geometry_anchor_selected,null);
});

test("A20: duplicate named segments remain ambiguous",()=>{
  const bytes=Uint8Array.from([
    ...openSegment("121190"),0x29,
    ...openSegment("121190"),0x29
  ]);
  const result=resolvePartHsfSegmentAnchors(bytes,[
    {part_number:"10157546",graphics_node:121190,geometric_variation:null}
  ]);
  assert.equal(result.items[0].status,"ambiguous");
  assert.equal(result.items[0].graphics_node_segment.match_count,2);
});

test("A20: malformed numeric linkage fails loudly",()=>{
  assert.throws(
    ()=>resolvePartHsfSegmentAnchors(new Uint8Array(),[
      {part_number:"bad",graphics_node:12.5,geometric_variation:null}
    ]),
    /non-negative integer/
  );
});
