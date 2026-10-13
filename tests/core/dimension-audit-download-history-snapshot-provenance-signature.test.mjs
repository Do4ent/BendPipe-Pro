import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 683: audit history snapshot provenance has deterministic signature",()=>{
  assert.match(ui,/function dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature\(provenance=dimensionAuditDownloadAttemptHistorySnapshotProvenance\(\)\)/);
  assert.match(ui,/source:String\(value\.source\?\?""\)/);
  assert.match(ui,/snapshot_signature:String\(value\.snapshot_signature\?\?""\)/);
  assert.match(ui,/trusted:value\.trusted===true/);
  assert.match(ui,/currentDimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature:\(\)=>dimensionAuditDownloadAttemptHistorySnapshotProvenanceSignature\(\)/);
});
