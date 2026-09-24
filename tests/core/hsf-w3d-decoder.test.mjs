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
  if (unsupported) stream.push(0x3a,0x7a);
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
  assert.equal(out.entities[0].kind,"segment");
  assert.equal(out.entities[0].payload.name,"abc");
  assert.equal(out.entities[2].kind,"bounds");
  assert.equal(out.entities[2].payload.source_offset_space,"decompressed_hsf");
  assert.match(out.diagnostics.join(" "),/unsupported opcode 0x3a/i);
  assert.match(out.diagnostics.join(" "),/No resynchronization scan was attempted/i);
});

test("A20: decoder can report complete only when synchronized parsing reaches stop-compression", async()=>{
  const out=await decodeHsfW3d(fixture(false));
  assert.equal(out.complete,true);
  assert.match(out.diagnostics.join(" "),/reached TKE_Stop_Compression/i);
});
