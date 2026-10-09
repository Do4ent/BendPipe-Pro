import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 910: UI export-event summary validator requires canonical string field types",()=>{
  for(const field of ["schema","latest_signature","latest_outcome","latest_action","latest_code","signature"]){
    assert.match(ui,new RegExp("typeof value\\."+field+"===\\\"string\\\""));
  }
});
