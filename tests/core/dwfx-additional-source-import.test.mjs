import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {importSelectedDwfxFile} from "../../src/import/dwfx/browser-file-import.mjs";

for(const [id,editableCount,blockedCount] of [["80005311",6,3],["80005313",0,9]]){
  test(`real DWFx ${id} decodes linked evidence without releasing unresolved assembly parts`,async()=>{
    const directory=new URL(`../reference_parts/cases/dwfx-${id}/`,import.meta.url);
    const metadata=JSON.parse(fs.readFileSync(new URL("source.json",directory),"utf8"));
    const bytes=fs.readFileSync(new URL("source.dwfx",directory));
    const digest=()=>createHash("sha256").update(bytes).digest("hex");
    assert.equal(digest(),metadata.source.sha256);
    const file={name:metadata.source.original_filename,arrayBuffer:async()=>bytes};
    for(const bbox of [null,{x:1000,y:1000,z:1000}]){
      // The second input is a caller-supplied test box, not a source dimension.
      // Supplying corpus dimensions must not bypass unresolved tube recognition.
      const result=await importSelectedDwfxFile(file,{project_id:`reference-${id}`,bbox});
      assert.equal(result.raw.status,"exact");
      assert.equal(result.raw.tube_count,9);
      assert.equal(result.raw.graphics_links.length,9);
      assert.equal(result.hsf_linkage.status,"exact");
      assert.equal(result.hsf_linkage.part_count,9);
      assert.equal(result.hsf_linkage.linked_count,9);
      assert.equal(result.hsf_linkage.blocked_count,0);
      assert.equal(result.status,"blocked");
      assert.equal(result.editable_ready,false);
      assert.equal(result.production_ready,false);
      assert.equal(result.package,null);
      const assembly=result.project_import.assembly;
      assert.equal(assembly.part_count,9);
      assert.equal(assembly.results.length,9); // Do not silently drop failed parts.
      assert.equal(assembly.editable_count,editableCount);
      assert.equal(assembly.blocked_count,blockedCount);
      for(const part of assembly.results){
        assert.equal(part.production_ready,false);
        if(part.status==="blocked"){
          assert.ok(part.blocker);
          assert.ok(["geometry","legacy_mapping"].includes(part.stage));
          assert.ok(!part.editable_ready);
          if(part.stage==="geometry")assert.equal(part.geometry.canonical_ready,false);
        }else{
          const canonical=part.canonicalization.canonical_geometry;
          assert.equal(part.canonicalization.production_ready,false);
          assert.equal(canonical.length_unit,"mm");
          assert.ok(canonical.source_refs.includes("dwfx:"+metadata.source.original_filename));
          for(const primitive of canonical.primitives){
            for(const evidence of Object.values(primitive)){
              if(evidence&&typeof evidence==="object"&&"truth_category" in evidence){
                assert.notEqual(evidence.truth_category,"compensated");
                assert.ok(evidence.source.length>0);
              }
            }
          }
        }
      }
      assert.equal(digest(),metadata.source.sha256);
    }
  });
}
