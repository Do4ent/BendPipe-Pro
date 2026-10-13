import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 762: copy and download enforce canonical history export authorization",()=>{
  const matches=[...ui.matchAll(/const exportAuthorization=dimensionAuditDownloadHistoryExportAuthorization\(exportDecisionSnapshot\)/g)];
  assert.equal(matches.length,2);
  assert.match(ui,/const exportAuthorizationSnapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(exportAuthorization\)/);
  assert.match(ui,/if\(!exportAuthorizationSnapshotValid\|\|!exportAuthorization\.allowed\)/);
});
