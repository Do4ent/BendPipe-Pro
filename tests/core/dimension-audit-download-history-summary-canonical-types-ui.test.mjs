import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 926: UI attempt-history summary validator requires canonical types",()=>{
  assert.match(ui,/typeof value\.schema==="string"/);
  assert.match(ui,/typeof value\.latest_signature==="string"/);
  for(const field of ["total","blocked","downloaded","failed"]){
    assert.match(ui,new RegExp("Number\\.isInteger\\(value\\."+field+"\\)"));
  }
  assert.match(ui,/value\.latest_signature===expectedLatest/);
});
