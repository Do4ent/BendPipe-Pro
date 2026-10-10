import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 170: Saved Dimensions exposes reference-level Fitted evidence",()=>{
  assert.match(ui,/function dimensionFittedEvidenceHtml\(dimension\)/);
  assert.match(ui,/geometry_status\?\?""\)==="Fitted"/);
  assert.match(ui,/data-dim-fitted-evidence=/);
  assert.match(ui,/Fitted evidence · /);
  assert.match(ui,/confidence /);
  assert.match(ui,/Evidence: /);
});

test("question 170: Fitted evidence is rendered alongside provenance and Rebind audit",()=>{
  assert.match(ui,/dimensionFittedEvidenceHtml\(dimension\)\+\s*dimensionRebindAuditHtml\(dimension\)/);
});
