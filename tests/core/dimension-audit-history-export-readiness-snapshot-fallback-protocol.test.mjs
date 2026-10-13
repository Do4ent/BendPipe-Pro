import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 725: readiness snapshot UI fallback preserves embedded protocol contract",()=>{
  assert.match(ui,/const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  assert.match(ui,/protocol_signature:protocolSignature/);
  assert.match(ui,/protocol_valid:dimensionAuditDownloadHistoryExportReadinessProtocolValid\(protocol\)/);
  assert.match(ui,/protocol_signature_valid:dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(protocolSignature,protocol\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportReadinessProtocolValid\(current\.protocol\)/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(current\.protocol_signature,current\.protocol\)/);
});
