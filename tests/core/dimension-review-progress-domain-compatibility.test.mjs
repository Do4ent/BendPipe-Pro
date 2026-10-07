import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 381: review progress domain compatibility validates API and schemas",()=>{
  const fn=ui.match(/function reviewProgressDomainCompatibility\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/typeof reviewProgressDomain\.buildReviewProgress==="function"/);
  assert.match(fn,/typeof reviewProgressDomain\.reviewProgressSignature==="function"/);
  assert.match(fn,/typeof reviewProgressDomain\.reviewProgressSnapshot==="function"/);
  assert.match(fn,/REVIEW_PROGRESS_SCHEMA==="TubeBender\.DimensionReviewProgress\.v1"/);
  assert.match(fn,/REVIEW_PROGRESS_SNAPSHOT_SCHEMA==="TubeBender\.DimensionReviewProgressSnapshot\.v1"/);
  assert.match(fn,/REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA==="TubeBender\.DimensionReviewProgressDiagnostics\.v1"/);
  assert.match(fn,/status:!available\?"unavailable":compatible\?"compatible":"incompatible"/);
});
