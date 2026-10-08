import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 820: attempt recorder accepts and forwards permit evidence",()=>{
  assert.match(ui,/function recordDimensionAuditDownloadAttempt\(status,preflight,error=null,permitEvidence=null\)/);
  assert.match(ui,/const evidence=permitEvidence\?\?null/);
  assert.match(ui,/export_action:String\(evidence\.export_action\?\?""\)/);
  assert.match(ui,/action_permit_signature:String\(evidence\.action_permit_signature\?\?""\)/);
  assert.match(ui,/action_permit_snapshot_signature:String\(evidence\.action_permit_snapshot_signature\?\?""\)/);
  assert.match(ui,/function downloadDimensionAuditJson\(filename,snapshot,permitEvidence=null\)/);
  assert.match(ui,/recordDimensionAuditDownloadAttempt\("downloaded",preflight,null,permitEvidence\)/);
});
