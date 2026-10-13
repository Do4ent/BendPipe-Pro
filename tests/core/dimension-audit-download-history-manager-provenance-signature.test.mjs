import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 684: Saved Dimensions exposes audit history provenance signature",()=>{
  assert.match(ui,/const auditDownloadHistoryProvenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance\(auditDownloadHistorySnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryProvenanceSignature=dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature\(auditDownloadHistoryProvenance\)/);
  assert.match(ui,/data-history-provenance-signature="'\+esc\(auditDownloadHistoryProvenanceSignature\)\+'"/);
});
