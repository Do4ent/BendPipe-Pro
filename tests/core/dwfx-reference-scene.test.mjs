import test from "node:test";
import assert from "node:assert/strict";

import {
  parseDwfxObjectTree,
  circularArcPolyline,
  classifyReferenceFastenerLabel,
  classifyReferenceAxialVentilatorLabel,
  classifyReferenceCableGlandLabel,
  classifyReferenceHoseClampLabel,
  classifyReferenceAnnotationLabel,
  computeReferenceSceneBounds
} from "../../src/import/dwfx/reference-scene.mjs";
import {
  buildDisplayHsfSegmentIndex,
  decodeIndexedDisplaySegment
} from "../../src/import/dwfx/display-segment-index.mjs";

test("DWFx reference object tree preserves nested source Object order",()=>{
  const xml=`<dwf:Content xmlns:dwf="urn:test">
    <dwf:Objects>
      <dwf:Object id="root" label="Assembly">
        <dwf:Object id="a" label="Part A" entityRef="ea"/>
        <dwf:Object id="sub" label="Subassembly">
          <dwf:Object id="b" label="Part B" entityRef="eb"/>
        </dwf:Object>
      </dwf:Object>
    </dwf:Objects>
  </dwf:Content>`;

  const roots=parseDwfxObjectTree(xml);
  assert.equal(roots.length,1);
  assert.equal(roots[0].id,"root");
  assert.deepEqual(
    roots[0].children.map((node)=>node.id),
    ["a","sub"]
  );
  assert.equal(roots[0].children[1].children[0].id,"b");
  assert.equal(roots[0].children[1].children[0].entity_ref,"eb");
});

test("display-only HSF index validates a named segment by synchronized root decode",()=>{
  const name="123";
  const bytes=Uint8Array.of(
    0x28,name.length,...Buffer.from(name,"ascii"),
    0x29
  );
  const index=buildDisplayHsfSegmentIndex(bytes);
  const decoded=decodeIndexedDisplaySegment(bytes,index,name,{hsfVersion:"14.50"});

  assert.equal(decoded.status,"exact_display");
  assert.equal(decoded.root_segment_complete,true);
  assert.equal(decoded.offset,0);
  assert.equal(decoded.entities[0].kind,"segment");
  assert.equal(decoded.entities[0].name,name);
  assert.equal(decoded.production_ready,false);
  assert.equal(decoded.canonical_ready,false);
});

test("display-only HSF index refuses ambiguous duplicate named segments",()=>{
  const one=Uint8Array.of(0x28,1,0x31,0x29);
  const bytes=new Uint8Array(one.length*2);
  bytes.set(one,0);
  bytes.set(one,one.length);

  const index=buildDisplayHsfSegmentIndex(bytes);
  const decoded=decodeIndexedDisplaySegment(bytes,index,"1",{hsfVersion:"14.50"});

  assert.equal(decoded.status,"ambiguous");
  assert.equal(decoded.validated_count,2);
  assert.equal(decoded.production_ready,false);
});


test("DWFx display-only circular arc sampler preserves source endpoints and arc side",()=>{
  const points=circularArcPolyline({
    start:[1,0,0],
    middle:[Math.SQRT1_2,Math.SQRT1_2,0],
    end:[0,1,0]
  });

  assert.ok(points.length>8);
  assert.deepEqual(points[0],[1,0,0]);
  assert.ok(Math.abs(points.at(-1)[0])<1e-9);
  assert.ok(Math.abs(points.at(-1)[1]-1)<1e-9);
  const middleSample=points[Math.floor(points.length/2)];
  assert.ok(middleSample[0]>0);
  assert.ok(middleSample[1]>0);
});


test("A40: reference fastener filter removes bolts nuts washers and screws without deleting assemblies that only mention them",()=>{
  const excluded=[
    ["10000102, Caged nut, SS836A, M6, DIN 88109:5","nut"],
    ["10000258, Hexagonal nut, SS304, M8, DIN 934:1","nut"],
    ["10002347, Cable gland nut, Polyamide, M20x1,5:1","nut"],
    ["10000328, Washer, SS304, DIN 9021, M6, 6,4x18mm:1","washer"],
    ["10000134, Serrated lock washer, SS304, 6,4x11mm, DIN 6798:1","washer"],
    ['10001620/F - Turnery ware, SS304, Hinge washer Ø ⅜" (5mm):1',"washer"],
    ["DIN 933 - M6x16 - Stainless 304, Polished, Hexagon head screw, SS304, M6x16:1","screw"],
    ["Round head screw, ISO 7380-1 10002246:1","screw"],
    ["10002370, Flanged button screws, SS304, M6x12, torx:1","screw"],
    ["123456, Hex bolt, M8x30:1","bolt"]
  ];
  for(const [label,kind] of excluded){
    assert.equal(classifyReferenceFastenerLabel(label),kind,label);
  }

  assert.equal(
    classifyReferenceFastenerLabel(
      '10003595, Sealing ring, Aluminium, Banjo bolt, 1/4":1'
    ),
    null
  );
  assert.equal(
    classifyReferenceFastenerLabel(
      "10000104, Clamp tankthrough with contra nut, Brass, 15mm:1"
    ),
    null
  );
  assert.equal(
    classifyReferenceFastenerLabel(
      '10000271, Reducing ring, Brass, 1" x 1/2":1'
    ),
    null
  );
  assert.equal(
    classifyReferenceFastenerLabel(
      "10000373, Elbow, Copper, 90°, female x female, 22mm:2"
    ),
    null
  );
});


test("A41: reference annotation labels are excluded as display-only clutter",()=>{
  for(const label of [
    "Annotation",
    "Annotations",
    "Annotatie",
    "Annotaties",
    "Anmerkung",
    "Anmerkungen",
    "Аннотация",
    "Примечания"
  ]){
    assert.equal(classifyReferenceAnnotationLabel(label),"annotation",label);
  }

  for(const label of [
    "Diameter Dimension 1",
    "Linear Dimension 3",
    "Leader Text 1",
    "Clamp tankthrough with contra nut",
    "Tube, Copper, 3/8"
  ]){
    assert.equal(classifyReferenceAnnotationLabel(label),null,label);
  }
});


test("A42: reference-scene bounds use retained placed geometry and nested transforms",()=>{
  const identity=[
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ];
  const translate=(x,y,z)=>[
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    x,y,z,1
  ];
  const assets=[
    {
      id:"mesh",
      status:"exact",
      meshes:[{
        vertices:[[0,0,0],[2,3,4]],
        matrix:translate(1,2,3)
      }],
      line_segments:null,
      nested_instances:[]
    },
    {
      id:"group",
      status:"exact",
      meshes:[],
      line_segments:null,
      nested_instances:[{
        asset_id:"mesh",
        placement_matrix:translate(10,0,0),
        status:"exact"
      }]
    }
  ];
  const tree=[{
    id:"root",
    geometry_instances:[{
      asset_id:"group",
      placement_matrix:translate(100,200,300),
      status:"exact"
    }],
    children:[]
  }];

  const result=computeReferenceSceneBounds({
    tree,
    assets,
    scale_mm_per_source_unit:10
  });

  assert.equal(result.status,"exact");
  assert.deepEqual(result.source_units.min,[111,202,303]);
  assert.deepEqual(result.source_units.max,[113,205,307]);
  assert.deepEqual(result.mm.min,[1110,2020,3030]);
  assert.deepEqual(result.mm.max,[1130,2050,3070]);
  assert.deepEqual(result.mm.size,[20,30,40]);
  assert.equal(result.point_count,2);
});


test("A43: hose clamps are excluded without removing hoses or unrelated clamps",()=>{
  const excluded=[
    "Hoseclamp SS304 22-32mm:1",
    "Hoseclamp ss304 11-17mm:16",
    "10008997, Hose clamp ,wide ,29-31mm DIN 3017:1",
    "Hose clamp, SS304, 11-17mm",
    "Hose clip 12-20mm",
    "Slangklem RVS 20-32mm",
    "Schlauchschelle 20-32mm",
    "Шланговый хомут 20-32 мм",
    "Хомут для шланга 20-32 мм"
  ];
  for(const label of excluded){
    assert.equal(classifyReferenceHoseClampLabel(label),"hose_clamp",label);
  }

  const retained=[
    "10141429/ - Hose, EPDM, Castor 13x20mm:1",
    "10141438/ - Hose, PVC, Jupiter SD 25x32,6mm:1",
    "10000104, Clamp tankthrough with contra nut, Brass, 15mm:1",
    "Pipe clamp, SS304, 22mm",
    "Cable clamp"
  ];
  for(const label of retained){
    assert.equal(classifyReferenceHoseClampLabel(label),null,label);
  }
});


test("A44: all Cable gland variants are excluded",()=>{
  const excluded=[
    "10000165, Cable gland black, Polyamide, M20 x 1,5, clamping range 6-12mm:1",
    "10002343, Cable gland black, Polyamide, M32 x 1,5, clamping range 18-25mm:1",
    "10002351, Cable gland blind, Polyamide, M20x1,5:1",
    "10002347, Cable gland nut, Polyamide, M20x1,5:1",
    "Cable gland, grey, M20",
    "Cable glands, stainless steel, M25",
    "Kabelwartel M20",
    "Kabelverschraubung M32",
    "Кабельный ввод M20",
    "Кабельный сальник M25"
  ];
  for(const label of excluded){
    assert.equal(
      classifyReferenceCableGlandLabel(label),
      "cable_gland",
      label
    );
  }

  const retained=[
    "Cable, black, 5m",
    "Cable clamp",
    "Cable tray",
    "Gland plate"
  ];
  for(const label of retained){
    assert.equal(classifyReferenceCableGlandLabel(label),null,label);
  }
});


test("A45: axial ventilators are excluded without removing unrelated ventilation parts",()=>{
  const excluded=[
    "Ventilator, Axial, 230V, 50Hz:1",
    "Ventilator Axial 120x120mm",
    "Axial ventilator, 24VDC",
    "Axial fan 120mm",
    "Axial fans 230V",
    "Axiaalventilator 230V",
    "Axialventilator 24V",
    "Осевой вентилятор 230В"
  ];
  for(const label of excluded){
    assert.equal(
      classifyReferenceAxialVentilatorLabel(label),
      "axial_ventilator",
      label
    );
  }

  const retained=[
    "Ventilator, Radial, 230V",
    "Fan guard, axial ventilator",
    "Ventilation duct",
    "Fan bracket",
    "Air filter"
  ];
  for(const label of retained){
    assert.equal(classifyReferenceAxialVentilatorLabel(label),null,label);
  }
});
