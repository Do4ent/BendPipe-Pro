import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 788: copy and download require valid payload binding snapshot",()=>{
  const matches=[...ui.matchAll(/const exportPayloadBindingSnapshot=dimensionAuditDownloadHistoryExportPayloadBindingSnapshot\(exportPayloadBinding,snapshot,exportChainSnapshot\)/g)];
  assert.equal(matches.length,2);
  const validMatches=[...ui.matchAll(/const exportPayloadBindingSnapshotValid=dimensionAuditDownloadHistoryExportPayloadBindingSnapshotValid\(exportPayloadBindingSnapshot,snapshot,exportChainSnapshot\)/g)];
  assert.equal(validMatches.length,2);
  assert.match(ui,/if\(!exportPayloadBindingSnapshotValid\|\|!exportPayloadBinding\.allowed\)/);
  assert.match(ui,/INVALID_EXPORT_PAYLOAD_BINDING_SNAPSHOT/);
});
