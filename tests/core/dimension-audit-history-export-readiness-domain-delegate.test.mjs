import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 699: UI delegates history export readiness to audit-download domain",()=>{
  const fn=ui.match(/function dimensionAuditDownloadHistoryExportReadiness\(snapshot=dimensionAuditDownloadAttemptHistoryAuditSnapshot\(\)\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessState/);
  assert.match(fn,/verification_valid:verification\.valid/);
  assert.match(fn,/trusted:trust\.trusted/);
  assert.match(fn,/provenance_valid:provenanceValid/);
  assert.match(fn,/history_snapshot_signature:String\(value\.snapshot_signature\?\?""\)/);
  assert.match(fn,/provenance_signature:provenanceSignature/);
});
