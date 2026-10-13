import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 401: review audit uses diagnostics runtime state as canonical model",()=>{
  const fn=ui.match(/function reviewQueueDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/const standaloneReviewDiagnosticsRuntime=dimensionReviewProgressDiagnosticsRuntimeState\(items,selectedDimensionAuditIds\(\)\)/);
  assert.match(fn,/const reviewProgressDiagnosticsModel=standaloneReviewDiagnosticsRuntime\.diagnostics/);
  assert.match(fn,/const reviewProgressDiagnosticsSignature=standaloneReviewDiagnosticsRuntime\.signature/);
});
