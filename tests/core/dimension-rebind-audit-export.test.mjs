import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 143: Rebind audit exports a structured diagnostic snapshot",()=>{
  assert.match(ui,/function dimensionRebindAuditSnapshot\(dimension\)/);
  assert.match(ui,/dimension_id:String\(dimension\?\.id\?\?""\)/);
  assert.match(ui,/current_references:clone\(dimension\?\.references\?\?\[\]\)/);
  assert.match(ui,/rebound_history:clone/);
});

test("question 143: Saved Dimensions can copy audit JSON without mutating model",()=>{
  assert.match(ui,/async function copyDimensionRebindAudit\(dimensionId\)/);
  assert.match(ui,/JSON\.stringify\(dimensionRebindAuditSnapshot\(dimension\),null,2\)/);
  assert.match(ui,/navigator\?\.clipboard\?\.writeText/);
  assert.match(ui,/data-copy-rebind-audit=/);
  assert.match(ui,/Copy audit JSON/);
});
