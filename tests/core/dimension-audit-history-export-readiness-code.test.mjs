import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 689: audit history export readiness exposes reason codes",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadiness\(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/code:"EMPTY"/);
  assert.match(fn,/code:"UNTRUSTED"/);
  assert.match(fn,/code:"INVALID_PROVENANCE"/);
  assert.match(fn,/code:"READY"/);
  assert.match(ui,/data-history-export-code="'\+esc\(auditDownloadHistoryExportReadiness\.code\)\+'"/);
});
