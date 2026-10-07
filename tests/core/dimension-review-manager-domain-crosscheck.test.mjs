import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 345: manager cross-checks review progress against domain model",()=>{
  assert.match(ui,/const domainManagerReviewProgress=domainDimensionReviewProgress\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/reviewProgressDomain\.reviewProgressSignature\(domainManagerReviewProgress\)===reviewReasonProgressSignature/);
  assert.match(ui,/!domainManagerReviewProgressConsistent\?"REVIEW_PROGRESS_DOMAIN_DIVERGENCE":null/);
  assert.match(ui,/domain '\+\(domainManagerReviewProgressConsistent\?'aligned':'diverged'\)/);
});
