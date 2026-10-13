import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 410: manager exposes diagnostics snapshot signature consistency",()=>{
  assert.match(ui,/data-review-diagnostics-snapshot-signature-consistent="'\+\(standaloneManagerReviewDiagnosticsRuntime\.snapshot_signature_consistent\?'1':'0'\)\+'"/);
});
