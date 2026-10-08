import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 796: copy and download require valid signed export action status",()=>{
  const matches=[...ui.matchAll(/const exportActionStatus=dimensionAuditDownloadHistoryExportActionStatus\(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot\)/g)];
  assert.equal(matches.length,2);
  const validMatches=[...ui.matchAll(/const exportActionStatusValid=dimensionAuditDownloadHistoryExportActionStatusValid\(exportActionStatus,exportPayloadBindingSnapshot,snapshot,exportChainSnapshot\)/g)];
  assert.equal(validMatches.length,2);
  assert.match(ui,/if\(!exportActionStatusValid\|\|!exportActionStatusSignatureValid\|\|!exportActionStatus\.ready\)/);
  assert.match(ui,/INVALID_EXPORT_ACTION_STATUS_SIGNATURE/);
});
