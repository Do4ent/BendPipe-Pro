import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 386: review diagnostics and protocol codes are compatibility-gated",()=>{
  const codes=ui.match(/function reviewProgressAuditErrorCodes\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  const diagnostics=ui.match(/function dimensionReviewProgressDiagnostics\(input=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(codes,/reviewProgressDomainCompatibility\(\)\.compatible&&Array\.isArray\(reviewProgressDomain\?\.REVIEW_PROGRESS_AUDIT_ERROR_CODES\)/);
  assert.match(diagnostics,/reviewProgressDomainCompatibility\(\)\.compatible&&typeof reviewProgressDomain\?\.buildReviewProgressDiagnostics==="function"/);
  assert.match(diagnostics,/return reviewProgressDomain\.buildReviewProgressDiagnostics\(input\)/);
  assert.match(diagnostics,/REVIEW_PROGRESS_DOMAIN_INCOMPATIBLE/);
  assert.match(diagnostics,/REVIEW_PROGRESS_DOMAIN_DIVERGENCE/);
});
