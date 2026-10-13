import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 908: UI export-event validator requires canonical string field types",()=>{
  for(const field of ["schema","action","outcome","code","history_snapshot_signature","action_permit_signature","action_permit_snapshot_signature","generated_at","signature"]){
    assert.match(ui,new RegExp("typeof value\\."+field+"===\\\"string\\\""));
  }
  assert.match(ui,/value\.error===null\|\|typeof value\.error==="string"/);
});
