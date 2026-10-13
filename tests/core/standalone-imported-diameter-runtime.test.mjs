import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const output=path.join(root,"dist","TubeBender_CAD_VC207R7_M1_Standalone.html");

function ensureBuild(){
  execFileSync(process.execPath,["scripts/build-standalone.mjs"],{cwd:root});
  return fs.readFileSync(output,"utf8");
}

function diameterHelpers(){
  const html=ensureBuild();
  const start=html.indexOf("function importedDiameterIndexFromEvidence(");
  const end=html.indexOf("\nfunction starterPipeRows()",start);
  assert.ok(start>=0,"importedDiameterIndexFromEvidence missing");
  assert.ok(end>start,"diameter helper boundary missing");
  const source=html.slice(start,end);
  const context={
    pipeDb:[
      {mm:6.35,inch:"1/4″"},
      {mm:9.53,inch:"3/8″"},
      {mm:12.7,inch:"1/2″"},
      {mm:15,inch:"—"},
      {mm:15.88,inch:"5/8″"},
      {mm:19.05,inch:"3/4″"},
      {mm:22,inch:"7/8″"}
    ],
    Number,
    Array,
    Math
  };
  return vm.runInNewContext(
    source+"\n({importedDiameterIndexFromEvidence,validToolDiameterIndex})",
    context,
    {filename:"standalone-imported-diameter-runtime.js"}
  );
}

function importedTube({tableMm,derivedMm,diameterIndex=0}){
  return {
    diameterIndex,
    toolingId:null,
    importEvidence:{
      source:{format:"DWFx"},
      diameterNormalization:{
        table_outer_diameter_mm:tableMm
      },
      recognitionSummary:{
        dimension_reconciliation:{
          derived_outer_diameter_mm:derivedMm
        }
      }
    },
    importValidation:{productionBlocked:true}
  };
}

test("A34: bad legacy index 0 is repaired from imported diameter evidence",()=>{
  const api=diameterHelpers();

  assert.equal(
    api.importedDiameterIndexFromEvidence(
      importedTube({tableMm:19.05,derivedMm:19.05000016,diameterIndex:0})
    ),
    5
  );
  assert.equal(
    api.importedDiameterIndexFromEvidence(
      importedTube({tableMm:15,derivedMm:14.83499926,diameterIndex:0})
    ),
    3
  );
  assert.equal(
    api.importedDiameterIndexFromEvidence(
      importedTube({tableMm:9.53,derivedMm:9.70000023,diameterIndex:0})
    ),
    1
  );
});

test("A34: null diameter index never silently becomes 1/4 inch",()=>{
  const api=diameterHelpers();
  assert.equal(api.validToolDiameterIndex(null),6);
  assert.equal(api.validToolDiameterIndex(undefined),6);
  assert.equal(api.validToolDiameterIndex(""),6);
});

test("A34: exact imported table diameter wins over stale diameterIndex",()=>{
  const api=diameterHelpers();
  const tube=importedTube({
    tableMm:15.88,
    derivedMm:15.875,
    diameterIndex:0
  });
  assert.equal(api.importedDiameterIndexFromEvidence(tube),4);
});
