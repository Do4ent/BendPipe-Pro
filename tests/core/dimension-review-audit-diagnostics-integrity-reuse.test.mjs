import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 417: review audit builds diagnostics integrity once",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewProgressDiagnosticsIntegrity=dimensionReviewProgressDiagnosticsIntegrity\(/);
  assert.match(fn,/const reviewProgressDiagnosticsIntegritySignature=\s*dimensionReviewProgressDiagnosticsIntegritySignature\(reviewProgressDiagnosticsIntegrity\)/);
  assert.match(fn,/review_progress_diagnostics_integrity:reviewProgressDiagnosticsIntegrity/);
  assert.match(fn,/review_progress_diagnostics_integrity_signature:reviewProgressDiagnosticsIntegritySignature/);
});
