import test from "node:test";
import assert from "node:assert/strict";

import {
  extractBentTubeMetadataFromContentXml,
  parseTubeDescription
} from "../../src/import/dwfx/raw-metadata-intake.mjs";

function entity({
  id,
  part,
  description,
  revision="B",
  material="Copper",
  length,
  displayedOd,
  displayedSn
}){
  return `<dwf:Entity xmlns:dwf="urn:dwf" id="${id}" label="fixture">
    <dwf:Property name="Description" value="${description}" category="Design Tracking Properties"/>
    <dwf:Property name="Part Number" value="${part}" category="Design Tracking Properties"/>
    <dwf:Property name="Revision Number" value="${revision}" category="Summary Information"/>
    <dwf:Property name="Material" value="${material}" category="Physical"/>
    <dwf:Property name="Length" value="${length}" category="User Defined Properties"/>
    <dwf:Property name="OD" value="${displayedOd}" category="User Defined Properties"/>
    <dwf:Property name="SN" value="${displayedSn}" category="User Defined Properties"/>
  </dwf:Entity>`;
}

test("A20: 3/8 source description yields exact inch conversion, not rounded OD/SN fields",()=>{
  const xml=entity({
    id:"e1",
    part:"10160780",
    description:"Bended tube, Copper EN 12735-1, 3/8&quot;x0,76mm",
    revision:"-",
    length:"776,3 mm",
    displayedOd:"9,5 mm",
    displayedSn:"1,0 mm"
  });
  const result=extractBentTubeMetadataFromContentXml(xml,{source_file:"sample.dwfx"});
  const tube=result.tubes[0];

  assert.equal(result.status,"exact");
  assert.ok(Math.abs(tube.metadata.outer_diameter.value-9.525)<1e-12);
  assert.equal(tube.metadata.wall_thickness.value,0.76);
  assert.equal(tube.metadata.developed_length.value,776.3);
  assert.equal(tube.source_evidence.displayed_od_property,"9,5 mm");
  assert.equal(tube.source_evidence.displayed_wall_property,"1,0 mm");
  assert.equal(tube.metadata.outer_diameter.method,"explicit_imperial_fraction_to_mm");
  assert.equal(tube.metadata.outer_diameter.truth_category,"source");
});

test("A20: 1/2 and 3/4 descriptions normalize exactly to 12.7 and 19.05 mm",()=>{
  for(const [notation,expected,wall] of [
    ['1/2&quot;x0,89mm',12.7,0.89],
    ['3/4&quot;x1,7mm',19.05,1.7]
  ]){
    const parsed=parseTubeDescription("Bended tube, Copper EN 12735-1, "+notation);
    assert.ok(parsed);
    assert.ok(Math.abs(parsed.outer_diameter_mm-expected)<1e-12);
    assert.equal(parsed.wall_thickness_mm,wall);
  }
});

test("A20: source length property accepts decimal comma deterministically",()=>{
  const xml=entity({
    id:"e2",
    part:"10157546",
    description:"Bended tube, Copper EN 12735-1, 1/2&quot;x0,89mm",
    length:"1214,6 mm",
    displayedOd:"12,7 mm",
    displayedSn:"1,0 mm"
  });
  const result=extractBentTubeMetadataFromContentXml(xml);
  assert.equal(result.tubes[0].metadata.developed_length.value,1214.6);
});

test("A20: non-bent-tube entities are ignored instead of becoming geometry metadata",()=>{
  const xml=entity({
    id:"e3",
    part:"12345678",
    description:"Straight fitting, Copper, 1/2&quot;x0,89mm",
    length:"100 mm",
    displayedOd:"12,7 mm",
    displayedSn:"1,0 mm"
  });
  const result=extractBentTubeMetadataFromContentXml(xml);
  assert.equal(result.status,"blocked");
  assert.equal(result.tubes.length,0);
  assert.match(result.issues[0],/No exact bent-tube metadata/i);
});

test("A20: duplicate bent-tube entities for same part remain ambiguous",()=>{
  const a=entity({
    id:"a",part:"10157549",
    description:"Bended tube, Copper EN 12735-1, 3/8&quot;x0,76mm",
    length:"512,3 mm",displayedOd:"9,5 mm",displayedSn:"1,0 mm"
  });
  const b=entity({
    id:"b",part:"10157549",
    description:"Bended tube, Copper EN 12735-1, 3/8&quot;x0,76mm",
    length:"512,3 mm",displayedOd:"9,5 mm",displayedSn:"1,0 mm"
  });
  const result=extractBentTubeMetadataFromContentXml(a+b);

  assert.equal(result.status,"blocked");
  assert.equal(result.tubes.length,0);
  assert.match(result.issues[0],/duplicate bent-tube entity/i);
});

test("A20: metric source description is supported without imperial inference",()=>{
  const parsed=parseTubeDescription("Bended tube, Copper, 16 mm x 1,0 mm");
  assert.ok(parsed);
  assert.equal(parsed.outer_diameter_mm,16);
  assert.equal(parsed.wall_thickness_mm,1);
  assert.equal(parsed.diameter_method,"explicit_metric_dimensions");
});
