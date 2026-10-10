import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 758: copy and download require a valid history export decision snapshot",()=>{
  const matches=[...ui.matchAll(/const exportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(exportDecision\)/g)];
  assert.equal(matches.length,2);
  assert.match(ui,/const exportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(exportDecision\)/);
  assert.match(ui,/const exportAuthorization=dimensionAuditDownloadHistoryExportAuthorization\(exportDecisionSnapshot\)/);
});
