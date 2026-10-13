import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","review-progress.mjs"),"utf8");

test("question 384: incompatible review domain is diagnosed without disabling fallback",()=>{
  assert.match(domain,/REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE/);
  const audit=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(audit,/const domainReviewProgressIncompatible=domainReviewProgressAvailable&&!domainReviewProgressCompatible/);
  assert.match(audit,/domainReviewProgressIncompatible\?"REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE":null/);
  assert.match(audit,/review_progress_domain_compatible:domainReviewProgressCompatible/);
  assert.match(audit,/review_progress_domain_status:reviewProgressRuntime\.domain_status/);
  assert.match(ui,/data-review-progress-domain-compatible="'\+\(domainManagerReviewProgressCompatible\?'1':'0'\)\+'"/);
  assert.match(ui,/!domainManagerReviewProgressCompatible\?'incompatible'/);
});
