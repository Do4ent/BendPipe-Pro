import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 219: Dimension audit download filenames include generated timestamp",()=>{
  assert.match(ui,/function dimensionAuditFilenameStamp\(value=new Date\(\)\)/);
  assert.match(ui,/value\.toISOString\(\)\.replace\(\/\[:\.\]\/g,"-"\)/);
  assert.match(ui,/dimension-audit-view-"\+filterName\+"-"\+snapshot\.dimension_count\+"-"\+dimensionAuditFilenameStamp/);
  assert.match(ui,/dimension-audit-"\+dimensionAuditFilenameStamp/);
});

test("question 219: individual Dimension audit download also uses generated_at timestamp",()=>{
  assert.match(ui,/dimension-audit-"\+dimensionAuditFilenameStamp\(new Date\(snapshot\.generated_at\)\)/);
});
