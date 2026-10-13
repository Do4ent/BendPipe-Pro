import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 941-943: UI embedded health requires canonical shape and signature type",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryHealthCanonical\(/);
  assert.match(ui,/typeof value\.health_signature==="string"/);
  assert.match(ui,/dimensionAuditDownloadHistoryHealthCanonical\(embedded\)/);
  assert.match(ui,/const currentValid=signatureValid&&currentSignature===signature/);
});
