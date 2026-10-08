import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 446: canonical Dimension review context model exists",()=>{
  const fn=ui.match(/function dimensionReviewContext\(dimension\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionReviewContext\.v1"/);
  assert.match(fn,/selected_in_audit:selectedInAudit/);
  assert.match(fn,/action_required:health==="pending"\|\|health==="diagnostics-error"/);
  assert.match(fn,/complete_percent:completePercent/);
  assert.match(fn,/reason_coverage:reasonCoverage/);
  assert.match(fn,/reason_progress:reasonProgress/);
  assert.match(fn,/blockers/);
  assert.match(fn,/diagnostics_runtime:clone\(diagnosticsRuntime\)/);
  assert.match(fn,/diagnostics_integrity:clone\(diagnosticsIntegrityState\)/);
});
