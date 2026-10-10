import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 344: domain divergence participates in all review progress diagnostics",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/REVIEW_PROGRESS_DOMAIN_DIVERGENCE/);
  assert.match(fn,/domainReviewProgressDiverged\?"REVIEW_PROGRESS_DOMAIN_DIVERGENCE":null/);
  assert.match(fn,/domain_status:reviewProgressRuntime\.domain_status/);
  assert.match(fn,/domain_consistent:domainReviewProgressConsistent/);
  assert.match(fn,/review_progress_domain_consistent:domainReviewProgressConsistent/);
});
