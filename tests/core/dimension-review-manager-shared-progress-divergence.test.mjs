import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 325: manager reports shared review progress divergence",()=>{
  assert.match(ui,/!sharedManagerReviewProgressConsistent\?"REVIEW_PROGRESS_MODEL_DIVERGENCE":null/);
  assert.match(ui,/const reviewReasonSupportedErrorCodes=reviewProgressAuditErrorCodes\(\)/);
});
