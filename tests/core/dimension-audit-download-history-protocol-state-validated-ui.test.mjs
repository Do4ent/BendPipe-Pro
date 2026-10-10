import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 618: UI validates protocol state instead of trusting embedded valid flag",()=>{
  const health=ui.match(/function dimensionAuditDownloadHistoryHealth\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(health,/const protocolStateValid=dimensionAuditDownloadHistoryProtocolStateValid\(value\.protocol_state\?\?\{\}\)/);
  assert.match(ui,/data-protocol-state-valid="'\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'1':'0'\)\+'"/);
  assert.match(ui,/protocol '\+\(dimensionAuditDownloadHistoryProtocolStateValid\(auditDownloadHistorySnapshot\.protocol_state\)\?'valid':'invalid'\)/);
});
