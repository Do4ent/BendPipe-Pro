import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 517: UI delegates audit download protocol signature with fallback",()=>{
  assert.match(ui,/function dimensionAuditDownloadProtocolSignature\(state\)/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadProtocolSignature/);
  assert.match(ui,/return auditDownloadDomain\.dimensionAuditDownloadProtocolSignature\(value\)/);
  assert.match(ui,/protocol_signature:dimensionAuditDownloadProtocolSignature\(protocolState\?\?undefined\)/);
});
