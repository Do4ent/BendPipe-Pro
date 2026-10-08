import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 628: Saved Dimensions exposes audit history protocol binding diagnostics",()=>{
  assert.match(ui,/data-protocol-binding-code="'\+esc\(auditDownloadHistorySnapshot\.protocol_binding\?\.code\?\?'\'\)\+'"/);
  assert.match(ui,/data-protocol-binding-errors="'\+\(auditDownloadHistorySnapshot\.protocol_binding\?\.errors\?\.length\?\?0\)\+'"/);
  assert.match(ui,/data-protocol-binding-signature="'\+esc\(auditDownloadHistorySnapshot\.protocol_binding_signature\?\?'\'\)\+'"/);
  assert.match(ui,/binding '\+\(dimensionAuditDownloadHistoryProtocolBindingValid\(auditDownloadHistorySnapshot\)\?'valid':'invalid'\)\+' '\+esc\(auditDownloadHistorySnapshot\.protocol_binding\?\.code\?\?'\'\)/);
});
