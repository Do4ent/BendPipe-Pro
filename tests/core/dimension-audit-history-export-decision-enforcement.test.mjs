import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 752: copy and download use canonical history export decision",()=>{
  const decisionMatches=[...ui.matchAll(/const exportDecision=dimensionAuditDownloadHistoryExportDecision\(exportGateSnapshot\)/g)];
  assert.equal(decisionMatches.length,2);
  assert.match(ui,/const exportDecisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot\(exportDecision\)/);
  assert.match(ui,/if\(!exportDecisionSnapshotValid\|\|!exportDecision\.allowed\)/);
});
