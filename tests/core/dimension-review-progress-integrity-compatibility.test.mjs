import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 420: review progress compatibility requires diagnostics integrity API",()=>{
  const fn=ui.match(/function reviewProgressDomainCompatibility\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/typeof reviewProgressDomain\.reviewProgressDiagnosticsIntegrity==="function"/);
  assert.match(fn,/typeof reviewProgressDomain\.reviewProgressDiagnosticsIntegritySignature==="function"/);
  assert.match(fn,/REVIEW_PROGRESS_DIAGNOSTICS_INTEGRITY_SCHEMA==="TubeBender\.DimensionReviewProgressDiagnosticsIntegrity\.v1"/);
});
