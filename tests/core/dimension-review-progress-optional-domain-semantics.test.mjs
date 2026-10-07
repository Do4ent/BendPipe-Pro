import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 377: unavailable review domain is not treated as divergence",()=>{
  const audit=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(audit,/const reviewProgressRuntime=dimensionReviewProgressRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(audit,/const domainReviewProgressAvailable=reviewProgressRuntime\.domain_available/);
  assert.match(audit,/const domainReviewProgressConsistent=reviewProgressRuntime\.domain_consistent/);
  assert.match(audit,/const domainReviewProgressDiverged=domainReviewProgressComparable&&domainReviewProgressConsistent===false/);
  assert.match(audit,/review_progress_domain_available:domainReviewProgressAvailable/);
  assert.match(audit,/domainReviewProgressDiverged\?"REVIEW_PROGRESS_DOMAIN_DIVERGENCE":null/);
  assert.match(ui,/domainManagerReviewProgressAvailable\?'1':'0'/);
  assert.match(ui,/!domainManagerReviewProgressComparable\?'na':domainManagerReviewProgressConsistent\?'1':'0'/);
  assert.match(ui,/!domainManagerReviewProgressAvailable\?'unavailable':!domainManagerReviewProgressCompatible\?'incompatible':domainManagerReviewProgressConsistent\?'aligned':'diverged'/);
});
