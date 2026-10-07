import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 310: Saved Dimensions shows all review progress errors",()=>{
  assert.match(ui,/const reviewReasonProgressErrors=managerReviewDiagnosticsModel\.errors/);
  assert.match(ui,/const reviewReasonProgressError=managerReviewDiagnosticsModel\.primary_error/);
  assert.match(ui,/reviewReasonProgressErrors\.join\(', '\)/);
});
