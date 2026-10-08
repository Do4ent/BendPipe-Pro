import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 725: readiness snapshot UI fallback preserves embedded protocol contract",()=>{
  const snapshot=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSnapshot\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(snapshot,/const protocol=dimensionAuditDownloadHistoryExportReadinessProtocol\(\)/);
  assert.match(snapshot,/protocol_signature:protocolSignature/);
  assert.match(snapshot,/protocol_valid:dimensionAuditDownloadHistoryExportReadinessProtocolValid\(protocol\)/);
  assert.match(snapshot,/protocol_signature_valid:dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(protocolSignature,protocol\)/);
  const valid=ui.match(/function dimensionAuditDownloadHistoryExportReadinessSnapshotValid\([^)]*\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(valid,/dimensionAuditDownloadHistoryExportReadinessProtocolValid\(current\.protocol\)/);
  assert.match(valid,/dimensionAuditDownloadHistoryExportReadinessProtocolSignatureValid\(current\.protocol_signature,current\.protocol\)/);
});
