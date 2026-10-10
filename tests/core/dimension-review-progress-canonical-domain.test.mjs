import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 349: audit uses domain review progress as canonical source",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const reviewProgressRuntime=dimensionReviewProgressRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(fn,/review_progress_source:reviewProgressRuntime\.source/);
  assert.match(fn,/review_progress_model:reviewProgressRuntime\.snapshot/);
  assert.match(fn,/review_progress_signature:reviewProgressRuntime\.signature/);
});
