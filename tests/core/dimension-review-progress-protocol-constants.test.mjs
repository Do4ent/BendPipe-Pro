import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const domain=fs.readFileSync(path.join(root,"src","domain","measurements","review-progress.mjs"),"utf8");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 360: review progress audit protocol constants come from domain model",()=>{
  assert.match(domain,/export const REVIEW_PROGRESS_AUDIT_ERROR_CODES=freeze\(/);
  assert.match(domain,/REVIEW_PROGRESS_DOMAIN_DIVERGENCE/);
  assert.match(ui,/const reviewProgressSchema=reviewProgressDomain\?\.REVIEW_PROGRESS_SCHEMA\?\?/);
  assert.match(ui,/const reviewProgressDiagnosticsSchema=reviewProgressDomain\?\.REVIEW_PROGRESS_DIAGNOSTICS_SCHEMA\?\?/);
  assert.match(ui,/reviewProgressDomain\?\.REVIEW_PROGRESS_AUDIT_ERROR_CODES/);
  assert.match(ui,/review_progress_schema:reviewProgressSchema/);
  assert.match(ui,/review_progress_diagnostics_schema:reviewProgressDiagnosticsSchema/);
  assert.match(ui,/review_progress_supported_error_codes:reviewProgressSupportedErrorCodes/);
});
