import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 783: copy and download require valid signed export payload binding",()=>{
  const bindingMatches=[...ui.matchAll(/const exportPayloadBinding=dimensionAuditDownloadHistoryExportPayloadBinding\(snapshot,exportChainSnapshot\)/g)];
  assert.equal(bindingMatches.length,2);
  const validMatches=[...ui.matchAll(/const exportPayloadBindingValid=dimensionAuditDownloadHistoryExportPayloadBindingValid\(exportPayloadBinding,snapshot,exportChainSnapshot\)/g)];
  assert.equal(validMatches.length,2);
  const signatureMatches=[...ui.matchAll(/const exportPayloadBindingSignature=dimensionAuditDownloadHistoryExportPayloadBindingSignature\(exportPayloadBinding\)/g)];
  assert.equal(signatureMatches.length,2);
  assert.match(ui,/if\(!exportPayloadBindingValid\|\|!exportPayloadBindingSignatureValid\|\|!exportPayloadBinding\.allowed\)/);
  assert.match(ui,/INVALID_EXPORT_PAYLOAD_BINDING_SIGNATURE/);
});
