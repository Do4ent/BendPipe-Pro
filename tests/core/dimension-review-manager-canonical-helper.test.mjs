import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 353: manager uses centralized canonical review progress helper",()=>{
  assert.match(ui,/const managerReviewProgressRuntime=dimensionReviewProgressRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const canonicalManagerReviewProgressSignature=managerReviewProgressRuntime\.signature/);
  assert.match(ui,/const canonicalManagerReviewProgressSource=managerReviewProgressRuntime\.source/);
});
