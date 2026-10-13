import test from "node:test";
import assert from "node:assert/strict";

import {
  inspectDwfxBytes,
  extractDwfxResource,
  extractDwfxW3dEvidence
} from "../../src/import/dwfx/dwfx-package.mjs";

function u16(v){return [v&255,(v>>>8)&255];}
function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
function utf8(s){return [...new TextEncoder().encode(s)];}

function makeStoredZip(entries){
  const locals=[],centrals=[];let offset=0;
  for(const {path,content} of entries){
    const name=utf8(path),data=utf8(content);
    const local=[
      ...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),
      ...u16(0),...u16(0),...u32(0),...u32(data.length),...u32(data.length),
      ...u16(name.length),...u16(0),...name,...data
    ];
    locals.push(local);
    const central=[
      ...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),
      ...u16(0),...u16(0),...u32(0),...u32(data.length),...u32(data.length),
      ...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),
      ...u32(offset),...name
    ];
    centrals.push(central);
    offset+=local.length;
  }
  const central=centrals.flat(),centralOffset=offset;
  const eocd=[
    ...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),
    ...u32(central.length),...u32(centralOffset),...u16(0)
  ];
  return new Uint8Array([...locals.flat(),...central,...eocd]);
}

test("A19: composed DWFx inspection identifies W3D resources",()=>{
  const bytes=makeStoredZip([
    {path:"[Content_Types].xml",content:"<Types/>"},
    {path:"dwf/resources/model.w3d",content:"W3D DATA"}
  ]);
  const result=inspectDwfxBytes(bytes);
  assert.equal(result.inventory.resources.w3d.length,1);
  assert.equal(result.inventory.resources.w3d[0].path,"dwf/resources/model.w3d");
  assert.equal(result.production_ready,false);
});

test("A19: exact DWFx resource bytes can be extracted by package path",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/resources/model.w3d",content:"W3D DATA"}
  ]);
  const output=await extractDwfxResource(bytes,"/dwf/resources/model.w3d");
  assert.equal(new TextDecoder().decode(output),"W3D DATA");
});

test("A19: W3D extraction returns evidence, not canonical geometry",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/resources/a.w3d",content:"AAA"},
    {path:"dwf/resources/b.W3D",content:"BBB"}
  ]);
  const result=await extractDwfxW3dEvidence(bytes,{dwfxFile:"sample.dwfx"});
  assert.equal(result.w3d_resource_count,2);
  assert.equal(result.production_ready,false);
  assert.match(result.blocker,/not yet decoded/i);
  for(const evidence of result.resources){
    assert.equal(evidence.decode_status,"binary_unparsed");
    assert.equal(evidence.production_ready,false);
  }
});

test("A19: missing W3D remains an explicit package blocker",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/properties/metadata.xml",content:"<metadata/>"}
  ]);
  const result=await extractDwfxW3dEvidence(bytes,{dwfxFile:"sample.dwfx"});
  assert.equal(result.w3d_resource_count,0);
  assert.match(result.blocker,/No W3D resource/);
});
