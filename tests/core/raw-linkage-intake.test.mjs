import test from "node:test";
import assert from "node:assert/strict";

import { intakeDwfxLinkageXml } from "../../src/import/dwfx/raw-linkage-intake.mjs";

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

function fixtures(){
  return [
    {
      path:"doc/content-guid.content.xml",
      content:'<dwf:Content xmlns:dwf="urn:dwf"><dwf:Object id="obj1" label="10157546/B - Tube" entityRef="ent1"/></dwf:Content>'
    },
    {
      path:"section/presentation.xml",
      content:'<Presentation><ReferenceNode id="ref1" label="10157546:1" contentElementRefs="obj1"/></Presentation>'
    },
    {
      path:"section/definition.xml",
      content:'<dwf:Instances xmlns:dwf="urn:dwf"><dwf:Instance id="inst1" renderableRef="obj1" node="121190" geometricVariation="121191"/></dwf:Instances>'
    }
  ];
}

test("A20: raw linkage intake discovers resources by XML content, not filename",async()=>{
  const bytes=makeStoredZip(fixtures());
  const result=await intakeDwfxLinkageXml(bytes);

  assert.equal(result.status,"exact");
  assert.equal(result.production_ready,false);
  assert.equal(result.content_candidate_count,1);
  assert.equal(result.presentation_candidate_count,1);
  assert.equal(result.definition_candidate_count,1);
  assert.equal(result.resources.content.object_count,1);
  assert.equal(result.resources.presentation.reference_node_count,1);
  assert.equal(result.resources.content_definition.instance_count,1);
  assert.equal(result.link_index.links.length,1);
  assert.equal(result.link_index.links[0].object_label,"10157546/B - Tube");
  assert.equal(result.link_index.links[0].graphics_node,121190);
  assert.equal(result.link_index.links[0].geometric_variation,121191);
  assert.equal(result.link_index.links[0].status,"exact");
});

test("A20: duplicate Content/Object XML candidates remain ambiguous",async()=>{
  const entries=fixtures();
  entries.push({
    path:"other/also-content.xml",
    content:'<dwf:Content xmlns:dwf="urn:dwf"><dwf:Object id="obj2" label="Other" entityRef="ent2"/></dwf:Content>'
  });
  const result=await intakeDwfxLinkageXml(makeStoredZip(entries));

  assert.equal(result.status,"blocked");
  assert.equal(result.content_candidate_count,2);
  assert.match(result.blocker,/Multiple Content\/Object XML resources/i);
});

test("A20: missing ReferenceNode resource blocks linkage discovery",async()=>{
  const entries=fixtures().filter((x)=>!x.path.includes("presentation"));
  const result=await intakeDwfxLinkageXml(makeStoredZip(entries));

  assert.equal(result.status,"blocked");
  assert.equal(result.presentation_candidate_count,0);
  assert.match(result.blocker,/No Presentation\/ReferenceNode XML resource/i);
});

test("A20: missing Instance resource blocks linkage discovery",async()=>{
  const entries=fixtures().filter((x)=>!x.path.includes("definition"));
  const result=await intakeDwfxLinkageXml(makeStoredZip(entries));

  assert.equal(result.status,"blocked");
  assert.equal(result.definition_candidate_count,0);
  assert.match(result.blocker,/No ContentDefinition\/Instance XML resource/i);
});

test("A20: unrelated XML does not become a linkage candidate",async()=>{
  const entries=[
    ...fixtures(),
    {path:"manifest.xml",content:"<Manifest><Content href='x'/></Manifest>"}
  ];
  const result=await intakeDwfxLinkageXml(makeStoredZip(entries));

  assert.equal(result.status,"exact");
  assert.equal(result.content_candidate_count,1);
  assert.equal(result.presentation_candidate_count,1);
  assert.equal(result.definition_candidate_count,1);
});
