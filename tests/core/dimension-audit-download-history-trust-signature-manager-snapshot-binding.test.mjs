import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1134: current trust signature validation reuses one audit snapshot",()=>{
  assert.match(
    ui,
    /currentDimensionAuditDownloadHistoryTrustSignatureValid:\(\)=>\{const snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\);const trust=dimensionAuditDownloadHistoryTrust\(snapshot\);return dimensionAuditDownloadHistoryTrustSignatureValid\(dimensionAuditDownloadHistoryTrustSignature\(trust\),trust,snapshot\);\}/
  );
});
