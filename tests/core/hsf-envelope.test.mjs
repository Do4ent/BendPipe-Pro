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

test('A20: geometry-attributes scope contains normal attribute opcodes and terminates explicitly',()=>{
  const bytes=Uint8Array.from([
    0x3a,
    0x22,
    0x80,0x02,
    0x03,
    0x00,127,127,127,
    0x00,255,255,255,
    0x00,
    0x55
  ]);
  const out=decodeHsfOpcodePrefix(bytes);
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x55);
  assert.equal(out.next_offset,14);
  assert.deepEqual(out.entities.map((e)=>e.kind),['geometry_scope','color','geometry_scope']);
  assert.equal(out.entities[0].action,'open');
  assert.equal(out.entities[1].geometry_mask,0x0280);
  assert.equal(out.entities[1].channels_mask,0x0003);
  assert.deepEqual(out.entities[1].channels.diffuse.rgb_bytes,[127,127,127]);
  assert.deepEqual(out.entities[1].channels.specular.rgb_bytes,[255,255,255]);
  assert.equal(out.entities[2].action,'close');
});

test('A20: user options decode short length and preserve exact string',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([
    0x55,0x04,0x00,...Buffer.from('node'),0x48
  ]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x48);
  assert.equal(out.next_offset,7);
  assert.deepEqual(out.entities[0],{kind:'user_options',source_offset:0,value:'node'});
});

test('A20: simple heuristics mask/value decode without consuming optional payloads',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([
    0x48,0x02,0x00,0xfd,0xff,0xe0
  ]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0xe0);
  assert.equal(out.next_offset,5);
  assert.deepEqual(out.entities[0],{kind:'heuristics',source_offset:0,mask:0x0002,value:0xfffd});
});

test('A20: heuristics with conditional payload stays blocked until version-aware decoding',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([
    0x48,0x40,0x00,0x40,0x00,0x01,0x00,0x00,0x00
  ]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x48);
  assert.equal(out.next_offset,0);
  assert.match(out.unsupported_variant,/version-aware/i);
  assert.equal(out.entities.length,0);
});

test('A20: unknown opcode stops synchronized parsing instead of scanning or guessing',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([0x28,0x01,0x61,0xe0,0x01,0x02,0x03]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0xe0);
  assert.equal(out.next_offset,3);
  assert.equal(out.entities.length,1);
});
