import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 216: Dimension audit exports include project provenance and generation time",()=>{
  assert.match(ui,/function dimensionAuditProjectContext\(\)/);
  assert.match(ui,/project_id:String\(p\?\.id\?\?p\?\.project_id\?\?""\)/);
  assert.match(ui,/project_name:String\(p\?\.name\?\?p\?\.project_name\?\?""\)/);
  assert.match(ui,/project_readonly:readonly\(\)/);
  assert.match(ui,/generated_at:new Date\(\)\.toISOString\(\)/);
});

test("question 216: individual and project audit snapshots reuse the same provenance helper",()=>{
  assert.match(ui,/\.\.\.dimensionAuditProjectContext\(\),\n      dimension_id:/);
  assert.match(ui,/schema:"TubeBender\.DimensionAudit\.v1",\n      \.\.\.dimensionAuditProjectContext\(\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionAuditView\.v1",\n      \.\.\.dimensionAuditProjectContext\(\)/);
});
