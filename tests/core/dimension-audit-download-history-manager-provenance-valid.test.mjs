import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 686: Saved Dimensions exposes audit history provenance validity",()=>{
  assert.match(ui,/const auditDownloadHistoryProvenanceValid=dimensionAuditDownloadAttemptHistorySnapshotProvenanceValid\(auditDownloadHistoryProvenance,auditDownloadHistorySnapshot\)/);
  assert.match(ui,/data-history-provenance-valid="'\+\(auditDownloadHistoryProvenanceValid\?'1':'0'\)\+'"/);
  assert.match(ui,/provenance '\+\(auditDownloadHistoryProvenanceValid\?'valid':'invalid'\)/);
});
