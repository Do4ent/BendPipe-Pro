import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 333: review progress diagnostic metadata is machine-readable",()=>{
  assert.match(ui,/data-review-progress-valid="'\+\(reviewReasonProgressValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-review-diagnostics-valid="'\+\(reviewReasonDiagnosticsValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-review-progress-issues="'\+reviewReasonProgressIssueCount\+'"/);
});
