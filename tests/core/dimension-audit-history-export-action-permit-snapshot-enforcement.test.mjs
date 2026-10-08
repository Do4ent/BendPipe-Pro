import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 811: copy and download require valid action permit snapshots",()=>{
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermitSnapshot\(exportActionPermit,"copy"/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportActionPermitSnapshot\(exportActionPermit,"download"/);
  const validMatches=[...ui.matchAll(/const exportActionPermitSnapshotValid=dimensionAuditDownloadHistoryExportActionPermitSnapshotValid\(/g)];
  assert.equal(validMatches.length,2);
  assert.match(ui,/if\(!exportActionPermitSnapshotValid\|\|!exportActionPermit\.ready\)/);
  assert.match(ui,/INVALID_EXPORT_ACTION_PERMIT_SNAPSHOT/);
});
