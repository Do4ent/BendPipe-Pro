import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 946-949: UI verification layers require canonical shapes and signature types",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryVerificationCanonical\(/);
  assert.match(ui,/dimensionAuditDownloadHistoryVerificationCanonical\(embedded\)/);
  assert.match(ui,/function dimensionAuditDownloadHistoryVerificationEmbeddingCanonical\(/);
  assert.match(ui,/dimensionAuditDownloadHistoryVerificationEmbeddingCanonical\(embedded\)/);
  const strict=[...ui.matchAll(/typeof signature!==\"string\"\|\|signature\.length===0/g)];
  assert.equal(strict.length>=2,true);
});
