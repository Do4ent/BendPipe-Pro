import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizeDwfxMetadataRecognition } from "../../src/import/dwfx/metadata-recognition.mjs";
import { buildDwfxAssemblyImportPlan } from "../../src/import/dwfx/assembly-import-plan.mjs";

function read(name){
  return JSON.parse(readFileSync(
    new URL("../reference_parts/cases/dwfx-80003043/"+name,import.meta.url),
    "utf8"
  ));
}

const rawMetadata=read("recognized-metadata.json");
const normalized=normalizeDwfxMetadataRecognition(rawMetadata);
const linkage=read("part-include-linkage-golden.json");

test("A20: real 80003043 metadata and Include Library linkage join all six tubes by part_number",()=>{
  const plan=buildDwfxAssemblyImportPlan({
    metadataRecognition:normalized,
    includeLinkage:linkage
  });

  assert.equal(plan.status,"exact");
  assert.equal(plan.production_ready,false);
  assert.equal(plan.part_count,6);
  assert.equal(plan.linkage_method,"exact_part_number");
  assert.deepEqual(plan.issues,[]);
  assert.deepEqual(
    plan.parts.map((p)=>[p.part_number,p.include_library,p.variation_segment]),
    [
      ["10160780","?Include Library/34001","121137"],
      ["10157546","?Include Library/46910","121191"],
      ["10157555","?Include Library/47012","121197"],
      ["10157683","?Include Library/47033","121199"],
      ["10157549","?Include Library/69646","121271"],
      ["10157552","?Include Library/69667","121273"]
    ]
  );
});

test("A20: real plan carries exact source OD wall and developed length",()=>{
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:linkage});
  const byPart=Object.fromEntries(plan.parts.map((p)=>[p.part_number,p]));

  assert.equal(byPart["10160780"].outer_diameter_mm,9.53);
  assert.equal(byPart["10160780"].wall_thickness_mm,0.76);
  assert.equal(byPart["10160780"].developed_length_mm,776.3);
  assert.equal(byPart["10157683"].outer_diameter_mm,19.05);
  assert.equal(byPart["10157683"].wall_thickness_mm,1.7);
  assert.equal(byPart["10157683"].developed_length_mm,1701);
  assert.equal(byPart["10157549"].quantity_in_assembly,4);
  assert.equal(byPart["10157552"].quantity_in_assembly,3);
});

test("A20: plan never treats historical placeholder LINE rows as geometry input",()=>{
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:linkage});
  for(const part of plan.parts){
    assert.equal(part.decoded_variation_segment,null);
    assert.equal(part.requires_decoded_variation_segment,true);
    assert.equal("rows" in part,false);
  }
});

test("A20: missing exact linkage blocks plan instead of ordinal matching",()=>{
  const missing={...linkage,parts:linkage.parts.slice(1)};
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:missing});
  assert.equal(plan.status,"blocked");
  assert.ok(plan.issues.some((x)=>/10160780/.test(x)));
});

test("A20: extra linkage without metadata is explicit",()=>{
  const extra={
    ...linkage,
    parts:[...linkage.parts,{part_number:"99999999",variation_segment:"1",variation_include:"?Include Library/1"}]
  };
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:extra});
  assert.equal(plan.status,"blocked");
  assert.ok(plan.issues.some((x)=>/99999999/.test(x)));
});

test("A20: duplicate linkage part number blocks before plan creation",()=>{
  const duplicate={...linkage,parts:[...linkage.parts,linkage.parts[0]]};
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:duplicate});
  assert.equal(plan.status,"blocked");
  assert.equal(plan.parts.length,0);
  assert.ok(plan.issues.some((x)=>/duplicate linkage part_number/i.test(x)));
});

test("A20: source-file mismatch blocks metadata/linkage composition",()=>{
  const other={...linkage,source_file:"other.dwfx"};
  const plan=buildDwfxAssemblyImportPlan({metadataRecognition:normalized,includeLinkage:other});
  assert.equal(plan.status,"blocked");
  assert.ok(plan.issues.some((x)=>/source_file mismatch/i.test(x)));
});
