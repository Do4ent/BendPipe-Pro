import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeGraphicResourceTransform,
  parseDwfEModelDescriptor
} from "../../src/import/dwfx/model-descriptor.mjs";

const descriptor=`<eModel:Space xmlns:eModel="DWF-eModel:1.0">
  <eModel:Units type="mm"/>
  <eModel:Resources>
    <eModel:GraphicResource role="3d streaming graphics"
      mime="application/x-w3d"
      href="/model.w3d"
      size="7546162"
      objectId="graphic-1"
      transform="10 0 0 0 0 10 0 0 0 0 10 0 0 0 0 1">
      <eModel:Properties>
        <eModel:Property name="_PolygonHandedness" value="left" category="hidden"/>
      </eModel:Properties>
    </eModel:GraphicResource>
  </eModel:Resources>
</eModel:Space>`;

test("A20: eModel descriptor yields exact W3D source-unit scale and handedness",()=>{
  const result=parseDwfEModelDescriptor(descriptor);
  assert.equal(result.status,"exact");
  assert.equal(result.model_unit,"mm");
  assert.equal(result.w3d.href,"/model.w3d");
  assert.equal(result.w3d.mime,"application/x-w3d");
  assert.equal(result.w3d.scale_mm_per_source_unit,10);
  assert.equal(result.w3d.polygon_handedness,"left");
  assert.equal(result.w3d.transform_analysis.status,"uniform_rigid_scale");
  assert.equal(result.production_ready,false);
});

test("A20: rotated uniform resource transform still exposes one length scale",()=>{
  const result=analyzeGraphicResourceTransform([
    0,-10,0,0,
    10,0,0,0,
    0,0,10,0,
    1,2,3,1
  ]);
  assert.equal(result.status,"uniform_rigid_scale");
  assert.ok(Math.abs(result.length_scale-10)<1e-12);
  assert.deepEqual(result.translation,[1,2,3]);
});

test("A20: non-uniform resource scale remains unresolved",()=>{
  const xml=descriptor.replace(
    "10 0 0 0 0 10 0 0 0 0 10 0",
    "10 0 0 0 0 20 0 0 0 0 10 0"
  );
  const result=parseDwfEModelDescriptor(xml);
  assert.equal(result.status,"unresolved");
  assert.equal(result.w3d.scale_mm_per_source_unit,null);
  assert.match(result.blocker,/uniform/i);
});

test("A20: missing polygon handedness remains explicit",()=>{
  const xml=descriptor.replace(
    '<eModel:Property name="_PolygonHandedness" value="left" category="hidden"/>',
    ""
  );
  const result=parseDwfEModelDescriptor(xml);
  assert.equal(result.status,"unresolved");
  assert.equal(result.w3d.polygon_handedness,null);
  assert.match(result.blocker,/Handedness/);
});

test("A20: multiple 3D streaming resources are rejected as ambiguous",()=>{
  const resource=`<eModel:GraphicResource role="3d streaming graphics" mime="application/x-w3d"
    href="/other.w3d" transform="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1">
    <eModel:Property name="_PolygonHandedness" value="right"/>
  </eModel:GraphicResource>`;
  const xml=descriptor.replace("</eModel:Resources>",resource+"</eModel:Resources>");
  assert.throws(
    ()=>parseDwfEModelDescriptor(xml),
    /exactly one 3d streaming GraphicResource/
  );
});
