import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 215: Dimension audit snapshots record project read-only state",()=>{
  assert.match(ui,/function dimensionAuditProjectContext\(\)/);
  assert.match(ui,/project_readonly:readonly\(\)/);
  assert.match(ui,/function dimensionRebindAuditSnapshot\(dimension,reviewContextState=null\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionAudit\.v1"/);
  assert.match(ui,/schema:"TubeBender\.DimensionAuditView\.v1"/);
});
