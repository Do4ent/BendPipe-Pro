import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 217: Dimension audit JSON can be downloaded as files",()=>{
  assert.match(ui,/function downloadDimensionAuditJson\(filename,snapshot\)/);
  assert.match(ui,/new Blob\(\[JSON\.stringify\(snapshot,null,2\)\],\{type:"application\/json"\}\)/);
  assert.match(ui,/URL\.createObjectURL\(blob\)/);
  assert.match(ui,/link\.download=String\(filename\|\|"dimension-audit\.json"\)/);
  assert.match(ui,/URL\.revokeObjectURL\(url\)/);
});

test("question 217: Saved Dimensions exposes visible and full audit downloads",()=>{
  assert.match(ui,/function downloadVisibleDimensionAudits\(\)/);
  assert.match(ui,/function downloadAllDimensionAudits\(\)/);
  assert.match(ui,/data-download-visible-dimension-audits/);
  assert.match(ui,/data-download-all-dimension-audits/);
  assert.match(ui,/Download visible audit JSON/);
  assert.match(ui,/Download all audit JSON/);
});
