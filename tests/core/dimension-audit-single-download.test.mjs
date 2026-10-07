import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 218: individual Dimension audit can be downloaded",()=>{
  assert.match(ui,/function downloadDimensionRebindAudit\(dimensionId\)/);
  assert.match(ui,/dimensionRebindAuditSnapshot\(dimension\)/);
  assert.match(ui,/dimension-audit\.json/);
  assert.match(ui,/data-download-rebind-audit=/);
  assert.match(ui,/Download audit JSON/);
});
