import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 689: audit history export readiness exposes reason codes",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadiness/);
  assert.match(ui,/code:"EMPTY"/);
  assert.match(ui,/code:"VERIFICATION_FAILED"/);
  assert.match(ui,/code:"UNTRUSTED"/);
  assert.match(ui,/code:"INVALID_PROVENANCE"/);
  assert.match(ui,/code:"READY"/);
  assert.match(ui,/data-history-export-code="'\+esc\(auditDownloadHistoryExportReadinessSnapshot\.code\)\+'"/);
});
