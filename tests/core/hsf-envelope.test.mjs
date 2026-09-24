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
    0x01
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{maxOpcodes:3});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
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
    0x00
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{maxOpcodes:3});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
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
    0x55,0x04,0x00,...Buffer.from('node')
  ]),{maxOpcodes:1});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
  assert.equal(out.next_offset,7);
  assert.deepEqual(out.entities[0],{kind:'user_options',source_offset:0,value:'node'});
});

test('A20: simple heuristics mask/value decode without consuming optional payloads',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([
    0x48,0x02,0x00,0xfd,0xff
  ]),{maxOpcodes:1});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
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

test('A20: Autodesk HW3D image descriptor keeps only resource metadata',()=>{
  const name='"ENVIRONMENT-X"';
  const bytes=Uint8Array.from([
    0xe0,name.length,...Buffer.from(name),
    ...le32(256),...le32(128),32
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{maxOpcodes:1});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
  assert.equal(out.entities[0].kind,'hw3d_image');
  assert.equal(out.entities[0].name,name);
  assert.equal(out.entities[0].width,256);
  assert.equal(out.entities[0].height,128);
  assert.equal(out.entities[0].bit_depth,32);
});

test('A20: texture parser follows length, flags and conditional fields exactly',()=>{
  const name='"ENVIRONMENT-X"';
  const bytes=Uint8Array.from([
    0x74,
    name.length,...Buffer.from(name),
    name.length,...Buffer.from(name),
    0x01,0x00,
    0x06
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{maxOpcodes:1});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.limit_reached,true);
  assert.equal(out.entities[0].kind,'texture');
  assert.equal(out.entities[0].name,name);
  assert.equal(out.entities[0].image_name,name);
  assert.equal(out.entities[0].flags,1);
  assert.equal(out.entities[0].options.parameter_source,6);
});

test('A20: unknown opcode stops synchronized parsing instead of scanning or guessing',()=>{
  const out=decodeHsfOpcodePrefix(Uint8Array.from([0x28,0x01,0x61,0xff,0x01,0x02,0x03]));
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0xff);
  assert.equal(out.next_offset,3);
  assert.equal(out.entities.length,1);
});


function shellFixture({ optionalOpcode = 0x1c } = {}) {
  const workspace = Uint8Array.from([
    0x02,0x00,0x00,0x00,
    ...le32(0),...le32(0),...le32(0),...le32(2),...le32(0)
  ]);
  const bytes = [
    0x53,
    0x58,
    0x00,
    0x05,
    ...le32(workspace.length),
    ...workspace,
    ...f32(1),...f32(2),...f32(3),
    ...f32(4),...f32(5),...f32(6),
    optionalOpcode
  ];
  if (optionalOpcode === 0x1c) {
    bytes.push(
      0x02,
      ...f32(0),...f32(0),
      ...f32(1),...f32(1),
      0x00,
      0x7a
    );
  } else {
    bytes.push(0x11,0x22,0x33,0x7a);
  }
  return Uint8Array.from(bytes);
}

test('A20: TKE_Shell exposes exact post-EdgeBreaker vertices but not invented faces',()=>{
  const out=decodeHsfOpcodePrefix(shellFixture(),{hsfVersion:'14.50'});
  assert.equal(out.complete_prefix,true);
  assert.equal(out.entities.length,1);
  const shell=out.entities[0];
  assert.equal(shell.kind,'triangle_mesh');
  assert.equal(shell.encoding,'TKE_Shell');
  assert.equal(shell.suboptions,0x58);
  assert.equal(shell.compression_scheme,0x05);
  assert.equal(shell.edge_breaker.scheme,2);
  assert.equal(shell.edge_breaker.point_count,2);
  assert.deepEqual(shell.vertices,[[1,2,3],[4,5,6]]);
  assert.equal(shell.connectivity.status,'compressed_unresolved');
  assert.equal(shell.connectivity.codec,'edgebreaker');
  assert.equal(shell.connectivity.faces,null);
  assert.deepEqual(shell.optionals,[{
    opcode:0x1c,
    kind:'all_parameters',
    source_offset:56,
    width:2,
    value_count:2,
    scalar_count:4
  }]);
});

test('A20: TKE_Shell refuses to infer post-workspace point layout without HSF version',()=>{
  const out=decodeHsfOpcodePrefix(shellFixture());
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x53);
  assert.equal(out.next_offset,0);
  assert.match(out.unsupported_variant,/requires HSF version/i);
  assert.equal(out.entities.length,0);
});

test('A20: unknown TKE_Shell optional stops at the exact nested opcode without resynchronizing',()=>{
  const out=decodeHsfOpcodePrefix(shellFixture({optionalOpcode:0x7f}),{hsfVersion:'14.50'});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0x53);
  assert.equal(out.next_offset,56);
  assert.match(out.unsupported_variant,/optional opcode 0x7f/i);
  assert.equal(out.entities.length,0);
});


test('A20: style visibility RGB and native circular arc remain exact source evidence',()=>{
  const bytes=Uint8Array.from([
    0x7b,0x03,...Buffer.from('sty'),
    0x56,0x01,0xfe,
    0x7e,0x86,0x10,65,63,62,
    0x63,
    ...f32(1),...f32(0),...f32(0),
    ...f32(0),...f32(1),...f32(0),
    ...f32(-1),...f32(0),...f32(0),
    0x00,
    0xff
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{hsfVersion:'14.50'});
  assert.equal(out.complete_prefix,false);
  assert.equal(out.unsupported_opcode,0xff);
  assert.equal(out.next_offset,52);
  assert.match(out.unsupported_variant,/outside geometry-attributes scope/i);
  assert.deepEqual(out.entities.map((e)=>e.kind),[
    'segment','visibility','color','curve_candidate'
  ]);
  assert.equal(out.entities[0].action,'style');
  assert.equal(out.entities[0].name,'sty');
  assert.equal(out.entities[1].mask,1);
  assert.equal(out.entities[1].value,0xfe);
  assert.equal(out.entities[2].geometry_mask,0x1086);
  assert.deepEqual(out.entities[2].rgb_bytes,[65,63,62]);
  assert.equal(out.entities[3].primitive,'circular_arc');
  assert.deepEqual(out.entities[3].start,[1,0,0]);
  assert.deepEqual(out.entities[3].middle,[0,1,0]);
  assert.deepEqual(out.entities[3].end,[-1,0,0]);
  assert.equal(out.entities[3].flags,0);
  assert.equal(out.entities[3].center,null);
  assert.equal(out.entities[3].canonical_ready,false);
});

test('A20: HSF 12.15+ circular arc can carry an explicit center point',()=>{
  const bytes=Uint8Array.from([
    0x63,
    ...f32(1),...f32(0),...f32(0),
    ...f32(0),...f32(1),...f32(0),
    ...f32(-1),...f32(0),...f32(0),
    0x01,
    ...f32(0),...f32(0),...f32(0),
    0xff
  ]);
  const out=decodeHsfOpcodePrefix(bytes,{hsfVersion:'14.50'});
  assert.equal(out.unsupported_opcode,0xff);
  assert.equal(out.next_offset,50);
  assert.equal(out.entities[0].flags,1);
  assert.deepEqual(out.entities[0].center,[0,0,0]);
});
