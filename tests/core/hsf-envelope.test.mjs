import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { decodeHsfEnvelope, decodeHsfOpcodePrefix } from '../../src/import/dwfx/hsf-envelope.mjs';

function le32(v){ return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]; }
function f32(v){ const b=Buffer.allocUnsafe(4); b.writeFloatLE(v); return [...b]; }

function fixture(){
  const stream = Uint8Array.from([
    0x28, 0x03, ...Buffer.from('abc'),
    0x29,
    0x42, 0x00, ...f32(-1),...f32(-2),...f32(-3),...f32(4),...f32(5),...f32(6),
    0x7d, 0x00, ...f32(0),...f32(0),...f32(10), ...f32(0),...f32(0),...f32(0), ...f32(0),...f32(1),...f32(0), ...f32(20),...f32(10), 0x07, ...Buffer.from('default'),
    0x4c, ...le32(2), ...f32(0),...f32(0),...f32(0), ...f32(10),...f32(0),...f32(0),
    0x7a
  ]);
  const compressed = deflateSync(stream);
  return Uint8Array.from([
    ...Buffer.from(';; HSF V14.50 '), 0,
    0x49, ...le32(0x9a06),
    0x3b, ...Buffer.from('W3D V01.00\n'),
    0x49, ...le32(0),
    0x5a, ...compressed, 0x00
  ]);
}

test('A20: decodes HSF/W3D envelope and zlib block without promoting geometry', async()=>{
  const out=await decodeHsfEnvelope(fixture());
  assert.equal(out.hsf_version,'14.50');
  assert.equal(out.file_info.length,2);
  assert.equal(out.file_info[0].flags,0x9a06);
  assert.equal(out.comments[0].text,'W3D V01.00');
  assert.equal(out.opcode_stream.at(-1),0x7a);
});

test('A20: decodes synchronized segment, bounds, view and polyline prefix', async()=>{
  const env=await decodeHsfEnvelope(fixture());
  const out=decodeHsfOpcodePrefix(env.opcode_stream);
  assert.equal(out.complete_prefix,true);
  assert.deepEqual(out.entities[0],{kind:'segment',action:'open',source_offset:0,name:'abc'});
  assert.equal(out.entities[2].kind,'bounds');
  assert.deepEqual(out.entities[2].min,[-1,-2,-3]);
  assert.equal(out.entities[3].kind,'view');
  assert.equal(out.entities[3].name,'default');
  assert.equal(out.entities[4].kind,'polyline');
  assert.deepEqual(out.entities[4].points,[[0,0,0],[10,0,0]]);
});

test('A20: tag, distant light and pause advance synchronously with exact offsets',()=>{
  const bytes=Uint8Array.from([
    0x71,
    0x64,...f32(1),...f32(2),...f32(3),
    0x01,
    0x3a
  ]);
  const out=decodeHsfOpcodePrefix(bytes);
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x3a);
  assert.deepEqual(out.entities.map((e)=>e.kind),['tag','light','pause']);
  assert.equal(out.entities[0].source_offset,0);
  assert.equal(out.entities[1].source_offset,1);
  assert.deepEqual(out.entities[1].direction,[1,2,3]);
  assert.equal(out.entities[2].source_offset,14);
  assert.equal(out.next_offset,15);
});

test('A20: color parser follows documented extended geometry and channel masks',()=>{
  const bytes=Uint8Array.from([
    0x22,
    0x80,0x02,
    0x03,
    0x00,127,127,127,
    0x00,255,255,255,
    0x3a
  ]);
  const out=decodeHsfOpcodePrefix(bytes);
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x3a);
  assert.equal(out.next_offset,12);
  assert.equal(out.entities[0].kind,'color');
  assert.equal(out.entities[0].geometry_mask,0x0280);
  assert.equal(out.entities[0].channels_mask,0x0003);
  assert.deepEqual(out.entities[0].channels.diffuse.rgb_bytes,[127,127,127]);
  assert.deepEqual(out.entities[0].channels.specular.rgb_bytes,[255,255,255]);
});

test('A20: unknown opcode stops synchronized parsing instead of scanning or guessing',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([0x28,0x01,0x61,0x3a,0x01,0x02,0x03]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x3a);
  assert.equal(out.next_offset,3);
  assert.equal(out.entities.length,1);
});
