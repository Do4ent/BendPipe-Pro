import test from "node:test";
import assert from "node:assert/strict";

import { intakeRawDwfxEvidence } from "../../src/import/dwfx/raw-dwfx-evidence.mjs";

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

function descriptor(path){
  return `<eModel:Space xmlns:eModel="DWF-eModel:1.0">
    <eModel:Units type="mm"/>
    <eModel:Resources>
      <eModel:GraphicResource role="3d streaming graphics"
        mime="application/x-w3d"
        href="/${path}"
        size="3"
        transform="10 0 0 0 0 10 0 0 0 0 10 0 0 0 0 1">
        <eModel:Properties>
          <eModel:Property name="_PolygonHandedness" value="left"/>
        </eModel:Properties>
      </eModel:GraphicResource>
    </eModel:Resources>
  </eModel:Space>`;
}

function packageEntries(){
  const w3d="dwf/model/model.w3d";
  return [
    {path:"dwf/model/descriptor.xml",content:descriptor(w3d)},
    {path:w3d,content:"W3D"},
    {
      path:"doc/content.xml",
      content:`<dwf:Content xmlns:dwf="urn:dwf">
        <dwf:Entity id="ent1" label="10157546.ipt">
          <dwf:Property name="Description" value="Bended tube, Copper EN 12735-1, 1/2&quot;x0,89mm" category="Design Tracking Properties"/>
          <dwf:Property name="Part Number" value="10157546" category="Design Tracking Properties"/>
          <dwf:Property name="Revision Number" value="B" category="Summary Information"/>
          <dwf:Property name="Material" value="Copper" category="Physical"/>
          <dwf:Property name="Length" value="1214,6 mm" category="User Defined Properties"/>
          <dwf:Property name="OD" value="12,7 mm" category="User Defined Properties"/>
          <dwf:Property name="SN" value="1,0 mm" category="User Defined Properties"/>
        </dwf:Entity>
        <dwf:Object id="obj1" label="10157546/B - Bended tube, Copper:1" entityRef="ent1"/>
      </dwf:Content>`
    },
    {
      path:"model/presentation.xml",
      content:'<Presentation><ReferenceNode id="ref1" contentElementRefs="obj1" label="10157546:1"/></Presentation>'
    },
    {
      path:"model/definition.xml",
      content:'<dwf:Instances xmlns:dwf="urn:dwf"><dwf:Instance id="inst1" renderableRef="obj1" node="121190" geometricVariation="121191"/></dwf:Instances>'
    }
  ];
}

test("A20: one raw DWFx package yields exact model metadata and graphics linkage",async()=>{
  const result=await intakeRawDwfxEvidence(
    makeStoredZip(packageEntries()),
    {dwfx_file:"sample.dwfx"}
  );

  assert.equal(result.status,"exact");
  assert.equal(result.stage,"raw_evidence");
  assert.equal(result.production_ready,false);
  assert.equal(result.tube_count,1);
  assert.equal(result.model.descriptor.w3d.scale_mm_per_source_unit,10);
  assert.equal(result.model.descriptor.w3d.polygon_handedness,"left");

  const tube=result.metadata.tubes[0];
  assert.equal(tube.part_number,"10157546");
  assert.equal(tube.revision,"B");
  assert.equal(tube.material,"Copper");
  assert.equal(tube.metadata.outer_diameter.value,12.7);
  assert.equal(tube.metadata.wall_thickness.value,0.89);
  assert.equal(tube.metadata.developed_length.value,1214.6);

  const link=result.graphics_links[0];
  assert.equal(link.status,"exact");
  assert.equal(link.part_number,"10157546");
  assert.equal(link.graphics_node,121190);
  assert.equal(link.geometric_variation,121191);
});

test("A20: raw facade stops at model-resource blocker before XML linkage",async()=>{
  const entries=packageEntries().filter((x)=>!x.path.endsWith(".w3d"));
  const result=await intakeRawDwfxEvidence(makeStoredZip(entries),{dwfx_file:"sample.dwfx"});

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"model_resources");
  assert.equal(result.linkage,null);
});

test("A20: raw facade stops when exact graphics linkage for metadata part is missing",async()=>{
  const entries=packageEntries().map((entry)=>
    entry.path==="model/definition.xml"
      ? {...entry,content:'<dwf:Instances xmlns:dwf="urn:dwf"><dwf:Instance id="inst1" renderableRef="other" node="121190" geometricVariation="121191"/></dwf:Instances>'}
      : entry
  );
  const result=await intakeRawDwfxEvidence(makeStoredZip(entries),{dwfx_file:"sample.dwfx"});

  assert.equal(result.status,"blocked");
  assert.equal(result.stage,"graphics_linkage");
  assert.match(result.blocker,/10157546/);
});

test("A20: raw facade never claims geometry decode or production readiness",async()=>{
  const result=await intakeRawDwfxEvidence(
    makeStoredZip(packageEntries()),
    {dwfx_file:"sample.dwfx"}
  );

  assert.equal(result.production_ready,false);
  assert.match(result.blocker,/HSF Include Library linkage and geometry decode remain downstream/i);
  assert.equal("canonical_geometry" in result,false);
});
