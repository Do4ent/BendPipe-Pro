import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 409: review audit persists diagnostics snapshot signature consistency",()=>{
  assert.match(ui,/review_progress_diagnostics_snapshot_signature_consistent:standaloneReviewDiagnosticsRuntime\.snapshot_signature_consistent/);
});
