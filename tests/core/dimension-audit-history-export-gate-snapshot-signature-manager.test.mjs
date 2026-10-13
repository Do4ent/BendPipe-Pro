import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 746: manager exposes history export gate snapshot signature metadata",()=>{
  assert.match(ui,/data-history-export-gate-snapshot-signature="'\+esc\(auditDownloadHistoryExportGateSnapshot\.snapshot_signature\?\?''\)\+'"/);
  assert.match(ui,/data-history-export-gate-snapshot-signature-valid="'\+\(auditDownloadHistoryExportGateSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
