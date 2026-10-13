import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 378: unified review progress runtime state is exposed for QA",()=>{
  assert.match(ui,/function dimensionReviewProgressRuntimeState\(items=savedDimensions\(\),selectedIds=selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/source:canonical\.source/);
  assert.match(ui,/domain_available:compatibility\.available/);
  assert.match(ui,/domain_compatible:compatibility\.compatible/);
  assert.match(ui,/domain_comparable:parity\.available/);
  assert.match(ui,/domain_consistent:parity\.consistent/);
  assert.match(ui,/fallback_signature:parity\.fallback_signature/);
  assert.match(ui,/domain_signature:parity\.domain_signature/);
  assert.match(ui,/currentReviewProgressRuntimeState:\(\)=>dimensionReviewProgressRuntimeState\(\)/);
});
