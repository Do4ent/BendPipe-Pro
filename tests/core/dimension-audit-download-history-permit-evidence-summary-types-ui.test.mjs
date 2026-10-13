import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 924: UI permit-evidence summary validator requires canonical types",()=>{
  for(const field of ["total","present","absent","valid","invalid","copy","download"]){
    assert.match(ui,new RegExp("Number\\.isInteger\\(value\\."+field+"\\)&&value\\."+field+"===expected\\."+field));
  }
  assert.match(ui,/typeof value\.latest_present==="boolean"/);
  assert.match(ui,/typeof value\.latest_valid==="boolean"/);
  assert.match(ui,/value\.latest_action===null\|\|typeof value\.latest_action==="string"/);
});
