import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeUniqueHsfNamedSegment,
  findHsfNamedSegmentCandidates,
  firstIncludedLibraryReference,
  locateUniqueHsfNamedSegment
} from "../../src/import/dwfx/hsf-segment-linkage.mjs";

function open(name) {
  return [0x28,name.length,...Buffer.from(name)];
}

function include(name) {
  return [0x3c,name.length,...Buffer.from(name)];
}

test("A20: exact geometric-variation name resolves one synchronized HSF root segment",()=>{
  const stream=Uint8Array.from([
    ...open("prefix"),0x29,
    ...open("121137"),
    0x71,
    0x55,0x04,0x00,...Buffer.from("node"),
    ...include("?Include Library/34001"),
    0x29,
    ...open("suffix"),0x29,
    0x7a
  ]);

  const location=locateUniqueHsfNamedSegment(stream,"121137");
  assert.equal(location.status,"exact");

  const decoded=decodeUniqueHsfNamedSegment(stream,"121137",{hsfVersion:"14.50"});
  assert.equal(decoded.status,"exact");
  assert.equal(decoded.root_segment_complete,true);
  assert.deepEqual(
    decoded.entities.map((entity)=>[entity.kind,entity.action ?? null,entity.name ?? null]),
    [
      ["segment","open","121137"],
      ["tag",null,null],
      ["user_options",null,null],
      ["segment","include","?Include Library/34001"],
      ["segment","close",null]
    ]
  );
  assert.equal(decoded.entities[1].tag_index,0);
  assert.deepEqual(decoded.entities[3].segment_path,["121137"]);

  const includeRef=firstIncludedLibraryReference(decoded);
  assert.equal(includeRef.status,"exact");
  assert.equal(includeRef.name,"?Include Library/34001");
  assert.equal(
    includeRef.source_offset,
    decoded.entities[3].absolute_source_offset
  );
});

test("A20: named-segment lookup never chooses among duplicate byte-exact candidates",()=>{
  const stream=Uint8Array.from([
    ...open("121137"),0x29,
    ...open("121137"),0x29
  ]);
  assert.deepEqual(findHsfNamedSegmentCandidates(stream,"121137"),[0,9]);
  const located=locateUniqueHsfNamedSegment(stream,"121137");
  assert.equal(located.status,"ambiguous");
  assert.equal(located.offset,null);

  const decoded=decodeUniqueHsfNamedSegment(stream,"121137",{hsfVersion:"14.50"});
  assert.equal(decoded.status,"ambiguous");
  assert.equal(decoded.entities.length,0);
});

test("A20: absent named HSF segment remains unresolved",()=>{
  const located=locateUniqueHsfNamedSegment(Uint8Array.from([0x7a]),"121137");
  assert.equal(located.status,"unresolved");
  assert.equal(located.match_count,0);
});

test("A20: root segment decode stops at its matching close instead of consuming the next segment",()=>{
  const first=[...open("root"),...open("child"),0x29,0x29];
  const second=[...open("next"),0x29,0x7a];
  const stream=Uint8Array.from([...first,...second]);
  const decoded=decodeUniqueHsfNamedSegment(stream,"root",{hsfVersion:"14.50"});

  assert.equal(decoded.status,"exact");
  assert.equal(decoded.next_absolute_offset,first.length);
  assert.deepEqual(
    decoded.entities.filter((e)=>e.action==="open").map((e)=>e.name),
    ["root","child"]
  );
});

test("A20: include extraction refuses multiple library references",()=>{
  const stream=Uint8Array.from([
    ...open("121137"),
    ...include("?Include Library/1"),
    ...include("?Include Library/2"),
    0x29
  ]);
  const decoded=decodeUniqueHsfNamedSegment(stream,"121137",{hsfVersion:"14.50"});
  const ref=firstIncludedLibraryReference(decoded);
  assert.equal(ref.status,"ambiguous");
  assert.equal(ref.match_count,2);
});
