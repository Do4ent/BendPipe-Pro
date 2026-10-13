import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 611: Saved Dimensions exposes audit history protocol state metadata",()=>{
  assert.match(ui,/data-protocol-state-valid="'\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'1':'0'\)\+'"/);
  assert.match(ui,/data-protocol-state-signature="'\+esc\(auditDownloadHistorySnapshot\.protocol_state_signature\?\?'\'\)\+'"/);
  assert.match(ui,/protocol '\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'valid':'invalid'\)/);
});
