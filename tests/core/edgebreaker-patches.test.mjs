import test from "node:test";
import assert from "node:assert/strict";

import { decodeEdgeBreakerConnectivity } from "../../src/import/dwfx/edgebreaker-connectivity.mjs";

function i32(value){
  const out=new Uint8Array(4);
  new DataView(out.buffer).setInt32(0,value,true);
  return out;
}
function u32(value){
  const out=new Uint8Array(4);
  new DataView(out.buffer).setUint32(0,value,true);
  return out;
}
function concat(...parts){
  const size=parts.reduce((sum,p)=>sum+p.length,0);
  const out=new Uint8Array(size);
  let at=0;
  for(const part of parts){out.set(part,at);at+=part.length;}
  return out;
}

test("DWFx EdgeBreaker patch aliases replace old vertex ids before final compaction",()=>{
  // One CASE_E reconstructs a 3-vertex pseudomanifold triangle.
  // MTable patch 2 -> 1 aliases the old third vertex to the second, so the
  // final unique point count is 2. The resulting degenerate face is dropped.
  const ops=Uint8Array.of(2,0,0,0);
  const mtable=concat(
    u32(0x10), // MTABLE_HAS_PATCHES
    u32(2),    // two ints = one old/new pair
    i32(2),    // old id delta => absolute old id 2
    i32(1)     // new absolute id 1
  );
  const header=concat(
    Uint8Array.of(2,0,0,0), // scheme, mtable, points, normals
    i32(1),
    i32(mtable.length),
    i32(0),
    i32(2),
    i32(0)
  );
  const workspace=concat(header,ops,mtable);

  const decoded=decodeEdgeBreakerConnectivity(workspace);

  assert.equal(decoded.raw_point_count,3);
  assert.equal(decoded.point_count,2);
  assert.equal(decoded.face_count,0);
  assert.deepEqual(decoded.patch_aliases,[[2,1]]);
  assert.equal(decoded.patched_face_references,1);
  assert.equal(decoded.dropped_dummy_faces,1);
});

test("DWFx EdgeBreaker patch aliases reject cycles instead of guessing connectivity",()=>{
  const ops=Uint8Array.of(2,0,0,0);
  const mtable=concat(
    u32(0x10),
    u32(4),
    i32(1),i32(2),
    i32(1),i32(1) // old ids 1 then 2 => 1->2 and 2->1
  );
  const header=concat(
    Uint8Array.of(2,0,0,0),
    i32(1),
    i32(mtable.length),
    i32(0),
    i32(1),
    i32(0)
  );
  assert.throws(
    ()=>decodeEdgeBreakerConnectivity(concat(header,ops,mtable)),
    /alias cycle/
  );
});
