import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 618: UI validates protocol state instead of trusting embedded valid flag",()=>{
  const gate=/if\(!health\.protocol_state_valid\|\|!health\.protocol_binding_valid\)\{toast\("Audit download history protocol invalid"\);return false;\}/g;
  assert.equal((ui.match(gate)??[]).length,2);
  assert.match(ui,/data-protocol-state-valid="'\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'1':'0'\)\+'"/);
  assert.match(ui,/protocol '\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'valid':'invalid'\)/);
});
