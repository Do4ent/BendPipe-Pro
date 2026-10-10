import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 413: manager exposes diagnostics runtime validity",()=>{
  assert.match(ui,/data-review-diagnostics-runtime-valid="'\+\(standaloneManagerReviewDiagnosticsRuntime\.runtime_valid\?'1':'0'\)\+'"/);
  assert.match(ui,/diag-runtime '\+\(standaloneManagerReviewDiagnosticsRuntime\.runtime_valid\?'valid':'invalid'\)/);
});
