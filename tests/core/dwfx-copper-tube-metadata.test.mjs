import test from "node:test";
import assert from "node:assert/strict";

import {
  extractCopperTubeMetadataFromContentXml,
  parseTubeDimensions
} from "../../src/import/dwfx/copper-tube-metadata.mjs";

const xml=`<dwf:Content xmlns:dwf="urn:dwf">
  <dwf:Entity id="tube-34">
    <dwf:Property name="Part Number" value="10102201" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, on length 3/4&quot; x 1,7mm" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
    <dwf:Property name="Length" value="145,0" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Entity id="tube-58">
    <dwf:Property name="Part Number" value="10102202" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, Copper, on length 5/8&quot; x 0,9" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
    <dwf:Property name="Length" value="490.0" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Entity id="tube-38-a">
    <dwf:Property name="Part Number" value="10102217" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, 3/8&quot; x 0,76mm" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
    <dwf:Property name="Length" value="730,0mm" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Entity id="tube-38-b">
    <dwf:Property name="Part Number" value="10102473" category="Design Tracking Properties"/>
    <dwf:Property name="Description" value="Tube, Copper 3_8inch x 0,76" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, 3/8&quot; x 0,76mm" category="Summary Information"/>
    <dwf:Property name="Length" value="1250,4 mm" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Entity id="tube-34-short">
    <dwf:Property name="Part Number" value="10100407" category="Design Tracking Properties"/>
    <dwf:Property name="Description" value="Tube. copper" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, on length 3/4&quot; x 1,7mm" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
    <dwf:Property name="Length" value="37,000 mm" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Object id="obj-10141451" label="10141451/ - Tube, Copper, on length 3/4&quot; x 1,7mm:1" entityRef="empty-10141451">
    <dwf:Property name="Description" value="Copper tube 3_4inch x 1,7" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Tube, Copper, on length 3/4&quot; x 1,7mm" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
    <dwf:Property name="Length" value="1018,6 mm" category="User Defined Properties"/>
    <dwf:Property name="OD" value="19,1 mm" category="User Defined Properties"/>
    <dwf:Property name="SN" value="1,0 mm" category="User Defined Properties"/>
  </dwf:Object>
  <dwf:Entity id="fitting">
    <dwf:Property name="Part Number" value="10000613" category="Design Tracking Properties"/>
    <dwf:Property name="Description" value="Elbow 90°, female x female" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="Copper" category="Physical"/>
    <dwf:Property name="Title" value="Elbow, Copper, 90°, female x female, 3/4&quot;" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Elbow" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/>
  </dwf:Entity>
  <dwf:Entity id="pvc-copy">
    <dwf:Property name="Part Number" value="10100719" category="Design Tracking Properties"/>
    <dwf:Property name="Description" value="Copy of Tube. copper" category="Design Tracking Properties"/>
    <dwf:Property name="Material" value="PVC bright" category="Physical"/>
    <dwf:Property name="Title" value="Tube, PVC, Bright 20mm x 2mm" category="Summary Information"/>
    <dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/>
    <dwf:Property name="Description 2" value="PVC C" category="User Defined Properties"/>
    <dwf:Property name="Length" value="472,000 mm" category="User Defined Properties"/>
  </dwf:Entity>
</dwf:Content>`;

test("DWFx copper recognizer accepts dimension notations used by 80004806",()=>{
  assert.deepEqual(parseTubeDimensions('Tube, Copper, on length 3/4" x 1,7mm'),{
    outer_diameter_mm:19.049999999999997,
    wall_thickness_mm:1.7,
    source_notation:'3/4" x 1,7mm',
    diameter_method:"explicit_imperial_fraction_to_mm"
  });
  assert.equal(parseTubeDimensions('Tube, Copper, 5/8" x 0,9').outer_diameter_mm,15.875);
  assert.equal(parseTubeDimensions("Tube, Copper 3_8inch x 0,76").wall_thickness_mm,0.76);
});

test("DWFx copper recognizer extracts the five exact linked copper tube parts from the 80004806 metadata shape",()=>{
  const result=extractCopperTubeMetadataFromContentXml(xml,{source_file:"80004806.dwfx"});

  assert.equal(result.status,"exact");
  assert.equal(result.production_ready,false);
  assert.deepEqual(
    result.tubes.map((tube)=>tube.part_number),
    ["10102201","10102202","10102217","10102473","10100407","10141451"]
  );

  const byPart=new Map(result.tubes.map((tube)=>[tube.part_number,tube]));
  assert.ok(Math.abs(byPart.get("10102201").metadata.outer_diameter.value-19.05)<1e-12);
  assert.equal(byPart.get("10102201").metadata.wall_thickness.value,1.7);
  assert.equal(byPart.get("10102201").metadata.developed_length.value,145);
  assert.equal(byPart.get("10102202").metadata.outer_diameter.value,15.875);
  assert.equal(byPart.get("10102202").metadata.wall_thickness.value,0.9);
  assert.ok(Math.abs(byPart.get("10102217").metadata.outer_diameter.value-9.525)<1e-12);
  assert.equal(byPart.get("10102473").metadata.developed_length.value,1250.4);
  assert.equal(byPart.get("10100407").metadata.developed_length.value,37);
  assert.ok(Math.abs(byPart.get("10141451").metadata.outer_diameter.value-19.05)<1e-12);
  assert.equal(byPart.get("10141451").metadata.wall_thickness.value,1.7);
  assert.equal(byPart.get("10141451").metadata.developed_length.value,1018.6);
  assert.equal(
    byPart.get("10141451").source_evidence.part_number_method,
    "exact_object_label_prefix"
  );
  assert.equal(
    byPart.get("10141451").source_evidence.source_record_kind,
    "object"
  );
});

test("DWFx copper recognizer excludes copper fittings and misleading non-copper copies",()=>{
  const result=extractCopperTubeMetadataFromContentXml(xml,{source_file:"80004806.dwfx"});
  const parts=new Set(result.tubes.map((tube)=>tube.part_number));

  assert.equal(parts.has("10000613"),false);
  assert.equal(parts.has("10100719"),false);
});

test("DWFx copper metadata remains editable-evidence only and cannot claim production readiness",()=>{
  const result=extractCopperTubeMetadataFromContentXml(xml,{source_file:"80004806.dwfx"});

  assert.equal(result.recognition_status.metadata_only,true);
  assert.equal(result.recognition_status.production_ready,false);
  assert.match(result.recognition_status.note,/W3D geometry remains authoritative/i);
  for(const tube of result.tubes){
    assert.equal(tube.metadata.outer_diameter.truth_category,"source");
    assert.equal(tube.metadata.outer_diameter.confidence,1);
  }
});

test("DWFx copper recognizer does not override an explicit mismatching Object Part Number with its label",()=>{
  const source='<dwf:Content xmlns:dwf="urn:dwf"><dwf:Object id="route-copy" label="10141451/ - Tube, Copper, on length 3/4&quot; x 1,7mm:1"><dwf:Property name="Part Number" value="10102473" category="Design Tracking Properties"/><dwf:Property name="Description" value="Copper tube 3_4inch x 1,7" category="Design Tracking Properties"/><dwf:Property name="Material" value="Copper" category="Physical"/><dwf:Property name="Title" value="Tube, Copper, on length 3/4&quot; x 1,7mm" category="Summary Information"/><dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/><dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/><dwf:Property name="Length" value="1018,6 mm" category="User Defined Properties"/></dwf:Object></dwf:Content>';
  const result=extractCopperTubeMetadataFromContentXml(source);
  assert.equal(result.status,"blocked");
  assert.equal(result.tubes.length,0);
});

test("DWFx copper recognizer accepts real 10134724 Object-label fallback metadata",()=>{
  const source='<dwf:Content xmlns:dwf="urn:dwf"><dwf:Object id="PyRYbsi_5UmTo_7y68W23g" label="10134724/A - Tube, Copper, 3/8&quot; x 0,76mm:1" entityRef="PiRYbsi_5UmTo_7y68W23g"><dwf:Property name="Description" value="Tube, Copper 3_8inch x 0,76" category="Design Tracking Properties"/><dwf:Property name="Material" value="Copper" category="Physical"/><dwf:Property name="Revision Number" value="A" category="Summary Information"/><dwf:Property name="Title" value="Tube, Copper, 3/8&quot; x 0,76mm" category="Summary Information"/><dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/><dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/><dwf:Property name="Length" value="487,7 mm" category="User Defined Properties"/><dwf:Property name="OD" value="9,5 mm" category="User Defined Properties"/><dwf:Property name="SN" value="1,0 mm" category="User Defined Properties"/></dwf:Object></dwf:Content>';
  const result=extractCopperTubeMetadataFromContentXml(source,{source_file:"80004806.dwfx"});
  assert.equal(result.status,"exact");
  assert.equal(result.tubes.length,1);
  const tube=result.tubes[0];
  assert.equal(tube.part_number,"10134724");
  assert.ok(Math.abs(tube.metadata.outer_diameter.value-9.525)<1e-12);
  assert.equal(tube.metadata.wall_thickness.value,0.76);
  assert.equal(tube.metadata.developed_length.value,487.7);
  assert.equal(tube.revision,"A");
  assert.equal(tube.source_evidence.part_number_method,"exact_object_label_prefix");
  assert.equal(tube.source_evidence.source_record_kind,"object");
});


test("DWFx copper recognizer accepts real 10141455 Object-label fallback metadata",()=>{
  const source='<dwf:Content xmlns:dwf="urn:dwf"><dwf:Object id="3CRYbsi_5UmTo_7y68W23g" label="10141455/ - Tube, Copper, on length, 1/2&quot; x 0,89mm:1" entityRef="2yRYbsi_5UmTo_7y68W23g"><dwf:Property name="Description" value="Tube, Copper, 1_2inch x 0,89mm" category="Design Tracking Properties"/><dwf:Property name="Material" value="Copper" category="Physical"/><dwf:Property name="Revision Number" value="-" category="Summary Information"/><dwf:Property name="Title" value="Tube, Copper, on length, 1/2&quot; x 0,89mm" category="Summary Information"/><dwf:Property name="Art.code manufacturer" value="DIN 1754, 1/2&quot; x 0,89mm" category="User Defined Properties"/><dwf:Property name="Description 1" value="Tube" category="User Defined Properties"/><dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/><dwf:Property name="Length" value="2101,9 mm" category="User Defined Properties"/><dwf:Property name="OD" value="12,7 mm" category="User Defined Properties"/><dwf:Property name="SN" value="1,0 mm" category="User Defined Properties"/></dwf:Object></dwf:Content>';
  const result=extractCopperTubeMetadataFromContentXml(source,{source_file:"80004806.dwfx"});
  assert.equal(result.status,"exact");
  assert.equal(result.tubes.length,1);
  const tube=result.tubes[0];
  assert.equal(tube.part_number,"10141455");
  assert.equal(tube.metadata.outer_diameter.value,12.7);
  assert.equal(tube.metadata.wall_thickness.value,0.89);
  assert.equal(tube.metadata.developed_length.value,2101.9);
  assert.equal(tube.revision,"-");
  assert.equal(tube.source_evidence.part_number_method,"exact_object_label_prefix");
  assert.equal(tube.source_evidence.source_record_kind,"object");
});


test("DWFx copper recognizer excludes real 10000611 reducer even though material is Copper",()=>{
  const source='<dwf:Content xmlns:dwf="urn:dwf"><dwf:Entity id="Yh9Ybsi_5UmTo_7y68W23g" label="10000611.ipt"><dwf:Property name="Description" value="Reducer, male x female" category="Design Tracking Properties"/><dwf:Property name="Part Number" value="10000611" category="Design Tracking Properties"/><dwf:Property name="Material" value="Copper" category="Physical"/><dwf:Property name="Title" value="Reducer, Copper, male x female 7/8&quot; x 3/4&quot;" category="Summary Information"/><dwf:Property name="Description 1" value="Reducer" category="User Defined Properties"/><dwf:Property name="Description 2" value="Copper" category="User Defined Properties"/><dwf:Property name="ND1" value="22,225 mm" category="User Defined Properties"/><dwf:Property name="ND2" value="19,050 mm" category="User Defined Properties"/><dwf:Property name="Type" value="male x female 7/8&quot; x 3/4&quot;" category="User Defined Properties"/></dwf:Entity><dwf:Object id="ciJYbsi_5UmTo_7y68W23g" label="10000611, Reducer, Copper, male x female 7/8&quot; x 3/4&quot;:1" entityRef="Yh9Ybsi_5UmTo_7y68W23g"/><dwf:Object id="MyRYbsi_5UmTo_7y68W23g" label="10000611, Reducer, Copper, male x female 7/8&quot; x 3/4&quot;:1" entityRef="Yh9Ybsi_5UmTo_7y68W23g"/></dwf:Content>';
  const result=extractCopperTubeMetadataFromContentXml(source,{source_file:"80004806.dwfx"});
  assert.equal(result.status,"blocked");
  assert.equal(result.tubes.length,0);
  assert.match(result.issues[0],/No exact copper tube metadata/i);
});
