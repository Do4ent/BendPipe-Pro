import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { decodeHsfW3d } from "../../src/import/dwfx/hsf-w3d-decoder.mjs";

function le32(v){ return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]; }
function f32(v){ const b=Buffer.allocUnsafe(4); b.writeFloatLE(v); return [...b]; }

function fixture(unsupported = true){
  const stream = [
    0x28,0x03,...Buffer.from("abc"),
    0x29,
    0x42,0x00,...f32(-1),...f32(-2),...f32(-3),...f32(4),...f32(5),...f32(6)
  ];
  if (unsupported) stream.push(0x53,0x7a);
  else stream.push(0x7a);
  const compressed=deflateSync(Uint8Array.from(stream));
  return Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
}

test("A20: partial decoder preserves exact scene evidence and stops on unsupported opcode", async()=>{
  const out=await decodeHsfW3d(fixture(true),{source:{package_path:"model.w3d"}});
  assert.equal(out.complete,false);
  assert.equal(out.entities.length,1);
  assert.equal(out.entities[0].kind,"bounds");
  assert.deepEqual(out.entities[0].payload.segment_path,[]);
  assert.equal(out.entities[0].payload.source_offset_space,"decompressed_hsf");
  assert.match(out.diagnostics.join(" "),/unsupported opcode 0x53/i);
  assert.match(out.diagnostics.join(" "),/No resynchronization scan was attempted/i);
});

test("A20: decoder can report complete only when synchronized parsing reaches stop-compression", async()=>{
  const out=await decodeHsfW3d(fixture(false));
  assert.equal(out.complete,true);
  assert.match(out.diagnostics.join(" "),/reached TKE_Stop_Compression/i);
});


test("A20: modelling matrix is promoted to the evidence transform field", async()=>{
  const matrixStream=Uint8Array.from([
    0x25,
    ...f32(1),...f32(0),...f32(0),
    ...f32(0),...f32(1),...f32(0),
    ...f32(0),...f32(0),...f32(1),
    ...f32(10),...f32(20),...f32(30),
    0x7a
  ]);
  const compressed=deflateSync(matrixStream);
  const bytes=Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
  const out=await decodeHsfW3d(bytes);
  assert.equal(out.complete,true);
  assert.equal(out.entities[0].kind,"transform");
  assert.deepEqual(out.entities[0].transform,[
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    10,20,30,1
  ]);
  assert.equal(out.entities[0].payload.matrix,undefined);
  assert.equal(out.entities[0].payload.source_semantics,"native_hsf_modelling_matrix");
});


test("A20: full decoder filters display-only records and attaches segment provenance", async()=>{
  const stream=Uint8Array.from([
    0x28,0x04,...Buffer.from("part"),
    0x7e,0x01,10,20,30,
    0x6c,
    ...f32(0),...f32(0),...f32(0),
    ...f32(10),...f32(0),...f32(0),
    0x29,
    0x7a
  ]);
  const compressed=deflateSync(stream);
  const bytes=Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
  const out=await decodeHsfW3d(bytes);
  assert.equal(out.complete,true);
  assert.equal(out.entities.length,1);
  assert.equal(out.entities[0].kind,"curve_candidate");
  assert.equal(out.entities[0].payload.primitive,"line");
  assert.deepEqual(out.entities[0].payload.segment_path,["part"]);
  assert.match(out.diagnostics.join(" "),/Retained 1 geometry\/provenance entities/i);
});


test("A20: W3D evidence retains sequential HSF tag indices", async()=>{
  const stream=Uint8Array.from([0x71,0x71,0x7a]);
  const compressed=deflateSync(stream);
  const bytes=Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
  const out=await decodeHsfW3d(bytes);
  assert.equal(out.complete,true);
  assert.deepEqual(out.entities.map((e)=>e.kind),["tag","tag"]);
  assert.deepEqual(out.entities.map((e)=>e.payload.tag_index),[0,1]);
  assert.deepEqual(out.entities.map((e)=>e.source_offset),[0,1]);
});


test("A20: target tag filter keeps only requested graphics-node provenance", async()=>{
  const stream=Uint8Array.from([0x71,0x71,0x71,0x7a]);
  const compressed=deflateSync(stream);
  const bytes=Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
  const out=await decodeHsfW3d(bytes,{target_tag_indices:[1]});
  assert.equal(out.complete,true);
  assert.equal(out.entities.length,1);
  assert.equal(out.entities[0].kind,"tag");
  assert.equal(out.entities[0].payload.tag_index,1);
  assert.equal(out.entities[0].source_offset,1);
});

test("A20: configured opcode ceiling remains an explicit partial-decode blocker", async()=>{
  const stream=Uint8Array.from([
    0x28,0x01,0x61,
    0x29,
    0x7a
  ]);
  const compressed=deflateSync(stream);
  const bytes=Uint8Array.from([
    ...Buffer.from(";; HSF V14.50 "),0,
    0x49,...le32(0x9a06),
    0x3b,...Buffer.from("W3D V01.00\n"),
    0x49,...le32(0),
    0x5a,...compressed,0
  ]);
  const out=await decodeHsfW3d(bytes,{max_opcodes:1});
  assert.equal(out.complete,false);
  assert.match(out.diagnostics.join(" "),/configured opcode limit 1/i);
  assert.doesNotMatch(out.diagnostics.join(" "),/unsupported opcode 0xnan/i);
});
