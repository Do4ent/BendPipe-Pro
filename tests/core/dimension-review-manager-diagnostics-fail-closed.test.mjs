import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 327: manager diagnostics fail closed on shared model divergence",()=>{
  assert.match(ui,/model_consistent:sharedManagerReviewProgressConsistent/);
  assert.match(ui,/const reviewReasonDiagnosticsValid=managerReviewDiagnosticsModel\.valid/);
  assert.match(ui,/const reviewReasonProgressErrors=managerReviewDiagnosticsModel\.errors/);
});
