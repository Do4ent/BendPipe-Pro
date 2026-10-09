import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 950-953: UI attestation layers require canonical shapes and signature types",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestationCanonical\(/);
  assert.match(ui,/dimensionAuditDownloadHistoryAttestationCanonical\(embedded\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryAttestationEmbeddingCanonical\(/);
  assert.match(ui,/dimensionAuditDownloadHistoryAttestationEmbeddingCanonical\(embedded\)/);
});
