import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 773: copy and download enforce the canonical export chain signature",()=>{
  const signatureMatches=[...ui.matchAll(/const exportChainSignature=dimensionAuditDownloadHistoryExportChainSignature\(exportChain\)/g)];
  assert.equal(signatureMatches.length,2);
  const signatureValidMatches=[...ui.matchAll(/const exportChainSignatureValid=dimensionAuditDownloadHistoryExportChainSignatureValid\(exportChainSignature,exportChain\)/g)];
  assert.equal(signatureValidMatches.length,2);
  assert.match(ui,/if\(!exportChainValid\|\|!exportChainSignatureValid\|\|!exportChain\.allowed\)/);
  assert.match(ui,/!exportChainSignatureValid\?"INVALID_EXPORT_CHAIN_SIGNATURE":exportChain\.code/);
});
