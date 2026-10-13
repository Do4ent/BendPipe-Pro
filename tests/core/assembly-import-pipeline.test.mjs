import test from "node:test";
import assert from "node:assert/strict";

import { prepareDwfxAssemblyImport } from "../../src/import/dwfx/assembly-import-pipeline.mjs";

function parts(){
  return [
    {part_number:"10160780",include_library:"?Include Library/34001",outer_diameter_mm:9.53,wall_thickness_mm:0.76,developed_length_mm:776.3},
    {part_number:"10157546",include_library:"?Include Library/46910",outer_diameter_mm:12.7,wall_thickness_mm:0.89,developed_length_mm:1214.6},
    {part_number:"10157555",include_library:"?Include Library/47012",outer_diameter_mm:12.7,wall_thickness_mm:0.89,developed_length_mm:773.6}
  ];
}

test("A20: assembly facade preserves all successful linked tube candidates",()=>{
  const calls=[];
  const result=prepareDwfxAssemblyImport({
    opcode_stream:new Uint8Array(),
    descriptor:{status:"exact"},
    source_file:"sample.dwfx",
    hsf_version:"14.50",
    parts:parts(),
    prepareTube:(args)=>{
      calls.push(args);
      return {
        status:"legacy_tube_candidate",
        stage:"complete",
        tube:{id:"dwfx:"+args.part_number,partNumber:args.part_number}
      };
    }
  });

  assert.equal(result.status,"assembly_candidate");
  assert.equal(result.editable_ready,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.part_count,3);
  assert.equal(result.editable_count,3);
  assert.equal(result.blocked_count,0);
  assert.deepEqual(result.tubes.map((x)=>x.partNumber),["10160780","10157546","10157555"]);
  assert.equal(calls[1].include_library,"?Include Library/46910");
  assert.equal(calls[1].outer_diameter_mm,12.7);
});

test("A20: blocked part remains explicit instead of being dropped from assembly result",()=>{
  const result=prepareDwfxAssemblyImport({
    opcode_stream:new Uint8Array(),
    descriptor:{status:"exact"},
    source_file:"sample.dwfx",
    hsf_version:"14.50",
    parts:parts(),
    prepareTube:(args)=>args.part_number==="10157546"
      ? {status:"blocked",stage:"geometry",blocker:"mesh ambiguous"}
      : {status:"legacy_tube_candidate",stage:"complete",tube:{partNumber:args.part_number}}
  });

  assert.equal(result.status,"partial");
  assert.equal(result.editable_ready,false);
  assert.equal(result.editable_count,2);
  assert.equal(result.blocked_count,1);
  assert.deepEqual(result.blocked_parts,[{
    part_number:"10157546",stage:"geometry",blocker:"mesh ambiguous"
  }]);
  assert.equal(result.results.length,3);
  assert.match(result.blocker,/were not dropped/i);
});

test("A20: duplicate part numbers block assembly linkage before tube preparation",()=>{
  let called=false;
  const duplicate=parts();
  duplicate[2]={...duplicate[2],part_number:"10157546"};
  const result=prepareDwfxAssemblyImport({
    opcode_stream:new Uint8Array(),
    descriptor:{status:"exact"},
    source_file:"sample.dwfx",
    hsf_version:"14.50",
    parts:duplicate,
    prepareTube:()=>{called=true;return {status:"legacy_tube_candidate"};}
  });

  assert.equal(result.status,"blocked");
  assert.equal(result.editable_ready,false);
  assert.deepEqual(result.duplicate_part_numbers,["10157546"]);
  assert.equal(called,false);
});

test("A20: empty assembly cannot masquerade as a successful import",()=>{
  assert.throws(
    ()=>prepareDwfxAssemblyImport({
      opcode_stream:new Uint8Array(),descriptor:{status:"exact"},source_file:"x.dwfx",hsf_version:"14.50",parts:[]
    }),
    /non-empty array/
  );
});
