import test from "node:test";
import assert from "node:assert/strict";

import { intakeDwfxModelResources } from "../../src/import/dwfx/raw-model-intake.mjs";

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

function descriptor(href){
  return `<eModel:Space xmlns:eModel="DWF-eModel:1.0">
    <eModel:Units type="mm"/>
    <eModel:Resources>
      <eModel:GraphicResource role="3d streaming graphics"
        mime="application/x-w3d"
        href="${href}"
        size="3"
        objectId="graphic"
        transform="10 0 0 0 0 10 0 0 0 0 10 0 0 0 0 1">
        <eModel:Properties>
          <eModel:Property name="_PolygonHandedness" value="left" category="hidden"/>
        </eModel:Properties>
      </eModel:GraphicResource>
    </eModel:Resources>
  </eModel:Space>`;
}

test("A20: raw DWFx intake resolves exact descriptor and unique W3D resource",async()=>{
  const path="dwf/model/model.w3d";
  const bytes=makeStoredZip([
    {path:"dwf/model/descriptor.xml",content:descriptor("/"+path)},
    {path,content:"W3D"}
  ]);

  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});

  assert.equal(result.status,"exact");
  assert.equal(result.production_ready,false);
  assert.equal(result.descriptor_match_count,1);
  assert.equal(result.descriptor.model_unit,"mm");
  assert.equal(result.descriptor.w3d.scale_mm_per_source_unit,10);
  assert.equal(result.descriptor.w3d.polygon_handedness,"left");
  assert.equal(result.w3d.package_path,path);
  assert.equal(new TextDecoder().decode(result.w3d.bytes),"W3D");
});

test("A20: missing W3D blocks raw intake",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/model/descriptor.xml",content:descriptor("/dwf/model/model.w3d")}
  ]);
  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});
  assert.equal(result.status,"blocked");
  assert.match(result.blocker,/No W3D resource/i);
});

test("A20: multiple W3D resources remain ambiguous",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/model/descriptor.xml",content:descriptor("/dwf/model/a.w3d")},
    {path:"dwf/model/a.w3d",content:"AAA"},
    {path:"dwf/model/b.w3d",content:"BBB"}
  ]);
  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});
  assert.equal(result.status,"blocked");
  assert.equal(result.w3d_resource_count,2);
  assert.match(result.blocker,/Multiple W3D resources/i);
});

test("A20: descriptor href mismatch cannot be replaced by same-folder guessing",async()=>{
  const bytes=makeStoredZip([
    {path:"dwf/model/descriptor.xml",content:descriptor("/dwf/model/other.w3d")},
    {path:"dwf/model/model.w3d",content:"W3D"}
  ]);
  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});
  assert.equal(result.status,"blocked");
  assert.equal(result.descriptor_match_count,0);
  assert.match(result.blocker,/No exact eModel descriptor/i);
});

test("A20: multiple exact descriptors referencing one W3D remain ambiguous",async()=>{
  const path="dwf/model/model.w3d";
  const bytes=makeStoredZip([
    {path:"dwf/a/descriptor.xml",content:descriptor("/"+path)},
    {path:"dwf/b/descriptor.xml",content:descriptor("/"+path)},
    {path,content:"W3D"}
  ]);
  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});
  assert.equal(result.status,"blocked");
  assert.equal(result.descriptor_match_count,2);
  assert.match(result.blocker,/Multiple exact eModel descriptors/i);
});

test("A20: malformed descriptor is retained only as diagnostic evidence",async()=>{
  const path="dwf/model/model.w3d";
  const bytes=makeStoredZip([
    {path:"dwf/bad/descriptor.xml",content:"<not-emodel/>"},
    {path,content:"W3D"}
  ]);
  const result=await intakeDwfxModelResources(bytes,{dwfx_file:"sample.dwfx"});
  assert.equal(result.status,"blocked");
  assert.equal(result.diagnostics[0].parse_status,"error");
  assert.equal(result.descriptor,null);
});
